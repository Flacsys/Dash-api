
import { Program } from '../models/Program';
import mongoose from 'mongoose';
import logger from '../utils/logger';

export class ProgramService {
    async list() {
        return await Program.find().lean();
    }

    async findById(id: string) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw { statusCode: 400, message: 'Invalid ID format' };
        return await Program.findById(id);
    }

    async create(data: { title: string, semester: string, duration: string }) {
        const { title, semester, duration } = data;

        const code = this.generateProgramCode(title);
        const p = new Program({ title, semester, duration, code });
        await p.save();
        logger.info(`Program created: ${title} (${p._id})`);
        return p;
    }

    async delete(id: string) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw { statusCode: 400, message: 'Invalid ID format' };

        const p = await Program.findByIdAndDelete(id);
        if (!p) throw { statusCode: 404, message: 'Program not found' };
        logger.info(`Program deleted: ${id}`);
        return true;
    }

    private generateProgramCode(title: string): string {
        const words = title.split(' ').filter(w => w.length > 0);
        const acronym = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');

        const now = new Date();
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        const year = now.getFullYear().toString().slice(-2);

        return `${acronym}${quarter}${year}`;
    }
}
