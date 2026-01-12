import { db } from '../config/db.js';

async function setupChatTable() {
  try {
    console.log('\n' + '='.repeat(50));
    console.log('💬 Setting up Global Chat Messages Table');
    console.log('='.repeat(50) + '\n');

    // Create global_messages table
    await db.query(`
      CREATE TABLE IF NOT EXISTS global_messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Chat table created!');
    console.log('\n' + '='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Failed to create chat table:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await db.end(); // Close the connection pool
    process.exit(0);
  }
}

// Run the setup
setupChatTable();
