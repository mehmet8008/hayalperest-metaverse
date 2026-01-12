import { db } from '../config/db.js';

export const completeMission = async (req, res) => {
  try {
    // Get userId from middleware (set by authMiddleware)
    const userId = req.user?.id;
    const { missionType } = req.body;

    // Validate required fields
    if (!missionType) {
      return res.status(400).json({
        success: false,
        message: 'Mission type is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Find user's avatar
      const [avatars] = await connection.query(
        'SELECT id FROM avatars WHERE user_id = ?',
        [userId]
      );

      if (avatars.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Avatar not found for this user'
        });
      }

      const avatarId = avatars[0].id;

      let rewardCredits = 0;
      let rewardXp = 0;
      let levelUp = false;

      // Handle different mission types
      if (missionType === 'DATA_MINING') {
        // Generate random reward: Credits (10-50), XP (5)
        rewardCredits = Math.floor(Math.random() * (50 - 10 + 1)) + 10; // Random between 10-50
        rewardXp = 5;

        // Get current credits
        const [creditsRows] = await connection.query(
          'SELECT id, value FROM avatar_stats WHERE avatar_id = ? AND key_name = ?',
          [avatarId, 'credits']
        );

        let currentCredits = 0;
        let creditsStatId = null;

        if (creditsRows.length > 0) {
          currentCredits = parseInt(creditsRows[0].value, 10);
          creditsStatId = creditsRows[0].id;
        }

        const newCredits = currentCredits + rewardCredits;

        // Update credits
        if (creditsStatId) {
          await connection.query(
            'UPDATE avatar_stats SET value = ? WHERE id = ?',
            [String(newCredits), creditsStatId]
          );
        } else {
          await connection.query(
            'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
            [avatarId, 'SOCIAL', 'credits', String(newCredits)]
          );
        }

        // Get current xp and level stats
        const [xpRows] = await connection.query(
          'SELECT id, value FROM avatar_stats WHERE avatar_id = ? AND key_name = ?',
          [avatarId, 'xp']
        );

        const [levelRows] = await connection.query(
          'SELECT id, value FROM avatar_stats WHERE avatar_id = ? AND key_name = ?',
          [avatarId, 'level']
        );

        let currentXp = 0;
        let xpStatId = null;
        let currentLevel = 1;
        let levelStatId = null;

        if (xpRows.length > 0) {
          currentXp = parseInt(xpRows[0].value, 10);
          xpStatId = xpRows[0].id;
        }

        if (levelRows.length > 0) {
          currentLevel = parseInt(levelRows[0].value, 10);
          levelStatId = levelRows[0].id;
        }

        // Increase XP
        const newXp = currentXp + rewardXp;

        // Check for level up
        if (newXp >= 100) {
          levelUp = true;
          const remainingXp = newXp - 100;
          const newLevel = currentLevel + 1;

          // Get energy stat for level up bonus
          const [energyRows] = await connection.query(
            'SELECT id, value FROM avatar_stats WHERE avatar_id = ? AND key_name = ?',
            [avatarId, 'energy']
          );

          let energyStatId = null;
          if (energyRows.length > 0) {
            energyStatId = energyRows[0].id;
          }

          // Update XP (new_xp - 100)
          if (xpStatId) {
            await connection.query(
              'UPDATE avatar_stats SET value = ? WHERE id = ?',
              [String(remainingXp), xpStatId]
            );
          } else {
            await connection.query(
              'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
              [avatarId, 'PROGRESSION', 'xp', String(remainingXp)]
            );
          }

          // Update level
          if (levelStatId) {
            await connection.query(
              'UPDATE avatar_stats SET value = ? WHERE id = ?',
              [String(newLevel), levelStatId]
            );
          } else {
            await connection.query(
              'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
              [avatarId, 'PROGRESSION', 'level', String(newLevel)]
            );
          }

          // Update energy to 100 on level up
          if (energyStatId) {
            await connection.query(
              'UPDATE avatar_stats SET value = ? WHERE id = ?',
              ['100', energyStatId]
            );
          } else {
            await connection.query(
              'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
              [avatarId, 'PHYSICAL', 'energy', '100']
            );
          }
        } else {
          // No level up - just update XP
          if (xpStatId) {
            await connection.query(
              'UPDATE avatar_stats SET value = ? WHERE id = ?',
              [String(newXp), xpStatId]
            );
          } else {
            await connection.query(
              'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
              [avatarId, 'PROGRESSION', 'xp', String(newXp)]
            );
          }
        }
      } else {
        // Unknown mission type
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'Unknown mission type'
        });
      }

      // Fetch all updated stats to return
      const [updatedStatsRows] = await connection.query(
        'SELECT key_name, value FROM avatar_stats WHERE avatar_id = ?',
        [avatarId]
      );

      const newStats = {};
      updatedStatsRows.forEach(stat => {
        newStats[stat.key_name] = parseInt(stat.value, 10) || stat.value;
      });

      // Commit transaction
      await connection.commit();
      connection.release();

      // Return success response
      return res.status(200).json({
        success: true,
        reward: {
          credits: rewardCredits,
          xp: rewardXp
        },
        newStats: newStats,
        levelUp: levelUp
      });

    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Complete mission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while completing mission',
      error: error.message
    });
  }
};

