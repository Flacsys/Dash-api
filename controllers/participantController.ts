import { Participant } from '../models/Participant';
import { Module } from '../models/Module';
import { Program } from '../models/Program';
import mongoose from 'mongoose';

export async function createParticipant(req, res) {
    const { firstName, lastName, email, division, parish, deanery, metadata } = req.body;
    const fullname = `${firstName} ${lastName}`;
    if (!fullname && !email) return res.status(400).json({ message: 'Provide at least a name or email' });
    const p = new Participant({
        fullName: fullname,
        email,
        division,
        parish,
        deanery,
        metadata
    });
    await p.save();
    res.status(201).json(p);
}

export async function getParticipant(req, res) {
    const p = await Participant.findById(req.params.id).populate('modules.module._id').lean();
    if (!p) return res.status(404).json({ message: 'Participant not found' });
    res.json({ participant: p });
}

export async function listParticipants(req, res) {
    const page = Math.max(parseInt(req.query.page as any) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as any) || 20, 1), 200);
    const q = (req.query.q as string) || '';
    const status = (req.query.status as string) || '';

    const filter: any = {};
    if (q) {
        const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ firstName: re }, { lastName: re }, { email: re }];
    }
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const query = Participant.find(filter).skip(skip).limit(limit).populate('modules.module._id');

    const [items, total] = await Promise.all([
        query.lean().exec(),
        Participant.countDocuments(filter).exec()
    ]);

    res.json({ page, limit, total, count: items.length, results: items });
}

export async function enrollParticipant(req, res) {
    const { participantId } = req.params;
    const { moduleIds } = req.body;
    if (!Array.isArray(moduleIds) || moduleIds.length === 0) return res.status(400).json({ message: 'moduleIds array required' });

    const participant = await Participant.findById(participantId);
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    const modules = await Module.find({ _id: { $in: moduleIds } });
    if (modules.length !== moduleIds.length) return res.status(400).json({ message: 'One or more modules not found' });

    const results = [];
    const programsToUpdate = new Set();

    for (const m of modules) {
        // Check if already enrolled in module
        const existing = participant.modules.find(mod => mod.module._id.toString() === m._id.toString());
        if (existing) {
            results.push({ module: m._id, status: 'skipped', reason: 'already enrolled' });
        } else {
            participant.modules.push({
                module: { _id: m._id, title: m.title }
            });
            results.push({ module: m._id, status: 'enrolled' });
        }

        // Auto-enroll in program
        if (m.program && m.program._id) {
            const programId = m.program._id.toString();
            programsToUpdate.add(programId);

            const programExists = participant.enrolledPrograms.find(p => p._id.toString() === programId);
            if (!programExists) {
                participant.enrolledPrograms.push({
                    _id: m.program._id,
                    title: m.program.title
                });
            }
        }
    }

    await participant.save();

    // Update Program documents to include this participant
    if (programsToUpdate.size > 0) {
        await Program.updateMany(
            { _id: { $in: Array.from(programsToUpdate) } },
            { $addToSet: { participants: participant._id } }
        );
    }

    res.json({ results });
}

export async function addParticipantModuleGrade(req, res) {
    const { participantId, moduleId } = req.params;
    const { name, score, maxScore, date } = req.body;

    const participant = await Participant.findById(participantId);
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    const moduleRecord = participant.modules.id(moduleId);
    if (!moduleRecord) return res.status(404).json({ message: 'Module record not found' });

    moduleRecord.grades.push({ name, score, maxScore, date: date ? new Date(date) : new Date() });
    await participant.save();
    res.status(201).json(moduleRecord);
}

export async function updateParticipantModule(req, res) {
    const { participantId, moduleId } = req.params;
    const { finalScore, status } = req.body;

    const participant = await Participant.findById(participantId);
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    const moduleRecord = participant.modules.id(moduleId);
    if (!moduleRecord) return res.status(404).json({ message: 'Module record not found' });

    if (finalScore !== undefined) moduleRecord.finalScore = finalScore;
    if (status !== undefined) moduleRecord.status = status;

    await participant.save();
    res.json(moduleRecord);
}

export async function enrollParticipantInProgram(req, res) {
    const { participantId } = req.params;
    const { programId } = req.body;

    const participant = await Participant.findById(participantId);
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    const program = await Program.findById(programId);
    if (!program) return res.status(404).json({ message: 'Program not found' });

    const alreadyEnrolled = participant.enrolledPrograms.find(p => p._id.toString() === programId);
    if (!alreadyEnrolled) {
        participant.enrolledPrograms.push({ _id: program._id, title: program.title });
    }

    await Program.findByIdAndUpdate(programId, { $addToSet: { participants: participant._id } });

    const results = [];
    if (program.modules && program.modules.length > 0) {
        for (const mod of program.modules) {
            const existing = participant.modules.find(m => m.module._id.toString() === mod._id.toString());
            if (!existing) {
                participant.modules.push({
                    module: { _id: mod._id, title: mod.title }
                });
                results.push({ module: mod._id, status: 'enrolled' });
            } else {
                results.push({ module: mod._id, status: 'skipped', reason: 'already enrolled' });
            }
        }
    }

    await participant.save();
    res.json({ message: 'Enrolled in program and modules', results });
}

export async function deleteParticipant(req, res) {
    const { id } = req.params;
    console.log(`Attempting to delete participant with ID: ${id}`);

    const participant = await Participant.findById(id);
    if (!participant) {
        console.log(`Participant with ID ${id} not found`);
        return res.status(404).json({ message: 'Participant not found' });
    }

    // Remove participant from programs
    if (participant.enrolledPrograms && participant.enrolledPrograms.length > 0) {
        const programIds = participant.enrolledPrograms.map(p => p._id);
        await Program.updateMany(
            { _id: { $in: programIds } },
            { $pull: { participants: participant._id } }
        );
    }

    await Participant.findByIdAndDelete(id);
    res.json({ message: 'Participant deleted successfully' });
}
