import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
    participant: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    enrolledAt: { type: Date, default: Date.now },
    grades: [
        {
            name: String,
            score: Number,
            maxScore: Number,
            date: Date
        }
    ]
}, { timestamps: true });

enrollmentSchema.index({ participant: 1, module: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
export default Enrollment;
