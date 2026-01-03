
import { parse as csvParse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify';
import mongoose, { Model } from 'mongoose';
import { Participant } from '../models/Participant';
import { Module } from '../models/Module';
import { Program } from '../models/Program';
import logger from '../utils/logger';
import { findBestMatch } from '../utils/fuzzyMatch';

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as XLSX from 'xlsx';
import { FileMetadata } from '../models/FileMetadata';

export class ImportService {

    /**
     * Optional: Extraction using Gemini if API Key is present.
     * This acts as a powerful falback or alternative to regex/fuzzy mapping.
     */
    async extractWithAI(textOrCsv: string, targetSchema: string[]): Promise<any[]> {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            logger.warn("Gemini extraction requested but GOOGLE_API_KEY is not set. Falling back to manual.");
            return []; // Signal caller to use manual logic
        }

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `
                I have the following raw data (CSV or text). 
                Please extract it into a JSON array of objects with the following keys: ${targetSchema.join(', ')}.
                Only return the valid JSON array, no markdown.

                Data:
                ${textOrCsv.slice(0, 30000)} // truncate to avoid token limits
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(text);
        } catch (error: any) {
            logger.error(`Gemini extraction failed: ${error.message}`);
            return [];
        }
    }
    private getModel(modelName: string): Model<any> | null {
        switch (modelName.toLowerCase()) {
            case 'participant': return Participant;
            case 'module': return Module;
            case 'program': return Program;
            default: return null;
        }
    }

    /**
     * Map CSV row keys to Schema keys using fuzzy matching.
     */
    private mapRowToSchema(row: any, schemaPaths: string[], mapping: Record<string, string> = {}) {
        const out: any = {};
        const rowKeys = Object.keys(row);

        for (const schemaKey of schemaPaths) {
            // 1. Explicit Mapping
            // Check if any CSV key matches a mapping to this schemaKey
            // e.g. mapping: { "First Name": "firstName" } -> we look for "First Name" in row
            const explicitCsvKey = Object.keys(mapping).find(k => mapping[k] === schemaKey);
            if (explicitCsvKey && row[explicitCsvKey] !== undefined) {
                out[schemaKey] = row[explicitCsvKey];
                continue;
            }

            // 2. Exact Match
            if (row[schemaKey] !== undefined) {
                out[schemaKey] = row[schemaKey];
                continue;
            }

            // 3. Fuzzy Match
            // Find which CSV header best matches this schema key
            // e.g. schemaKey = "firstName", csvHeader = "First Name"
            const bestMatch = findBestMatch(schemaKey, rowKeys);
            if (bestMatch && row[bestMatch] !== undefined) {
                out[schemaKey] = row[bestMatch];
            }
        }

        // Preserve metadata/extras not mapped? 
        // For simplicity, we only map matched fields. 
        // If "metadata" field exists in schema, we could put leftovers there.
        return out;
    }

    private parseFile(buffer: Buffer, mimetype: string): any[] {
        // Excel / ODF
        if (mimetype.includes('spreadsheet') || mimetype.includes('excel') || mimetype.includes('officedocument') || mimetype === 'application/vnd.oasis.opendocument.spreadsheet') {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            return XLSX.utils.sheet_to_json(sheet);
        }

        // Default to CSV
        return csvParse(buffer.toString(), { columns: true, trim: true, skip_empty_lines: true });
    }

    /**
     * Preview Mode: Parses file, maps columns, returns preview data + metadata about parse.
     * DOES NOT SAVE to DB.
     */
    async previewImportGeneric(modelName: string, fileBuffer: Buffer, mimetype: string, mappingStr?: string) {
        const model = this.getModel(modelName);
        if (!model) throw { statusCode: 400, message: `Unknown model: ${modelName}` };

        const mapping = mappingStr ? JSON.parse(mappingStr) : {};
        const schemaPaths = Object.keys(model.schema.paths).filter(p => !['_id', '__v', 'createdAt', 'createdBy'].includes(p));

        try {
            const rows = this.parseFile(fileBuffer, mimetype);
            const previewData: any[] = [];

            for (const row of rows) {
                const mapped = this.mapRowToSchema(row, schemaPaths, mapping);
                previewData.push(mapped);
            }

            return {
                model: modelName,
                totalRows: previewData.length,
                preview: previewData.slice(0, 100), // Return only first 100 for robust preview
                fullData: previewData // NOTE: In prod, might want to cache this or return ID. sending back full data for user to "confirm" is okay for small files.
            };
        } catch (err: any) {
            logger.error(`Preview failed: ${err.message}`);
            throw { statusCode: 400, message: 'Parse error', err: err.message };
        }
    }

    /**
     * Confirm Mode: Receives validated JSON data from frontend, saves to DB, and logs FileMetadata.
     */
    async confirmImportGeneric(modelName: string, data: any[], fileInfo?: { originalName: string, size: number, type: string, uploadedBy?: string }) {
        const model = this.getModel(modelName);
        if (!model) throw { statusCode: 400, message: `Unknown model: ${modelName}` };

        if (!Array.isArray(data) || data.length === 0) throw { statusCode: 400, message: "No data to import" };

        const savedRecords: any[] = [];
        const errors: any[] = [];

        for (const item of data) {
            try {
                // Determine unique key based on model for existing check? 
                // For simplified generic, we just try to save. 
                const doc = new model(item);
                await doc.save();
                savedRecords.push({ _id: doc._id, ...item });
            } catch (err: any) {
                // Handle duplicate key error gracefully
                if (err.code === 11000) {
                    errors.push({ item, error: "Duplicate entry" });
                } else {
                    errors.push({ item, error: err.message });
                }
            }
        }

        // Log Metadata
        if (fileInfo) {
            try {
                await FileMetadata.create({
                    originalName: fileInfo.originalName,
                    fileType: fileInfo.type,
                    size: fileInfo.size,
                    targetModel: modelName,
                    recordCount: savedRecords.length,
                    status: errors.length > 0 && savedRecords.length === 0 ? 'failed' : 'confirmed',
                    errors: errors.length > 0 ? errors.map(e => JSON.stringify(e)) : [],
                    uploadedBy: fileInfo.uploadedBy
                });
            } catch (metaErr) {
                logger.error("Failed to save FileMetadata", metaErr);
            }
        }

        logger.info(`Confirmed Import: ${savedRecords.length} ${modelName}s saved.`);
        return { success: true, imported: savedRecords.length, errors };
    }

    async importCsvGeneric(
        modelName: string,
        fileBuffer: Buffer,
        mappingStr?: string
    ) {
        // Direct Import (Scan & Save) implemented via preview+confirm reuse
        const preview = await this.previewImportGeneric(modelName, fileBuffer, 'text/csv', mappingStr);
        return await this.confirmImportGeneric(modelName, preview.fullData, {
            originalName: 'Direct Import',
            size: fileBuffer.length,
            type: 'csv'
        });
    }

    // Keep legacy specific method for backward compatibility if needed, 
    // or refactor controller to use generic one. 
    // For this refactor, let's keep it but wrap generic logic if possible, 
    // BUT legacy has specific enroll logic.
    async importParticipantsCsv(fileBuffer: Buffer, mappingStr: string | undefined, transformsStr: string | undefined, enrollModuleId?: string) {
        // We will adapt this to use the new logic PARTIALLY, or keep it distinct since it has "enroll" logic which is specific.
        // The user wants "generic" import. I will direct generic requests to `importCsvGeneric`.
        // This specific method can remain as a "specialized" import for participants with enrollment.

        // ... (Existing logic mostly kept, but maybe using mapRowToSchema helper?)
        // To save tokens and risk, I will leave this specific method mostly as is but fix the lint/logging if needed,
        // OR better: use the new generic helper for fuzzy matching inside it!

        const records: any[] = [];
        const mapping = mappingStr ? JSON.parse(mappingStr) : {};

        try {
            const rows = csvParse(fileBuffer.toString(), { columns: true, trim: true });

            // Re-using generic schema mapper for better matching
            const schemaPaths = ['firstName', 'lastName', 'email', 'division', 'parish', 'deanery'];

            for (const row of rows) {
                // Use fuzzy matching helper
                const mapped = this.mapRowToSchema(row, schemaPaths, mapping);

                // Fallbacks/Legacy overrides
                const pData = {
                    firstName: mapped.firstName,
                    lastName: mapped.lastName,
                    email: mapped.email,
                    division: mapped.division,
                    parish: mapped.parish,
                    deanery: mapped.deanery,
                    metadata: mapped.metadata || {}
                };

                const p = new Participant(pData);

                if (enrollModuleId && mongoose.Types.ObjectId.isValid(enrollModuleId)) {
                    p.modules.push({ module: new mongoose.Types.ObjectId(enrollModuleId) } as any);
                }

                await p.save();
                records.push({ id: p._id, email: p.email });
            }
            logger.info(`Imported ${records.length} participants from CSV (specialized).`);
            return { imported: records.length, records };
        } catch (err: any) {
            logger.error(`CSV Import failed: ${err.message}`);
            throw { statusCode: 400, message: 'CSV parse error', err: err.message };
        }
    }


    async getParticipantsForExport() {
        return await Participant.find().lean();
    }

    async exportToCsv(data: any[]): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!data || data.length === 0) return resolve('');
            const columns = Object.keys(data[0]).filter(k => k !== '__v' && k !== '_id');
            stringify(data, { header: true, columns }, (err: any, output: string) => {
                if (err) {
                    logger.error(`CSV Export failed: ${err.message}`);
                    reject(err);
                } else {
                    logger.info(`Exported ${data.length} records to CSV.`);
                    resolve(output);
                }
            });
        });
    }
}
