import * as jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { Admin } from '../models/Admin';
import { Participant } from '../models/Participant';

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];

        if (!token) return res.status(401).json({ message: 'No token provided' });

        const payload = jwt.verify(token, JWT_SECRET) as { sub?: string;[key: string]: any };

        if (!payload?.sub) return res.status(401).json({ message: 'Invalid token' });

        if (payload.role === 'participant') {
            const participant = await Participant.findById(payload.sub).select('-passwordHash');
            if (participant) {
                (req as any).participant = participant;
                next();
                return;
            }
        } else {
            const admin = await Admin.findById(payload.sub).select('-passwordHash');
            if (admin) {
                (req as any).admin = admin;
                (req as any).user = admin; // Deprecate: keep for backward compatibility till full refactor
                next();
                return;
            }
        }

        return res.status(401).json({ message: 'Invalid token or user not found' });

    } catch (err) {
        console.error('authenticateToken failed for token:', req.headers.authorization, 'err:', err);
        res.status(401).json({ message: 'Invalid token' });
    }
}
