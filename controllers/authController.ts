import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';

const authService = new AuthService();

export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const { nameId, password } = req.body;
        if (!nameId || !password) {
            return res.status(400).json({ message: 'email or nameId and password required' });
        }

        const result = await authService.login(nameId, password);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

export async function loginParticipant(req: Request, res: Response, next: NextFunction) {
    try {
        const { participantId, password } = req.body;
        if ((!participantId) && !password) {
            return res.status(400).json({ message: 'participantId and password required' });
        }

        const result = await authService.loginParticipant(participantId, password);
        res.json(result);
    } catch (error) {
        next(error);
    }
}
