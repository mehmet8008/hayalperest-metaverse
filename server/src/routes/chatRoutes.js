import express from 'express';
import { chatWithAvatar, getChatHistory } from '../controllers/chatController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// POST /api/chat - Protected route (requires authentication)
router.post('/', authMiddleware, chatWithAvatar);

// GET /api/chat/history - Get chat history (no auth required for public chat)
router.get('/history', getChatHistory);

export default router;
