import mongoose from "mongoose";
import { ROLES } from '../config/constants';

const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: [ROLES.ADMIN, ROLES.SUPERADMIN], default: ROLES.ADMIN },
    createdAt: { type: Date, default: Date.now }
});

export const Admin = mongoose.model('Admin', adminSchema);