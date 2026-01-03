
import { Admin, IAdmin } from '../models/Admin';
import { Participant, IParticipant } from '../models/Participant';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

if (!JWT_SECRET) {
    logger.error("JWT_SECRET is not defined in environment variables");
}

function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class AuthService {
    async login(nameId: string, password: string): Promise<{ token: string, admin: Partial<IAdmin> }> {
        let admin: IAdmin | null = null;
        if (nameId) {
            const escaped = escapeRegex(nameId);
            const re = new RegExp(`^${escaped}$`, 'i');
            admin = await Admin.findOne({ name: re }).exec();
        }

        if (!admin) {
            logger.warn(`Login failed: Admin not found for ${nameId}`);
            throw { statusCode: 401, message: 'Invalid credentials' };
        }

        const hash = admin.passwordHash;
        if (!hash) {
            logger.error(`Login failed: No password hash for admin ${admin._id}`);
            throw { statusCode: 401, message: 'Invalid credentials' };
        }

        const ok = await bcrypt.compare(password, hash);
        if (!ok) {
            logger.warn(`Login failed: Invalid password for ${nameId}`);
            throw { statusCode: 401, message: 'Invalid credentials' };
        }

        const token = jwt.sign(
            { sub: admin._id, role: admin.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
        );

        logger.info(`Admin logged in: ${admin.name} (${admin._id})`);

        return {
            token,
            admin: {
                _id: admin._id,
                email: admin.email,
                role: admin.role,
                name: admin.name
            }
        };
    }

    async loginStudent(email: string, regNo: string, password?: string): Promise<{ token: string, student: Partial<IParticipant> }> {
        // Find by email OR regNo
        const query: any = {};
        if (email) query.email = email;
        else if (regNo) query.regNo = regNo;

        if (Object.keys(query).length === 0) {
            throw { statusCode: 400, message: 'Provide email or regNo' };
        }

        const student = await Participant.findOne(query).select('+passwordHash +status').exec();
        if (!student) {
            throw { statusCode: 401, message: 'Invalid credentials' };
        }

        if (!student.passwordHash) {
            throw { statusCode: 401, message: 'Account not set up for login. Contact admin.' };
        }

        if (password) {
            const ok = await bcrypt.compare(password, student.passwordHash);
            if (!ok) throw { statusCode: 401, message: 'Invalid credentials' };
        }

        const token = jwt.sign(
            { sub: student._id, role: 'student', status: student.status },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
        );

        return {
            token,
            student: {
                _id: student._id,
                fullName: student.fullName,
                email: student.email,
                regNo: student.regNo,
                status: student.status
            }
        };
    }
}