export const claimCopperKey = async (req, res) => {
  try {
    // Get userId from middleware (set by authMiddleware)
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Find user's avatar
      const [avatars] = await connection.query(
        'SELECT id FROM avatars WHERE user_id = ?',
        [userId]
      );

      if (avatars.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Avatar not found for this user'
        });
      }

      const avatarId = avatars[0].id;

      // Check if user already has the copper key
      const [eggRows] = await connection.query(
        'SELECT id, value FROM avatar_stats WHERE avatar_id = ? AND key_name = ?',
        [avatarId, 'egg_copper']
      );

      if (eggRows.length > 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'You have already claimed this key!'
        });
      }

      // Add egg_copper stat
      await connection.query(
        'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
        [avatarId, 'PROGRESSION', 'egg_copper', '1']
      );

      // Get current credits
      const [creditsRows] = await connection.query(
        'SELECT id, value FROM avatar_stats WHERE avatar_id = ? AND key_name = ?',
        [avatarId, 'credits']
      );

      let currentCredits = 0;
      let creditsStatId = null;

      if (creditsRows.length > 0) {
        currentCredits = parseInt(creditsRows[0].value, 10);
        creditsStatId = creditsRows[0].id;
      }

      const newCredits = currentCredits + 1000000;

      // Update credits
      if (creditsStatId) {
        await connection.query(
          'UPDATE avatar_stats SET value = ? WHERE id = ?',
          [String(newCredits), creditsStatId]
        );
      } else {
        await connection.query(
          'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
          [avatarId, 'SOCIAL', 'credits', String(newCredits)]
        );
      }

      // Get current XP
      const [xpRows] = await connection.query(
        'SELECT id, value FROM avatar_stats WHERE avatar_id = ? AND key_name = ?',
        [avatarId, 'xp']
      );

      let currentXp = 0;
      let xpStatId = null;

      if (xpRows.length > 0) {
        currentXp = parseInt(xpRows[0].value, 10);
        xpStatId = xpRows[0].id;
      }

      const newXp = currentXp + 5000;

      // Update XP (handle potential level ups, but don't worry about multiple levels for now)
      // Just add the XP - level up logic can handle it if needed
      if (xpStatId) {
        await connection.query(
          'UPDATE avatar_stats SET value = ? WHERE id = ?',
          [String(newXp), xpStatId]
        );
      } else {
        await connection.query(
          'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
          [avatarId, 'PROGRESSION', 'xp', String(newXp)]
        );
      }

      // Commit transaction
      await connection.commit();
      connection.release();

      // Return success response
      return res.status(200).json({
        success: true,
        message: 'COPPER KEY ACQUIRED! You are now the Architect.'
      });

    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Claim copper key error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while claiming copper key',
      error: error.message
    });
  }
};
