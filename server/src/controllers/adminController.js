import { db } from '../config/db.js';

// Track server start time for uptime calculation
const serverStartTime = Date.now();

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    // Get total users count
    const [userCount] = await db.query('SELECT COUNT(*) as total FROM users');
    const totalUsers = userCount[0].total;

    // Get total credits in economy (sum of all credits from avatar_stats)
    const [creditsResult] = await db.query(`
      SELECT SUM(CAST(value AS UNSIGNED)) as total_credits 
      FROM avatar_stats 
      WHERE key_name = 'credits'
    `);
    const totalCredits = creditsResult[0].total_credits || 0;

    // Calculate server uptime
    const uptimeMs = Date.now() - serverStartTime;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptime = `${hours}h ${minutes}m ${seconds}s`;

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalCredits,
        uptime,
        uptimeMs
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    // Get all users with their avatar info and stats
    const [users] = await db.query(`
      SELECT 
        u.id,
        SUBSTRING_INDEX(u.email, '@', 1) AS username,
        u.email,
        u.is_admin,
        COALESCE(level_stat.value, '1') AS level,
        COALESCE(credits_stat.value, '0') AS credits,
        a.avatar_name,
        a.core_color
      FROM users u
      LEFT JOIN avatars a ON u.id = a.user_id
      LEFT JOIN avatar_stats level_stat ON a.id = level_stat.avatar_id AND level_stat.key_name = 'level'
      LEFT JOIN avatar_stats credits_stat ON a.id = credits_stat.avatar_id AND credits_stat.key_name = 'credits'
      ORDER BY u.id ASC
    `);

    // Format users data
    const formattedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin === 1 || user.is_admin === true,
      level: parseInt(user.level, 10) || 1,
      credits: parseInt(user.credits, 10) || 0,
      avatarName: user.avatar_name || 'Unknown',
      coreColor: user.core_color || '#00ffff'
    }));

    return res.status(200).json({
      success: true,
      users: formattedUsers
    });

  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// Handle admin actions
export const adminAction = async (req, res) => {
  try {
    const { action, userId, amount } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action is required'
      });
    }

    switch (action) {
      case 'GIVE_CREDITS':
        if (!userId || !amount) {
          return res.status(400).json({
            success: false,
            message: 'userId and amount are required for GIVE_CREDITS'
          });
        }

        // Get avatar_id for the user
        const [avatars] = await db.query(
          'SELECT id FROM avatars WHERE user_id = ? LIMIT 1',
          [userId]
        );

        if (avatars.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Avatar not found for user'
          });
        }

        const avatarId = avatars[0].id;

        // Check if credits stat exists
        const [existingCredits] = await db.query(
          'SELECT * FROM avatar_stats WHERE avatar_id = ? AND key_name = ?',
          [avatarId, 'credits']
        );

        if (existingCredits.length > 0) {
          // Update existing credits
          const newAmount = parseInt(existingCredits[0].value, 10) + parseInt(amount, 10);
          await db.query(
            'UPDATE avatar_stats SET value = ? WHERE avatar_id = ? AND key_name = ?',
            [newAmount.toString(), avatarId, 'credits']
          );
        } else {
          // Create new credits stat
          await db.query(
            'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
            [avatarId, 'SOCIAL', 'credits', amount.toString()]
          );
        }

        return res.status(200).json({
          success: true,
          message: `Credits given successfully to user ${userId}`,
          amount: parseInt(amount, 10)
        });

      case 'MAX_ENERGY':
        if (!userId) {
          return res.status(400).json({
            success: false,
            message: 'userId is required for MAX_ENERGY'
          });
        }

        // Get avatar_id for the user
        const [energyAvatars] = await db.query(
          'SELECT id FROM avatars WHERE user_id = ? LIMIT 1',
          [userId]
        );

        if (energyAvatars.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Avatar not found for user'
          });
        }

        const energyAvatarId = energyAvatars[0].id;

        // Check if energy stat exists
        const [existingEnergy] = await db.query(
          'SELECT * FROM avatar_stats WHERE avatar_id = ? AND key_name = ?',
          [energyAvatarId, 'energy']
        );

        if (existingEnergy.length > 0) {
          // Update to max energy (100)
          await db.query(
            'UPDATE avatar_stats SET value = ? WHERE avatar_id = ? AND key_name = ?',
            ['100', energyAvatarId, 'energy']
          );
        } else {
          // Create new energy stat with max value
          await db.query(
            'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
            [energyAvatarId, 'PHYSICAL', 'energy', '100']
          );
        }

        return res.status(200).json({
          success: true,
          message: `Energy set to maximum for user ${userId}`
        });

      case 'BAN_USER':
        if (!userId) {
          return res.status(400).json({
            success: false,
            message: 'userId is required for BAN_USER'
          });
        }

        // For now, just log the ban action (you can implement actual ban logic later)
        console.log(`⚠️  Admin action: BAN_USER requested for user ${userId}`);
        
        return res.status(200).json({
          success: true,
          message: `Ban action logged for user ${userId} (implementation pending)`
        });

      case 'RESET_USER':
        if (!userId) {
          return res.status(400).json({
            success: false,
            message: 'userId is required for RESET_USER'
          });
        }

        // Get avatar_id
        const [resetAvatars] = await db.query(
          'SELECT id FROM avatars WHERE user_id = ? LIMIT 1',
          [userId]
        );

        if (resetAvatars.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Avatar not found for user'
          });
        }

        const resetAvatarId = resetAvatars[0].id;

        // Reset stats to defaults
        await db.query(
          'DELETE FROM avatar_stats WHERE avatar_id = ?',
          [resetAvatarId]
        );

        // Insert default stats
        const defaultStats = [
          { stat_type: 'SOCIAL', key_name: 'credits', value: '100' },
          { stat_type: 'PROGRESSION', key_name: 'xp', value: '0' },
          { stat_type: 'PROGRESSION', key_name: 'level', value: '1' },
          { stat_type: 'PHYSICAL', key_name: 'energy', value: '100' }
        ];

        for (const stat of defaultStats) {
          try {
            await db.query(
              'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
              [resetAvatarId, stat.stat_type, stat.key_name, stat.value]
            );
          } catch (error) {
            // If PROGRESSION doesn't work, try SOCIAL
            if (error.message.includes('stat_type')) {
              await db.query(
                'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
                [resetAvatarId, 'SOCIAL', stat.key_name, stat.value]
              );
            }
          }
        }

        // Reset avatar level
        await db.query(
          'UPDATE avatars SET level = 1 WHERE id = ?',
          [resetAvatarId]
        );

        return res.status(200).json({
          success: true,
          message: `User ${userId} reset to defaults successfully`
        });

      default:
        return res.status(400).json({
          success: false,
          message: `Unknown action: ${action}`
        });
    }

  } catch (error) {
    console.error('Admin action error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to execute admin action',
      error: error.message
    });
  }
};
