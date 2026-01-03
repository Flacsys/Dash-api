import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ImportService } from '../services/importService';

const upload = multer({ storage: multer.memoryStorage() });
const importService = new ImportService();

async function importParticipantsCsv(req: Request, res: Response, next: NextFunction) {
    try {
        const { mapping, transforms, enrollModuleId } = req.body;
        const file = (req as any).file;
        if (!file) return res.status(400).json({ message: 'CSV file required as form-data "file"' });

        const result = await importService.importParticipantsCsv(
            file.buffer,
            mapping,
            transforms,
            enrollModuleId
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
}

async function exportParticipants(req: Request, res: Response, next: NextFunction) {
    try {
        const format = (req.query.format as string || 'json').toLowerCase();
        const participants = await importService.getParticipantsForExport();

        if (format === 'json') {
            return res.json(participants);
        } else if (format === 'csv') {
            const csvOutput = await importService.exportToCsv(participants);
            res.setHeader('Content-Disposition', 'attachment; filename=participants.csv');
            res.setHeader('Content-Type', 'text/csv');
            res.send(csvOutput);
        } else {
            return res.status(400).json({ message: 'format must be json or csv' });
        }
    } catch (error) {
        next(error);
    }
}

async function importGeneric(req: Request, res: Response, next: NextFunction) {
    try {
        const { model } = req.params;
        const { mapping } = req.body; // JSON string
        const file = (req as any).file;
        if (!file) return res.status(400).json({ message: 'File required' });

        const result = await importService.importCsvGeneric(model, file.buffer, mapping);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

async function previewImport(req: Request, res: Response, next: NextFunction) {
    try {
        const { model } = req.params;
        const { mapping } = req.body;
        const file = (req as any).file;
        if (!file) return res.status(400).json({ message: 'File required' });

        const result = await importService.previewImportGeneric(model, file.buffer, file.mimetype, mapping);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

async function confirmImport(req: Request, res: Response, next: NextFunction) {
    try {
        const { model } = req.params;
        const { data, originalName, size, type } = req.body;
        // data array is the approved JSON from preview

        const uploadedBy = (req as any).user ? (req as any).user.userId : undefined; // Assuming auth middleware populates user

        const result = await importService.confirmImportGeneric(model, data, {
            originalName,
            size,
            type,
            uploadedBy
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
}

async function extractData(req: Request, res: Response, next: NextFunction) {
    try {
        const { text, schema } = req.body;
        if (!text || !schema) return res.status(400).json({ message: 'Text and target schema (array of strings) required' });

        const result = await importService.extractWithAI(text, schema);
        res.json({ extracted: result });
    } catch (error) {
        next(error);
    }
}

export { upload, importParticipantsCsv, exportParticipants, importGeneric, previewImport, confirmImport, extractData };
