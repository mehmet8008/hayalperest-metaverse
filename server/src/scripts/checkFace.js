import { db } from '../config/db.js';

async function checkFace() {
  try {
    console.log('\n' + '='.repeat(50));
    console.log('🔍 Checking Profile Image in Database...');
    console.log('='.repeat(50) + '\n');

    // Query the first avatar record
    const [rows] = await db.query(
      'SELECT * FROM avatars LIMIT 1'
    );

    if (rows.length === 0) {
      console.log('⚠️  No avatars found in database.');
    } else {
      const avatar = rows[0];
      const profileImage = avatar.profile_image || 'NULL (not set)';
      console.log('CURRENT FACE IN DB:', profileImage);
      console.log('\nFull avatar record:');
      console.log(JSON.stringify(avatar, null, 2));
    }

    console.log('\n' + '='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Error checking face:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await db.end(); // Close the connection pool
    process.exit(0);
  }
}

// Run the check
checkFace();
