import { db } from '../config/db.js';

export const getLeaderboard = async (req, res) => {
  try {
    // Query to get top 10 players ordered by level and xp
    // Join users, avatars, and avatar_stats to get username (from email), core_color, level, and xp
    const [leaderboard] = await db.query(`
      SELECT 
        u.email,
        SUBSTRING_INDEX(u.email, '@', 1) AS username,
        a.core_color,
        COALESCE(level_stat.value, '1') AS level,
        COALESCE(xp_stat.value, '0') AS xp
      FROM users u
      INNER JOIN avatars a ON u.id = a.user_id
      LEFT JOIN avatar_stats level_stat ON a.id = level_stat.avatar_id AND level_stat.key_name = 'level'
      LEFT JOIN avatar_stats xp_stat ON a.id = xp_stat.avatar_id AND xp_stat.key_name = 'xp'
      ORDER BY CAST(COALESCE(level_stat.value, '1') AS UNSIGNED) DESC, CAST(COALESCE(xp_stat.value, '0') AS UNSIGNED) DESC
      LIMIT 10
    `);

    // Format the leaderboard data
    const formattedLeaderboard = leaderboard.map(item => ({
      username: item.username,
      core_color: item.core_color || '#00ffff',
      level: parseInt(item.level, 10) || 1,
      xp: parseInt(item.xp, 10) || 0
    }));

    return res.status(200).json({
      success: true,
      leaderboard: formattedLeaderboard
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching leaderboard',
      error: error.message
    });
  }
};
