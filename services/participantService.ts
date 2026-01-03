
import { Participant, IParticipant, IParticipantModule } from '../models/Participant';
import { Module, IModule } from '../models/Module';
import { Program } from '../models/Program';
import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import logger from '../utils/logger';

export class ParticipantService {

    async create(data: Partial<IParticipant> & { password?: string }) {
        if (data.password) {
            const salt = await bcrypt.genSalt(10);
            data.passwordHash = await bcrypt.hash(data.password, salt);
            delete data.password;
        }

        const participant = new Participant(data);
        const saved = await participant.save();
        logger.info(`Participant created: ${(saved as any).firstName} ${(saved as any).lastName} (${saved._id})`);
        return saved;
    }

    async findById(id: string) {
        return await Participant.findById(id).populate('modules.module._id').lean();
    }

    async enrollInProgram(participantId: string, programId: string) {
        const participant = await Participant.findById(participantId);
        if (!participant) throw { statusCode: 404, message: 'Participant not found' };

        const program = await Program.findById(programId);
        if (!program) throw { statusCode: 404, message: 'Program not found' };

        const alreadyEnrolled = participant.enrolledPrograms.find(p => p._id.toString() === programId);
        if (!alreadyEnrolled) {
            participant.enrolledPrograms.push({ _id: program._id, title: program.title });
        }

        await Program.findByIdAndUpdate(programId, { $addToSet: { participants: participant._id } });

        const results: any[] = [];
        if (program.modules && program.modules.length > 0) {
            for (const mod of program.modules) {
                const existing = participant.modules.find(m => m.module._id.toString() === mod._id.toString());
                if (!existing) {
                    participant.modules.push({
                        module: { _id: mod._id, title: mod.title }
                    } as any);
                    results.push({ module: mod._id, status: 'enrolled' });
                } else {
                    results.push({ module: mod._id, status: 'skipped', reason: 'already enrolled' });
                }
            }
        }

        await participant.save();
        logger.info(`Enrolled participant ${participantId} in program ${programId} and ${results.length} modules.`);
        return { message: 'Enrolled in program and modules', results };
    }

    async list(page: number = 1, limit: number = 20, query: string = '', status: string = '') {
        const filter: mongoose.FilterQuery<IParticipant> = {};
        if (query) {
            const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ firstName: re }, { lastName: re }, { email: re }];
        }
        if (status) filter.status = status as any;

        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            Participant.find(filter).skip(skip).limit(limit).populate('modules.module._id').lean().exec(),
            Participant.countDocuments(filter).exec()
        ]);

        return { items, total };
    }

    async enroll(participantId: string, moduleIds: string[]) {
        const participant = await Participant.findById(participantId);
        if (!participant) throw { statusCode: 404, message: 'Participant not found' };

        const modules = await Module.find({ _id: { $in: moduleIds } }) as IModule[];
        if (modules.length !== moduleIds.length) throw { statusCode: 400, message: 'One or more modules not found' };

        const results: any[] = [];
        const programsToUpdate = new Set<string>();

        for (const m of modules) {
            const existing = participant.modules.find(mod => mod.module._id.toString() === m._id.toString());
            if (existing) {
                results.push({ module: m._id, status: 'skipped', reason: 'already enrolled' });
            } else {
                participant.modules.push({
                    module: { _id: m._id, title: m.title }
                } as any);
                results.push({ module: m._id, status: 'enrolled' });
            }

            if (m.program && m.program._id) {
                const programId = m.program._id.toString();
                programsToUpdate.add(programId);
                const programExists = participant.enrolledPrograms.find(p => p._id.toString() === programId);
                if (!programExists) {
                    participant.enrolledPrograms.push({
                        _id: m.program._id,
                        title: m.program.title
                    });
                }
            }
        }

        await participant.save();
        logger.info(`Participant ${participantId} enrolled in ${results.length} modules.`);

        if (programsToUpdate.size > 0) {
            await Program.updateMany(
                { _id: { $in: Array.from(programsToUpdate) } },
                { $addToSet: { participants: participant._id } }
            );
        }

        return results;
    }

    async addGrade(participantId: string, moduleId: string, gradeData: { name: string, score: number, maxScore: number, date?: string }) {
        const participant = await Participant.findById(participantId);
        if (!participant) throw { statusCode: 404, message: 'Participant not found' };

        const moduleRecord = participant.modules.id(moduleId);
        if (!moduleRecord) throw { statusCode: 404, message: 'Module record not found' };

        moduleRecord.grades.push({
            name: gradeData.name,
            score: gradeData.score,
            maxScore: gradeData.maxScore,
            date: gradeData.date ? new Date(gradeData.date) : new Date()
        });

        await participant.save();
        return moduleRecord;
    }

    async updateModuleStatus(participantId: string, moduleId: string, updates: { finalScore?: number, status?: string }) {
        const participant = await Participant.findById(participantId);
        if (!participant) throw { statusCode: 404, message: 'Participant not found' };

        const moduleRecord = participant.modules.id(moduleId);
        if (!moduleRecord) throw { statusCode: 404, message: 'Module record not found' };

        if (updates.finalScore !== undefined) moduleRecord.finalScore = updates.finalScore;
        if (updates.status !== undefined) moduleRecord.status = updates.status as any;

        await participant.save();
        return moduleRecord;
    }

    async delete(id: string) {
        const participant = await Participant.findById(id);
        if (!participant) throw { statusCode: 404, message: 'Participant not found' };

        if (participant.enrolledPrograms && participant.enrolledPrograms.length > 0) {
            const programIds = participant.enrolledPrograms.map(p => p._id);
            await Program.updateMany(
                { _id: { $in: programIds } },
                { $pull: { participants: participant._id } }
            );
        }

        await Participant.findByIdAndDelete(id);
        logger.info(`Participant deleted: ${id}`);
        return true;
    }
}
