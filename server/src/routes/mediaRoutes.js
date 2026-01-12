import express from 'express';
import { getMediaContent } from '../controllers/mediaController.js';

const router = express.Router();

// GET /api/media - Get media content (public route)
router.get('/', getMediaContent);

export default router;
