import { Admin } from '../models/Admin';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = (process as any).env?.JWT_SECRET || 'dev_secret';
const JWT_EXPIRES_IN = (process as any).env?.JWT_EXPIRES_IN || '7d';

function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


export async function login(req, res) {
    const { email, name, password } = req.body;
    if ((!email || !name) || !password) return res.status(400).json({ message: 'email or name and password required' });

    let admin;
    if (email) {
        admin = await Admin.findOne({ email: (email as string).toLowerCase() }).exec();
    } else if (name) {
        // case-insensitive exact match on name
        const escaped = escapeRegex(name as string);
        const re = new RegExp(`^${escaped}$`, 'i');
        admin = await Admin.findOne({ name: re }).exec();
    }
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    // model stores the hash as `passwordHash`
    const hash = (admin as any).passwordHash || (admin as any).password;
    if (!hash) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ sub: (admin as any)._id, role: (admin as any).role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ token, admin: { id: (admin as any)._id, email: (admin as any).email, role: (admin as any).role, name: (admin as any).name } });
}
