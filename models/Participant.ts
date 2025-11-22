import mongoose from "mongoose";

const participantSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: String,
    division: String,
    parish: String,
    deanery: String,
    modules:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
    enrolledPrograms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Program' }],
    status: { type: String, enum: ['active', 'inactive', 'graduated'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    createdAt: { type: Date, default: Date.now }
});

export const Participant = mongoose.model('Participant', participantSchema);