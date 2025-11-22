import express from 'express';
import {authenticateToken} from "../middleware/auth";
import {requireRole} from "../middleware/roles";
import * as ctrl from '../controllers/programController';

const router = express.Router();

router.get('/', authenticateToken, ctrl.listPrograms);
router.get('/:id', authenticateToken, ctrl.getProgram);

router.post('/', authenticateToken, requireRole('superadmin'), ctrl.createProgram);
router.delete('/:id', authenticateToken, requireRole('superadmin'), ctrl.deleteProgram);
// router.put('/:id', authenticateToken, requireRole('superadmin'), ctrl.updateProgram);

export default router;
