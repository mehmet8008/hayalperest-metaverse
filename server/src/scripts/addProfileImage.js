import { db } from '../config/db.js';

async function addProfileImage() {
  try {
    // Add profile_image column to avatars table
    await db.query(
      "ALTER TABLE avatars ADD COLUMN profile_image VARCHAR(500) DEFAULT 'https://cdn-icons-png.flaticon.com/512/149/149071.png'"
    );

    console.log("Avatar schema updated with profile_image!");

  } catch (error) {
    console.error('❌ Error updating avatar schema:', error.message);
    throw error;
  } finally {
    // Close the connection pool
    await db.end();
  }
}

// Run the script
addProfileImage()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Avatar schema update failed:', error);
    process.exit(1);
  });
