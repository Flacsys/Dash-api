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

export async function loginStudent(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, regNo, password } = req.body;
        if ((!email || !regNo) && !password) {
            return res.status(400).json({ message: 'email/regNo and password required' });
        }

        const result = await authService.loginStudent(email, regNo, password);
        res.json(result);
    } catch (error) {
        next(error);
    }
}
