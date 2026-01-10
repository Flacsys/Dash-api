import mongoose from "mongoose";

export interface IGrade {
    name: string;
    score: number;
    maxScore?: number;
    date?: Date;
}

export interface IParticipantModule extends mongoose.Document {
    module: {
        _id: mongoose.Types.ObjectId;
        title: string;
    };
    enrolledAt: Date;
    grades: IGrade[];
    finalScore?: number;
    gradePoint?: number;
    gradeLetter?: string;
    status: 'Registered' | 'In Progress' | 'Completed' | 'dropped' | 'enrolled';
}

export interface IParticipant extends mongoose.Document {
    fullName: string;
    email: string;
    phone?: string;
    regNo?: string;
    division?: string;
    parish?: string;
    deanery?: string;
    modules: mongoose.Types.DocumentArray<IParticipantModule>;
    enrolledPrograms: Array<{
        _id: mongoose.Types.ObjectId;
        title: string;
    }>;
    status: 'active' | 'inactive' | 'graduated';
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    metadata?: Record<string, any>;
    passwordHash?: string;
    isDefaultPassword?: boolean;
}

const participantSchema = new mongoose.Schema<IParticipant>({
    fullName: { type: String },
    email: { type: String, required: true, unique: true },
    phone: String,
    regNo: { type: String, unique: true },
    division: String,
    parish: String,
    deanery: String,
    modules: {
        type: [{
            module: {
                _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
                title: { type: String, required: true }
            },
            enrolledAt: { type: Date, default: Date.now },
            grades: [{
                name: String,
                score: Number,
                maxScore: Number,
                date: Date
            }],
            finalScore: Number,
            gradePoint: Number,
            gradeLetter: String,
            status: { type: String, enum: ['Registered', 'In Progress', 'Completed', 'dropped', 'enrolled'], default: 'enrolled' }
        }],
        default: []
    },
    enrolledPrograms: [{
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
        title: { type: String, required: true }
    }],
    status: { type: String, enum: ['active', 'inactive', 'graduated'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    createdAt: { type: Date, default: Date.now },
    passwordHash: { type: String, select: false },
    isDefaultPassword: { type: Boolean, default: true }
});

const getAcronym = (str: string) => {
    if (!str) return '';
    const words = str.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
    return words.map(w => w[0]).join('').toUpperCase();
};

participantSchema.pre('save', async function (next) {
    if (!this.regNo && this.division && this.parish && this.deanery) {
        const div = getAcronym(this.division);
        const par = getAcronym(this.parish);
        const dea = getAcronym(this.deanery);
        const prefix = `${div}/${par}/${dea}/`;

        let uniqueCode = '';
        let isUnique = false;

        while (!isUnique) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            uniqueCode = '';
            for (let i = 0; i < 5; i++) {
                uniqueCode += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            const existing = await (this.constructor as any).findOne({
                regNo: `${prefix}${uniqueCode}`
            });

            if (!existing) {
                isUnique = true;
            }
        }

        this.regNo = `${prefix}${uniqueCode}`;
    }

    if (this.modules && this.modules.length > 0) {
        this.modules.forEach(m => {
            if (m.grades && m.grades.length > 0) {
                m.finalScore = m.grades.reduce((sum, g) => sum + (g.score || 0), 0);
            }

            if (m.finalScore != null) {
                const score = m.finalScore;
                if (score >= 80) {
                    m.gradeLetter = 'A';
                    m.gradePoint = 4.0;
                } else if (score >= 70) {
                    m.gradeLetter = 'B';
                    m.gradePoint = 3.0;
                } else if (score >= 60) {
                    m.gradeLetter = 'C';
                    m.gradePoint = 2.0;
                } else if (score >= 50) {
                    m.gradeLetter = 'D';
                    m.gradePoint = 1.0;
                } else {
                    m.gradeLetter = 'F';
                    m.gradePoint = 0.0;
                }
            }
        });
    }
    next();
});

export const Participant = mongoose.model<IParticipant>('Participant', participantSchema);