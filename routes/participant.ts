import express from 'express';
const router = express.Router();
import * as ctrl from '../controllers/participantController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

// create participant: admin+ allowed
router.post('/', authenticateToken, requireRole('admin','superadmin'), ctrl.createParticipant);
router.get('/:id', authenticateToken, requireRole('admin','superadmin'), ctrl.getParticipant);

// add: list participants
router.get('/', authenticateToken, requireRole('admin','superadmin'), ctrl.listParticipants);

// enroll participant into modules
router.post('/:participantId/enroll', authenticateToken, requireRole('admin','superadmin'), ctrl.enrollParticipant);

// add grade to an enrollment
router.post('/:participantId/enrollments/:enrollmentId/grades', authenticateToken, requireRole('admin','superadmin'), ctrl.addGrade);

export default router;
