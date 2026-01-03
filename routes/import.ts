import express from 'express';
const router = express.Router();
import * as ctrl from '../controllers/importController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

// upload CSV of participants; accepts form-data 'file'
router.post('/participants/csv', authenticateToken, requireRole('admin', 'superadmin'), ctrl.upload.single('file'), ctrl.importParticipantsCsv);

// export
router.get('/participants', authenticateToken, requireRole('admin', 'superadmin'), ctrl.exportParticipants);

// Generic Import
router.post('/generic/:model', authenticateToken, requireRole('admin', 'superadmin'), ctrl.upload.single('file'), ctrl.importGeneric);

// Preview & Confirm
router.post('/preview/:model', authenticateToken, requireRole('admin', 'superadmin'), ctrl.upload.single('file'), ctrl.previewImport);
router.post('/confirm/:model', authenticateToken, requireRole('admin', 'superadmin'), ctrl.confirmImport);

// AI Extract
router.post('/extract', authenticateToken, requireRole('admin', 'superadmin'), ctrl.extractData);

export default router;
