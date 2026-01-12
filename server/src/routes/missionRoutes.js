import express from 'express';
import { completeMission, claimCopperKey } from '../controllers/missionController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// POST /api/missions/complete - Complete a mission (protected route)
router.post('/complete', authMiddleware, completeMission);

// POST /api/missions/easter-egg - Claim copper key (protected route)
router.post('/easter-egg', authMiddleware, claimCopperKey);

export default router;
