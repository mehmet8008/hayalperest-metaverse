import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';

export const register = async (req, res) => {
  try {
    const { email, password, avatarName } = req.body;

    // Validate required fields
    if (!email || !password || !avatarName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and avatarName are required'
      });
    }

    // Check if email already exists
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Start a transaction to ensure both user and avatar are created together
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Insert new user into users table
      const [userResult] = await connection.query(
        'INSERT INTO users (email, password) VALUES (?, ?)',
        [email, hashedPassword]
      );

      const userId = userResult.insertId;

      // Insert new avatar into avatars table with default values
      const [avatarResult] = await connection.query(
        'INSERT INTO avatars (user_id, avatar_name, bio, appearance_data, level) VALUES (?, ?, ?, ?, ?)',
        [userId, avatarName, null, null, 1]
      );

      const avatarId = avatarResult.insertId;

      // Initialize default avatar stats
      const defaultStats = [
        { stat_type: 'PHYSICAL', key_name: 'energy', value: '100' },
        { stat_type: 'PHYSICAL', key_name: 'hunger', value: '0' },
        { stat_type: 'MENTAL', key_name: 'mood', value: 'Neutral' },
        { stat_type: 'SOCIAL', key_name: 'credits', value: '50' }
      ];

      // Insert default stats into avatar_stats table
      for (const stat of defaultStats) {
        await connection.query(
          'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
          [avatarId, stat.stat_type, stat.key_name, stat.value]
        );
      }

      // Format stats for response
      const stats = {};
      defaultStats.forEach(stat => {
        stats[stat.key_name] = {
          type: stat.stat_type,
          value: stat.value
        };
      });

      // Commit the transaction
      await connection.commit();
      connection.release();

      // Return success response with stats
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          userId: userId,
          avatarId: avatarId,
          email: email,
          avatarName: avatarName,
          stats: stats
        }
      });
    } catch (error) {
      // Rollback the transaction on error
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const [users] = await db.query(
      'SELECT id, email, password FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Fetch avatar data - EXPLICITLY select profile_image
    const [avatars] = await db.query(
      'SELECT id, avatar_name, core_color, profile_image FROM avatars WHERE user_id = ?',
      [user.id]
    );

    if (avatars.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found for this user'
      });
    }

    const avatarRow = avatars[0];
    const avatarId = avatarRow.id;

    // Fetch avatar stats
    const [statsRows] = await db.query(
      'SELECT stat_type, key_name, value FROM avatar_stats WHERE avatar_id = ?',
      [avatarId]
    );

    // Format stats as array: [{ key_name, type, value }, ...]
    const stats = statsRows.map(stat => ({
      key_name: stat.key_name,
      type: stat.stat_type,
      value: stat.value
    }));

    // Extract username from email (part before @)
    const username = user.email ? user.email.split('@')[0] : 'User';

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      'secret_key',
      { expiresIn: '1d' }
    );

    // Return EXACT structure matching getMe response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        username: username
      },
      avatar: {
        avatar_name: avatarRow.avatar_name || null,
        core_color: avatarRow.core_color || null,
        profile_image: avatarRow.profile_image || null
      },
      stats: stats
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: error.message
    });
  }
};

export const getMe = async (req, res) => {
  try {
    // Join users and avatars tables to get ALL data including profile_image, current_bg, and is_admin
    const [rows] = await db.query(
      `SELECT u.id, u.email, u.is_admin, a.id as avatar_id, a.avatar_name, a.core_color, a.profile_image, a.current_bg 
       FROM users u 
       LEFT JOIN avatars a ON u.id = a.user_id 
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = rows[0];
    console.log("🔎 GET ME CHECK:", user); // Debug log to see what DB returns

    // Extract username from email (part before @)
    const username = user.email ? user.email.split('@')[0] : 'User';

    // Get stats separately
    const avatarId = user.avatar_id;
    let stats = [];
    if (avatarId) {
      const [statsRows] = await db.query(
        'SELECT stat_type, key_name, value FROM avatar_stats WHERE avatar_id = ?',
        [avatarId]
      );
      // Format stats as array: [{ key_name, type, value }, ...]
      stats = statsRows.map(stat => ({
        key_name: stat.key_name,
        type: stat.stat_type,
        value: stat.value
      }));
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: username,
        is_admin: user.is_admin === 1 || user.is_admin === true
      },
      avatar: {
        avatar_name: user.avatar_name || null,
        core_color: user.core_color || null,
        profile_image: user.profile_image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png', // Fallback
        current_bg: user.current_bg || 'DEFAULT'
      },
      stats: stats
    });
  } catch (error) {
    console.error("GetMe Error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateAvatarColor = async (req, res) => {
  try {
    // User is already attached to req by authMiddleware
    const userId = req.user?.id;
    const { color } = req.body;

    // Validate required fields
    if (!color) {
      return res.status(400).json({
        success: false,
        message: 'Color is required'
      });
    }

    // Validate color format (basic hex validation)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(color)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid color format. Please provide a valid hex color (e.g., #00ffff)'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Find user's avatar
    const [avatars] = await db.query(
      'SELECT id FROM avatars WHERE user_id = ?',
      [userId]
    );

    if (avatars.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found for this user'
      });
    }

    const avatarId = avatars[0].id;

    // Update avatar core_color
    await db.query(
      'UPDATE avatars SET core_color = ? WHERE id = ?',
      [color, avatarId]
    );

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Avatar color updated successfully',
      core_color: color
    });

  } catch (error) {
    console.error('Update avatar color error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating avatar color',
      error: error.message
    });
  }
};

export const updateProfileImage = async (req, res) => {
  try {
    // User is already attached to req by authMiddleware
    const userId = req.user?.id;
    const { imageUrl } = req.body;

    // Validate required fields
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl is required'
      });
    }

    // Basic URL validation
    try {
      new URL(imageUrl);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format. Please provide a valid image URL'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Find user's avatar
    const [avatars] = await db.query(
      'SELECT id FROM avatars WHERE user_id = ?',
      [userId]
    );

    if (avatars.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found for this user'
      });
    }

    const avatarId = avatars[0].id;

    // Update avatar profile_image
    await db.query(
      'UPDATE avatars SET profile_image = ? WHERE id = ?',
      [imageUrl, avatarId]
    );

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
      profile_image: imageUrl
    });

  } catch (error) {
    console.error('Update profile image error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating profile image',
      error: error.message
    });
  }
};
