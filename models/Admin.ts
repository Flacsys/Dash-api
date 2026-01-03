import mongoose from "mongoose";
import { ROLES } from '../config/constants';

export interface IAdmin extends mongoose.Document {
    email: string;
    passwordHash: string;
    name: string;
    role: string;
    createdAt: Date;
}

const adminSchema = new mongoose.Schema<IAdmin>({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: [ROLES.ADMIN, ROLES.SUPERADMIN], default: ROLES.ADMIN },
    createdAt: { type: Date, default: Date.now }
});

export const Admin = mongoose.model<IAdmin>('Admin', adminSchema);