import { Program } from '../models/Program';

export async function listPrograms(req, res) {
    const programs = await Program.find().lean();
    res.json(programs);
}

export async function getProgram(req, res) {
    const p = await Program.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Program not found' });
    res.json(p);
}

export async function createProgram(req, res) {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: 'title required' });
    const p = new Program({ name: title, description });
    await p.save();
    res.status(201).json(p);
}

export async function deleteProgram(req, res) {
    const p = await Program.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ message: 'Program not found' });
    res.json({ message: 'deleted' });
}
