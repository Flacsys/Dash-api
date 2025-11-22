import { Participant } from '../models/Participant';
import Enrollment from '../models/Enrollment';
import { Module } from '../models/Module';


export async function createParticipant(req, res) {
    const { firstName, lastName, email, metadata } = req.body;
    if (!firstName && !lastName && !email) return res.status(400).json({ message: 'Provide at least a name or email' });
    const p = new Participant({ firstName, lastName, email, metadata });
    await p.save();
    res.status(201).json(p);
}

export async function getParticipant(req, res) {
    const p = await Participant.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ message: 'Participant not found' });
    // include enrollments with module info
    const enrollments = await Enrollment.find({ participant: p._id }).populate('module').lean();
    res.json({ participant: p, enrollments });
}

// New: listParticipants
export async function listParticipants(req, res) {
    // query params: page, limit, q (search by name or email), status, includeEnrollments(true|1)
    const page = Math.max(parseInt(req.query.page as any) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as any) || 20, 1), 200);
    const q = (req.query.q as string) || '';
    const status = (req.query.status as string) || '';
    const includeEnrollments = ['1', 'true', 'yes'].includes(((req.query.includeEnrollments as string) || '').toLowerCase());

    const filter: any = {};
    if (q) {
        // search firstName, lastName, email (case-insensitive)
        const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [ { firstName: re }, { lastName: re }, { email: re } ];
    }
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        Participant.find(filter).skip(skip).limit(limit).lean().exec(),
        Participant.countDocuments(filter).exec()
    ]);

    let enrollmentsMap: Record<string, any[]> = {};
    if (includeEnrollments && items.length > 0) {
        const ids = items.map(i => i._id);
        const enrollments = await Enrollment.find({ participant: { $in: ids } }).populate('module').lean().exec();
        enrollmentsMap = enrollments.reduce((acc, e) => {
            const pid = String(e.participant);
            acc[pid] = acc[pid] || [];
            acc[pid].push(e);
            return acc;
        }, {} as Record<string, any[]>);
    }

    const results = items.map(p => ({ participant: p, enrollments: enrollmentsMap[String(p._id)] || [] }));

    res.json({ page, limit, total, count: items.length, results });
}

export async function enrollParticipant(req, res) {
    const { participantId } = req.params;
    const { moduleIds } = req.body; // accept array of module IDs
    if (!Array.isArray(moduleIds) || moduleIds.length === 0) return res.status(400).json({ message: 'moduleIds array required' });

    const participant = await Participant.findById(participantId);
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    // ensure modules exist
    const modules = await Module.find({ _id: { $in: moduleIds } });
    if (modules.length !== moduleIds.length) return res.status(400).json({ message: 'One or more modules not found' });

    const results = [];
    for (const m of modules) {
        try {
            const enrollment = new Enrollment({ participant: participant._id, module: m._id });
            await enrollment.save();
            results.push({ module: m._id, status: 'enrolled' });
        } catch (err) {
            // duplicate key (already enrolled)
            results.push({ module: m._id, status: 'skipped', reason: err.code === 11000 ? 'already enrolled' : err.message });
        }
    }

    res.json({ results });
}

export async function addGrade(req, res) {
    // POST /participants/:participantId/enrollments/:enrollmentId/grades
    const { participantId, enrollmentId } = req.params;
    const { name, score, maxScore, date } = req.body;
    const enrollment = await Enrollment.findOne({ _id: enrollmentId, participant: participantId });
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    enrollment.grades.push({ name, score, maxScore, date: date ? new Date(date) : new Date() });
    await enrollment.save();
    res.status(201).json(enrollment);
}
