import { db } from '../config/db.js';

async function updateAvatarSchema() {
  try {
    // Add core_color column to avatars table
    await db.query(
      "ALTER TABLE avatars ADD COLUMN core_color VARCHAR(20) DEFAULT '#00ffff'"
    );

    console.log("Avatar schema updated with core_color!");

  } catch (error) {
    console.error('❌ Error updating avatar schema:', error.message);
    throw error;
  } finally {
    // Close the connection pool
    await db.end();
  }
}

// Run the script
updateAvatarSchema()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Avatar schema update failed:', error);
    process.exit(1);
  });
