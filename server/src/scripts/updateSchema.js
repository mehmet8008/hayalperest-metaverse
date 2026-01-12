import { db } from '../config/db.js';

async function updateSchema() {
  try {
    // Update the stat_type column to include 'PROGRESSION'
    await db.query(
      "ALTER TABLE avatar_stats MODIFY COLUMN stat_type ENUM('PHYSICAL', 'MENTAL', 'SOCIAL', 'PROGRESSION') NOT NULL"
    );

    console.log("Schema updated! 'PROGRESSION' type is now allowed.");

  } catch (error) {
    console.error('❌ Error updating schema:', error.message);
    throw error;
  } finally {
    // Close the connection pool
    await db.end();
  }
}

// Run the script
updateSchema()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Schema update failed:', error);
    process.exit(1);
  });
