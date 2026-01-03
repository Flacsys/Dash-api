import { Request, Response, NextFunction } from 'express';
import { ProgramService } from '../services/programService';

const programService = new ProgramService();

export async function listPrograms(req: Request, res: Response, next: NextFunction) {
    try {
        const programs = await programService.list();
        res.json(programs);
    } catch (error) {
        next(error);
    }
}

export async function getProgram(req: Request, res: Response, next: NextFunction) {
    try {
        const p = await programService.findById(req.params.id);
        if (!p) return res.status(404).json({ message: 'Program not found' });
        res.json(p);
    } catch (error) {
        next(error);
    }
}

export async function createProgram(req: Request, res: Response, next: NextFunction) {
    try {
        const { title, semester, duration } = req.body;
        if (!title) return res.status(400).json({ message: 'title required' });
        if (!semester) return res.status(400).json({ message: 'semester required' });
        if (!duration) return res.status(400).json({ message: 'duration required' });

        const p = await programService.create({ title, semester, duration });
        res.status(201).json(p);
    } catch (error) {
        next(error);
    }
}

export async function deleteProgram(req: Request, res: Response, next: NextFunction) {
    try {
        await programService.delete(req.params.id);
        res.json({ message: 'deleted' });
    } catch (error) {
        next(error);
    }
}
