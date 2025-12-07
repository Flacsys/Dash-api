import express from 'express';
const router = express.Router();
import * as ctrl from '../controllers/participantController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

// create participant: admin+ allowed
router.post('/', authenticateToken, requireRole('admin', 'superadmin'), ctrl.createParticipant);
router.get('/:id', authenticateToken, requireRole('admin', 'superadmin'), ctrl.getParticipant);

// add: list participants
router.get('/', authenticateToken, requireRole('admin', 'superadmin'), ctrl.listParticipants);

// enroll participant into modules
router.post('/:participantId/enroll', authenticateToken, requireRole('admin', 'superadmin'), ctrl.enrollParticipant);

// add grade to a participant's module
router.post('/:participantId/modules/:moduleId/grades', authenticateToken, requireRole('admin', 'superadmin'), ctrl.addParticipantModuleGrade);

// update participant's module (final score, status)
router.put('/:participantId/modules/:moduleId', authenticateToken, requireRole('admin', 'superadmin'), ctrl.updateParticipantModule);

// delete participant
router.delete('/:id', authenticateToken, requireRole('admin', 'superadmin'), ctrl.deleteParticipant);

export default router;
