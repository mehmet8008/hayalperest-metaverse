import express from 'express';
import { getLeaderboard } from '../controllers/leaderboardController.js';

const router = express.Router();

// GET /api/leaderboard - Get top 10 players (public route)
router.get('/', getLeaderboard);

export default router;
