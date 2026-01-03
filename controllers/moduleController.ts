import { Request, Response, NextFunction } from 'express';
import { ModuleService } from '../services/moduleService';

const moduleService = new ModuleService();

export async function listModules(req: Request, res: Response, next: NextFunction) {
    try {
        const query: any = {};
        if (req.query.program) query['program._id'] = req.query.program;

        const modules = await moduleService.list(query);
        res.json(modules);
    } catch (error) {
        next(error);
    }
}

export async function getModule(req: Request, res: Response, next: NextFunction) {
    try {
        const m = await moduleService.findById(req.params.id);
        if (!m) return res.status(404).json({ message: 'Module not found' });
        res.json(m);
    } catch (error) {
        next(error);
    }
}

export async function createModule(req: Request, res: Response, next: NextFunction) {
    try {
        let { title, program, credits, isActive } = req.body;
        if (!title || !program) return res.status(400).json({ message: 'title and program required' });

        const m = await moduleService.create({ title, program, credits, isActive });
        res.status(201).json(m);
    } catch (error) {
        next(error);
    }
}

export async function deleteModule(req: Request, res: Response, next: NextFunction) {
    try {
        await moduleService.delete(req.params.id);
        res.json({ message: 'deleted' });
    } catch (error) {
        next(error);
    }
}
