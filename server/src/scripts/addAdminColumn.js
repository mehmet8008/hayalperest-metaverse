import { db } from '../config/db.js';

async function addAdminColumn() {
  try {
    console.log('\n' + '='.repeat(50));
    console.log('👑 Initializing Admin System');
    console.log('='.repeat(50) + '\n');

    // Add is_admin column to users table
    try {
      await db.query(
        'ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE'
      );
      console.log('✅ Added is_admin column to users table');
    } catch (error) {
      // If column already exists, that's okay
      if (error.message.includes('Duplicate column name') || error.code === 'ER_DUP_FIELDNAME') {
        console.log("⚠️  Column 'is_admin' already exists. Skipping.");
      } else {
        throw error;
      }
    }

    // Promote user with id = 1 to admin
    const [result] = await db.query(
      'UPDATE users SET is_admin = TRUE WHERE id = 1'
    );

    if (result.affectedRows > 0) {
      console.log('✅ User 1 promoted to Admin (God mode activated)');
    } else {
      console.log('⚠️  User with id = 1 not found. Skipping promotion.');
    }

    console.log('\n🎉 Admin system initialized. User 1 is now God.');
    console.log('\n' + '='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Error initializing admin system:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    // Close the connection pool
    await db.end();
    process.exit(0);
  }
}

// Run the script
addAdminColumn();
