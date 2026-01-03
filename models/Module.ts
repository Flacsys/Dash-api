import mongoose from "mongoose";

export interface IModule extends mongoose.Document {
    title: string;
    code?: string;
    description?: string;
    program: {
        _id: mongoose.Types.ObjectId;
        title: string;
    };
    credits: number;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
}

const moduleSchema = new mongoose.Schema<IModule>({
    title: { type: String, required: true },
    code: { type: String },
    description: String,
    program: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
        title: { type: String, required: true }
    },
    credits: { type: Number, required: true, default: 3 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    createdAt: { type: Date, default: Date.now }
});

export const Module = mongoose.model<IModule>('Module', moduleSchema);

