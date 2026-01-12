import { db } from '../config/db.js';

async function addMoney() {
  try {
    // Update all avatar credits stats to 5000
    const [result] = await db.query(
      "UPDATE avatar_stats SET value = '5000' WHERE key_name = 'credits'"
    );

    console.log('Richie Rich mode activated! 5000 Credits added.');
    console.log(`Affected rows: ${result.affectedRows}`);

  } catch (error) {
    console.error('❌ Error adding money:', error.message);
    throw error;
  } finally {
    // Close the connection pool
    await db.end();
  }
}

// Run the script
addMoney()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Add money failed:', error);
    process.exit(1);
  });
