import express from 'express';
import { register, login, getMe, updateAvatarColor, updateProfileImage } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me - Protected route
router.get('/me', protect, getMe);

// POST /api/auth/customize - Update avatar color (Protected route)
router.post('/customize', protect, updateAvatarColor);

// POST /api/auth/avatar-image - Update profile image (Protected route)
router.post('/avatar-image', protect, updateProfileImage);

export default router;
