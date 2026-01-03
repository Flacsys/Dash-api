
import { Module, IModule } from '../models/Module';
import { Program } from '../models/Program';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class ModuleService {
    async list(query: any = {}) {
        return await Module.find(query).lean();
    }

    async findById(id: string) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw { statusCode: 400, message: 'Invalid ID format' };
        return await Module.findById(id);
    }

    async create(data: { title: string, program: string, credits: number, isActive: boolean }) {
        let { title, program, credits, isActive } = data;

        let programId = program;
        let programTitle = '';

        if (mongoose.Types.ObjectId.isValid(program)) {
            const programDoc = await Program.findById(program);
            if (!programDoc) throw { statusCode: 400, message: `Program not found: ${program}` };
            programId = programDoc._id.toString();
            programTitle = programDoc.title;
        } else {
            const programDoc = await Program.findOne({ title: program });
            if (!programDoc) throw { statusCode: 400, message: `Program not found: ${program}` };
            programId = programDoc._id.toString();
            programTitle = programDoc.title;
        }

        const code = this.generateModuleCode(title);

        try {
            const m = new Module({
                title,
                program: { _id: programId, title: programTitle },
                credits,
                isActive,
                code
            });
            await m.save();

            await Program.findByIdAndUpdate(programId, {
                $push: { modules: { _id: m._id, title: m.title } }
            });

            logger.info(`Module created: ${title} (${m._id}) in program ${programTitle}`);
            return m;
        } catch (error: any) {
            if (error.code === 11000) {
                // Retry with suffix if duplicate code
                const suffix = Math.floor(Math.random() * 1000);
                const m = new Module({
                    title,
                    program: { _id: programId, title: programTitle },
                    credits,
                    isActive,
                    code: `${code}-${suffix}`
                });
                await m.save();

                await Program.findByIdAndUpdate(programId, {
                    $push: { modules: { _id: m._id, title: m.title } }
                });

                logger.warn(`Module duplicate code handled: ${code} -> ${m.code}`);
                return m;
            }
            throw error;
        }
    }

    async delete(id: string) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw { statusCode: 400, message: 'Invalid ID format' };

        const m = await Module.findByIdAndDelete(id);
        if (!m) throw { statusCode: 404, message: 'Module not found' };

        if (m.program && m.program._id) {
            await Program.findByIdAndUpdate(m.program._id, {
                $pull: { modules: { _id: m._id } }
            });
        }
        logger.info(`Module deleted: ${id}`);
        return true;
    }

    private generateModuleCode(title: string): string {
        const words = title.split(' ').filter(w => w.length > 0);
        const acronym = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');

        const now = new Date();
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        const year = now.getFullYear().toString().slice(-2);

        return `${acronym}${quarter}${year}`;
    }
}
