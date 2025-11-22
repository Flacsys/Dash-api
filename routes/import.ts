import express from 'express';
const router = express.Router();
import * as ctrl from '../controllers/importController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

// upload CSV of participants; accepts form-data 'file'
router.post('/participants/csv', authenticateToken, requireRole('admin','superadmin'), ctrl.upload.single('file'), ctrl.importParticipantsCsv);

// export
router.get('/participants', authenticateToken, requireRole('admin','superadmin'), ctrl.exportParticipants);

export default router;
