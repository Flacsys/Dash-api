// typescript
import * as jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { Admin } from '../models/Admin';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token provided' });

        // Verify token and extract payload
        const payload = jwt.verify(token, JWT_SECRET) as { sub?: string; [key: string]: any };
        if (!payload?.sub) return res.status(401).json({ message: 'Invalid token' });

        const user = await Admin.findById(payload.sub).select('-passwordHash');
        if (!user) return res.status(401).json({ message: 'Invalid token' });
// attach user to request (cast to any to avoid TS complaint)
        (req as any).user = user;
        next();
    } catch (err) {
        console.error('authenticateToken failed for token:', req.headers.authorization, 'err:', err);
        res.status(401).json({ message: 'Invalid token' });
    }
}
