import { db } from '../config/db.js';

async function initDb() {
  try {
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "users" created successfully');

    // Create avatars table
    await db.query(`
      CREATE TABLE IF NOT EXISTS avatars (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        avatar_name VARCHAR(255) NOT NULL,
        bio TEXT,
        appearance_data JSON,
        level INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table "avatars" created successfully');

    // Create avatar_stats table
    await db.query(`
      CREATE TABLE IF NOT EXISTS avatar_stats (
        id INT PRIMARY KEY AUTO_INCREMENT,
        avatar_id INT NOT NULL,
        stat_type ENUM('PHYSICAL', 'MENTAL', 'SOCIAL') NOT NULL,
        key_name VARCHAR(100) NOT NULL,
        value VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (avatar_id) REFERENCES avatars(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table "avatar_stats" created successfully');

    // Create inventory table
    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INT PRIMARY KEY AUTO_INCREMENT,
        avatar_id INT NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        item_type ENUM('PHYSICAL', 'DIGITAL') NOT NULL,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (avatar_id) REFERENCES avatars(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Table "inventory" created successfully');

    console.log('\n🎉 All database tables initialized successfully!');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    throw error;
  } finally {
    // Close the connection pool
    await db.end();
  }
}

// Run the initialization
initDb()
  .then(() => {
    console.log('Database setup completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database setup failed:', error);
    process.exit(1);
  });
