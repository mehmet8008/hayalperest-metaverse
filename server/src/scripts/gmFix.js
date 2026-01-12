import { db } from '../config/db.js';

async function gmFix() {
  try {
    console.log('\n' + '='.repeat(50));
    console.log('⚡ GM FIX: Season 2 Reset');
    console.log('='.repeat(50) + '\n');

    // Get avatar_id for user_id = 1
    const [avatars] = await db.query(
      'SELECT id FROM avatars WHERE user_id = 1 LIMIT 1'
    );

    if (avatars.length === 0) {
      console.log('⚠️  No avatar found for user_id = 1');
      console.log('Creating avatar for user_id = 1...');
      
      // Check if user exists
      const [users] = await db.query('SELECT id FROM users WHERE id = 1');
      if (users.length === 0) {
        console.log('❌ User with id = 1 does not exist. Please create a user first.');
        process.exit(1);
      }

      // Create avatar for user_id = 1
      const [avatarResult] = await db.query(
        'INSERT INTO avatars (user_id, avatar_name, level) VALUES (?, ?, ?)',
        [1, 'GM Avatar', 5]
      );
      var avatarId = avatarResult.insertId;
      console.log(`✅ Created avatar with id: ${avatarId}`);
    } else {
      var avatarId = avatars[0].id;
      console.log(`✅ Found avatar with id: ${avatarId}`);
    }

    // TRUNCATE avatar_stats table (Wipe all stats)
    await db.query('TRUNCATE TABLE avatar_stats');
    console.log('✅ Wiped all avatar_stats');

    // Re-Initialize stats for the user
    const stats = [
      { stat_type: 'SOCIAL', key_name: 'credits', value: '1000000' },
      { stat_type: 'PROGRESSION', key_name: 'xp', value: '500' },
      { stat_type: 'PROGRESSION', key_name: 'level', value: '5' },
      { stat_type: 'PHYSICAL', key_name: 'energy', value: '100' }
    ];

    console.log('\n📊 Inserting restored stats...');
    for (const stat of stats) {
      try {
        await db.query(
          'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
          [avatarId, stat.stat_type, stat.key_name, stat.value]
        );
        console.log(`✅ Inserted: ${stat.key_name} = ${stat.value} (${stat.stat_type})`);
      } catch (error) {
        // If PROGRESSION doesn't work, try SOCIAL for xp/level
        if (error.message.includes('stat_type') || error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
          console.log(`⚠️  ${stat.stat_type} not allowed, trying SOCIAL for ${stat.key_name}...`);
          const fallbackType = stat.key_name === 'xp' || stat.key_name === 'level' ? 'SOCIAL' : stat.stat_type;
          await db.query(
            'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
            [avatarId, fallbackType, stat.key_name, stat.value]
          );
          console.log(`✅ Inserted: ${stat.key_name} = ${stat.value} (${fallbackType})`);
        } else {
          throw error;
        }
      }
    }

    // Update avatar level directly in avatars table
    await db.query(
      'UPDATE avatars SET level = 5 WHERE id = ?',
      [avatarId]
    );
    console.log('✅ Updated avatar level to 5');

    console.log('\n🎉 Season 2 Started! Stats wiped and restored.');
    console.log('\n' + '='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ GM Fix failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await db.end(); // Close the connection pool
    process.exit(0);
  }
}

// Run the GM fix
gmFix();
