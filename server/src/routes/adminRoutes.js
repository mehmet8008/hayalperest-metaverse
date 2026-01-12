import express from 'express';
import { getDashboardStats, getAllUsers, adminAction } from '../controllers/adminController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// All admin routes require authentication AND admin privileges
// GET /api/admin/stats - Get dashboard statistics
router.get('/stats', protect, adminMiddleware, getDashboardStats);

// GET /api/admin/users - Get all users
router.get('/users', protect, adminMiddleware, getAllUsers);

// POST /api/admin/action - Execute admin actions
router.post('/action', protect, adminMiddleware, adminAction);

export default router;
