import { db } from '../config/db.js';

async function checkData() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 HayalPerest Database Check'.padStart(40));
    console.log('='.repeat(60) + '\n');

    // Query users table
    console.log('📊 USERS TABLE:');
    console.log('-'.repeat(60));
    const [users] = await db.query('SELECT * FROM users');
    
    if (users.length === 0) {
      console.log('   No users found in database.\n');
    } else {
      console.table(users);
      console.log(`   Total users: ${users.length}\n`);
    }

    // Query avatars table
    console.log('🎭 AVATARS TABLE:');
    console.log('-'.repeat(60));
    const [avatars] = await db.query('SELECT * FROM avatars');
    
    if (avatars.length === 0) {
      console.log('   No avatars found in database.\n');
    } else {
      console.table(avatars);
      console.log(`   Total avatars: ${avatars.length}\n`);
    }

    console.log('='.repeat(60));
    console.log('✅ Database check completed!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    throw error;
  } finally {
    // Close the connection pool
    await db.end();
  }
}

// Run the check
checkData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database check failed:', error);
    process.exit(1);
  });
