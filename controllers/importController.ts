import { parse as csvParse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify';
import multer from 'multer';
import { Participant } from '../models/Participant';
import Enrollment from '../models/Enrollment';
import { Module } from '../models/Module';

const upload = multer({ storage: multer.memoryStorage() });

/**
 * Apply mapping and simple transforms.
 * mapping: { csvHeaderName: "firstName" }
 * transforms: { fieldName: ["trim","toLower","number"] }
 */
function applyMappingAndTransforms(row: any, mapping: any = {}, transforms: any = {}) {
    const out: any = {};
    for (const [csvKey, value] of Object.entries(row)) {
        if (mapping && mapping[csvKey]) {
            let field = mapping[csvKey];
            let v: any = value;
            const ops = transforms[field] || [];
            for (const op of ops) {
                if (op === 'trim') v = String(v).trim();
                else if (op === 'toLower') v = String(v).toLowerCase();
                else if (op === 'toUpper') v = String(v).toUpperCase();
                else if (op === 'number') v = Number(v);
                // add more ops as needed
            }
            out[field] = v;
        } else {
            // by default, keep raw under same key
            out[csvKey] = value;
        }
    }
    return out;
}

async function importParticipantsCsv(req, res) {
    // fields in body:
    // mapping: JSON, transforms: JSON, enrollModuleId: optional module id to enroll everyone into
    const { mapping, transforms, enrollModuleId } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'CSV file required as form-data "file"' });

    const records: any[] = [];
    try {
        const rows = csvParse(file.buffer.toString(), { columns: true, trim: false }) as any[];
        for (const row of rows) {
            const mapped = applyMappingAndTransforms(row, mapping ? JSON.parse(mapping) : {}, transforms ? JSON.parse(transforms) : {});
            // Create participant
            const p = new Participant({
                firstName: mapped.firstName || mapped.firstname || mapped.FIRSTNAME,
                lastName: mapped.lastName || mapped.lastname || mapped.LASTNAME,
                email: mapped.email || mapped.Email,
                metadata: mapped.metadata || {}
            });
            await p.save();
            // optionally enroll
            if (enrollModuleId) {
                const mod = await Module.findById(enrollModuleId);
                if (mod) {
                    try {
                        const e = new Enrollment({ participant: p._id, module: mod._id });
                        await e.save();
                    } catch (eErr) {
                        // ignore duplicates
                    }
                }
            }
            records.push({ id: p._id, email: p.email });
        }
        res.json({ imported: records.length, records });
    } catch (err: any) {
        return res.status(400).json({ message: 'CSV parse error', err: err.message });
    }
}

async function exportParticipants(req, res) {
    // supports ?format=csv|json
    const format = (req.query.format || 'json').toLowerCase();
    const participants = await Participant.find().lean();

    if (format === 'json') {
        return res.json(participants);
    } else if (format === 'csv') {
        const columns = Object.keys(participants[0] || {}).filter(k => k !== '__v');
        stringify(participants, { header: true, columns }, (err: any, output: string) => {
            if (err) return res.status(500).json({ message: err.message });
            res.setHeader('Content-Disposition', 'attachment; filename=participants.csv');
            res.setHeader('Content-Type', 'text/csv');
            res.send(output);
        });
    } else {
        return res.status(400).json({ message: 'format must be json or csv' });
    }
}

export { upload, importParticipantsCsv, exportParticipants };
