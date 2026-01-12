import { db } from '../config/db.js';

export const adminMiddleware = async (req, res, next) => {
  try {
    // Check if user exists (should be set by authMiddleware)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Query database to check if user is admin
    const [users] = await db.query(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is admin (MySQL BOOLEAN is stored as TINYINT: 1 = true, 0 = false)
    const isAdmin = users[0].is_admin === 1 || users[0].is_admin === true;

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required'
      });
    }

    // User is admin, proceed
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Admin verification error',
      error: error.message
    });
  }
};
