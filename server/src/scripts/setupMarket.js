import { db } from '../config/db.js';

async function setupMarketplace() {
  try {
    console.log('\n' + '='.repeat(50));
    console.log('🛒 Starting HayalPerest Marketplace Setup...');
    console.log('='.repeat(50) + '\n');

    // Create products table
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price INT NOT NULL,
        image_url VARCHAR(255),
        type ENUM('PHYSICAL', 'DIGITAL') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table "products" created or already exists.');

    // Check if products already exist
    const [existingProducts] = await db.query('SELECT COUNT(*) as count FROM products');
    const productCount = existingProducts[0]?.count || 0;

    if (productCount === 0) {
      console.log('\n📦 Inserting seed products...');

      // Insert seed products
      const seedProducts = [
        {
          name: 'Astronaut Lamp',
          description: 'A futuristic physical lamp featuring an astronaut design. Perfect for illuminating your workspace in the Metaverse.',
          price: 150,
          image_url: 'https://via.placeholder.com/400x400/00ffff/000000?text=Astronaut+Lamp',
          type: 'PHYSICAL'
        },
        {
          name: 'Neon Core Upgrade',
          description: 'Digital upgrade that enhances your Avatar\'s energy core with neon effects. Increases visual appeal and system performance.',
          price: 500,
          image_url: 'https://via.placeholder.com/400x400/9333ea/ffffff?text=Neon+Core+Upgrade',
          type: 'DIGITAL'
        },
        {
          name: 'Energy Drink',
          description: 'Digital consumable that instantly restores 50% of your Avatar\'s energy. Perfect for extended Metaverse sessions.',
          price: 10,
          image_url: 'https://via.placeholder.com/400x400/00ff00/000000?text=Energy+Drink',
          type: 'DIGITAL'
        }
      ];

      for (const product of seedProducts) {
        await db.query(
          'INSERT INTO products (name, description, price, image_url, type) VALUES (?, ?, ?, ?, ?)',
          [product.name, product.description, product.price, product.image_url, product.type]
        );
        console.log(`✅ Inserted product: "${product.name}" (${product.type}, ${product.price} Credits)`);
      }

      console.log('\n🎉 Marketplace setup complete!');
      console.log(`📊 Total products: ${seedProducts.length}`);
    } else {
      console.log(`\nℹ️  Products table already contains ${productCount} product(s). Skipping seed data.`);
      console.log('✅ Marketplace setup complete!');
    }

    console.log('\n' + '='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Marketplace setup failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await db.end(); // Close the connection pool
    process.exit(0);
  }
}

// Run the setup
setupMarketplace();
