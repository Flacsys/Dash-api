import { Module } from '../models/Module';
import { Program } from '../models/Program';
import mongoose from 'mongoose';

export async function listModules(req, res) {
    const query: any = {};
    if ((req.query as any).program) query['program._id'] = (req.query as any).program;
    const modules = await Module.find(query).lean();
    res.json(modules);
}

export async function getModule(req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
    }
    const m = await Module.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Module not found' });
    res.json(m);
}

export async function createModule(req, res) {
    let { title, program, credits, isActive } = req.body;
    if (!title || !program) return res.status(400).json({ message: 'title and program required' });

    let programId = program;
    let programTitle = '';

    if (mongoose.Types.ObjectId.isValid(program)) {
        const programDoc = await Program.findById(program);
        if (!programDoc) {
            return res.status(400).json({ message: `Program not found: ${program}` });
        }
        programId = programDoc._id;
        programTitle = programDoc.title;
    } else {
        const programDoc = await Program.findOne({ title: program });
        if (!programDoc) {
            return res.status(400).json({ message: `Program not found: ${program}` });
        }
        programId = programDoc._id;
        programTitle = programDoc.title;
    }

    const code = generateModuleCode(title);

    try {
        const m = new Module({
            title,
            program: { _id: programId, title: programTitle },
            credits,
            isActive,
            code
        });
        await m.save();

        // Update the program to include this module
        await Program.findByIdAndUpdate(programId, {
            $push: { modules: { _id: m._id, title: m.title } }
        });

        res.status(201).json(m);
    } catch (error: any) {
        if (error.code === 11000) {
            // Handle duplicate code by appending a random suffix
            const suffix = Math.floor(Math.random() * 1000);
            const m = new Module({
                title,
                program: { _id: programId, title: programTitle },
                credits,
                isActive,
                code: `${code}-${suffix}`
            });
            await m.save();

            // Update the program to include this module
            await Program.findByIdAndUpdate(programId, {
                $push: { modules: { _id: m._id, title: m.title } }
            });

            return res.status(201).json(m);
        }
        throw error;
    }
}

export async function deleteModule(req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
    }
    const m = await Module.findByIdAndDelete(req.params.id);
    if (!m) return res.status(404).json({ message: 'Module not found' });

    // Remove from program
    if (m.program && m.program._id) {
        await Program.findByIdAndUpdate(m.program._id, {
            $pull: { modules: { _id: m._id } }
        });
    }

    res.json({ message: 'deleted' });
}

function generateModuleCode(title: string): string {
    const words = title.split(' ').filter(w => w.length > 0);
    const acronym = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');

    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const year = now.getFullYear().toString().slice(-2);

    return `${acronym}${quarter}${year}`;
}