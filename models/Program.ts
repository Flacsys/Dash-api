import mongoose from "mongoose";

const programSchema = new mongoose.Schema({
    title: { type: String, required: true },
    code: { type: String },
    description: String,
    isActive: { type: Boolean, default: false },
    modules: [{
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
        title: String
    }],
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Participant' }],
    credits: { type: Number, default: 3 },
    semester: Number,
    totalCredits: { type: Number, default: 0 },
    duration: { type: Number, default: 3 },
    particpantsEnrolled: Number,
    startDate: Date,
    endDate: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    createdAt: { type: Date, default: Date.now }
});

export const Program = mongoose.model('Program', programSchema);
