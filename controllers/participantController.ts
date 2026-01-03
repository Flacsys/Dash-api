import { Request, Response, NextFunction } from 'express';
import { ParticipantService } from '../services/participantService';

const participantService = new ParticipantService();

export async function createParticipant(req: Request, res: Response, next: NextFunction) {
    try {
        const { firstName, lastName, email, division, parish, deanery, metadata } = req.body;
        const fullname = `${firstName} ${lastName}`;
        if (!fullname && !email) {
            return res.status(400).json({ message: 'Provide at least a name or email' });
        }

        const result = await participantService.create({
            fullName: fullname,
            email,
            division,
            parish,
            deanery,
            metadata,
            password: req.body.password
        });
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}

export async function getParticipant(req: Request, res: Response, next: NextFunction) {
    try {
        const p = await participantService.findById(req.params.id);
        if (!p) return res.status(404).json({ message: 'Participant not found' });
        res.json({ participant: p });
    } catch (error) {
        next(error);
    }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
    try {
        const user = (req as any).user;
        if (!user || !user._id) return res.status(401).json({ message: 'Not authenticated' });

        const p = await participantService.findById(user._id);
        if (!p) return res.status(404).json({ message: 'Participant not found' });
        res.json({ participant: p });
    } catch (error) {
        next(error);
    }
}

export async function listParticipants(req: Request, res: Response, next: NextFunction) {
    try {
        const page = Math.max(parseInt(req.query.page as string) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 200);
        const q = (req.query.q as string) || '';
        const status = (req.query.status as string) || '';

        const result = await participantService.list(page, limit, q, status);
        res.json({ page, limit, total: result.total, count: result.items.length, results: result.items });
    } catch (error) {
        next(error);
    }
}

export async function enrollParticipant(req: Request, res: Response, next: NextFunction) {
    try {
        const { participantId } = req.params;
        const { moduleIds } = req.body;
        if (!Array.isArray(moduleIds) || moduleIds.length === 0) {
            return res.status(400).json({ message: 'moduleIds array required' });
        }

        const results = await participantService.enroll(participantId, moduleIds);
        res.json({ results });
    } catch (error) {
        next(error);
    }
}

export async function addParticipantModuleGrade(req: Request, res: Response, next: NextFunction) {
    try {
        const { participantId, moduleId } = req.params;
        const { name, score, maxScore, date } = req.body;

        const result = await participantService.addGrade(participantId, moduleId, { name, score, maxScore, date });
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}

export async function updateParticipantModule(req: Request, res: Response, next: NextFunction) {
    try {
        const { participantId, moduleId } = req.params;
        const { finalScore, status } = req.body;

        const result = await participantService.updateModuleStatus(participantId, moduleId, { finalScore, status });
        res.json(result);
    } catch (error) {
        next(error);
    }
}

export async function enrollParticipantInProgram(req: Request, res: Response, next: NextFunction) {
    try {
        const { participantId } = req.params;
        const { programId } = req.body;

        const result = await participantService.enrollInProgram(participantId, programId);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

export async function deleteParticipant(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        await participantService.delete(id);
        res.json({ message: 'Participant deleted successfully' });
    } catch (error) {
        next(error);
    }
}
