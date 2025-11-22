import { Module } from '../models/Module';

export async function listModules(req, res) {
    const query: any = {};
    if ((req.query as any).program) query.program = (req.query as any).program;
    const modules = await Module.find(query).populate('program').lean();
    res.json(modules);
}

export async function getModule(req, res) {
    const m = await Module.findById(req.params.id).populate('program');
    if (!m) return res.status(404).json({ message: 'Module not found' });
    res.json(m);
}

export async function createModule(req, res) {
    const { title, description, program } = req.body;
    if (!title || !program) return res.status(400).json({ message: 'title and program required' });
    const m = new Module({ title, description, program });
    await m.save();
    res.status(201).json(m);
}

export async function deleteModule(req, res) {
    const m = await Module.findByIdAndDelete(req.params.id);
    if (!m) return res.status(404).json({ message: 'Module not found' });
    res.json({ message: 'deleted' });
}
