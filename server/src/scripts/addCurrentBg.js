import { db } from '../config/db.js';

async function addCurrentBg() {
  try {
    // Add current_bg column to avatars table
    await db.query(
      "ALTER TABLE avatars ADD COLUMN current_bg VARCHAR(50) DEFAULT NULL"
    );

    console.log("Avatar schema updated with current_bg!");

  } catch (error) {
    // If column already exists, that's okay
    if (error.message.includes('Duplicate column name') || error.code === 'ER_DUP_FIELDNAME') {
      console.log("⚠️  Column 'current_bg' already exists. Skipping.");
    } else {
      console.error('❌ Error updating avatar schema:', error.message);
      throw error;
    }
  } finally {
    // Close the connection pool
    await db.end();
  }
}

// Run the script
addCurrentBg()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Avatar schema update failed:', error);
    process.exit(1);
  });
