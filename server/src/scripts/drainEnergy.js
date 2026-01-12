import { db } from '../config/db.js';

async function drainEnergy() {
  try {
    // Update all avatar energy stats to 10
    const [result] = await db.query(
      "UPDATE avatar_stats SET value = '10' WHERE key_name = 'energy'"
    );

    console.log('Energy drained to 10%!');
    console.log(`Affected rows: ${result.affectedRows}`);

  } catch (error) {
    console.error('❌ Error draining energy:', error.message);
    throw error;
  } finally {
    // Close the connection pool
    await db.end();
  }
}

// Run the script
drainEnergy()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Energy drain failed:', error);
    process.exit(1);
  });
