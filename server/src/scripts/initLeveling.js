import { db } from '../config/db.js';

async function initLeveling() {
  try {
    // Get all avatars
    const [avatars] = await db.query('SELECT id FROM avatars');

    if (avatars.length === 0) {
      console.log('No avatars found. Nothing to initialize.');
      return;
    }

    let xpInserted = 0;
    let levelInserted = 0;

    // Insert xp and level stats for each avatar if they don't already exist
    for (const avatar of avatars) {
      // Check if xp stat exists
      const [existingXp] = await db.query(
        'SELECT id FROM avatar_stats WHERE avatar_id = ? AND key_name = ?',
        [avatar.id, 'xp']
      );

      // Insert xp stat if it doesn't exist
      if (existingXp.length === 0) {
        await db.query(
          `INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value)
           VALUES (?, 'PROGRESSION', 'xp', '0')`,
          [avatar.id]
        );
        xpInserted++;
      }

      // Check if level stat exists
      const [existingLevel] = await db.query(
        'SELECT id FROM avatar_stats WHERE avatar_id = ? AND key_name = ?',
        [avatar.id, 'level']
      );

      // Insert level stat if it doesn't exist
      if (existingLevel.length === 0) {
        await db.query(
          `INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value)
           VALUES (?, 'PROGRESSION', 'level', '1')`,
          [avatar.id]
        );
        levelInserted++;
      }
    }

    console.log('Leveling system initialized!');
    console.log(`XP stats initialized: ${xpInserted} new entries`);
    console.log(`Level stats initialized: ${levelInserted} new entries`);

  } catch (error) {
    console.error('❌ Error initializing leveling system:', error.message);
    throw error;
  } finally {
    // Close the connection pool
    await db.end();
  }
}

// Run the script
initLeveling()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Leveling initialization failed:', error);
    process.exit(1);
  });
