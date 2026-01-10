import { Router } from 'express';
import * as ctrl from '../controllers/authController';


const router = Router();

router.post('/admin-login', ctrl.login);
router.post('/login', ctrl.loginParticipant);

export default router;
