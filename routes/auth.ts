import { Router } from 'express';
import * as ctrl from '../controllers/authController';
import { Admin } from '../models/Admin';

const router = Router();

// router.post('/register', ctrl.register);
router.post('/login', ctrl.login);

// dev-only debug endpoint to inspect admins
if (process.env.NODE_ENV !== 'production') {
    router.get('/debug/admins', async (req, res) => {
        const admins = await Admin.find({}, { passwordHash: 1, email: 1, name: 1, role: 1 }).lean().exec();
        res.json({ count: admins.length, admins });
    });
}

export default router;
