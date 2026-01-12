import { db } from '../config/db.js';

async function updateProductVisuals() {
  try {
    console.log('\n' + '='.repeat(50));
    console.log('🎨 Starting Product Visuals Update...');
    console.log('='.repeat(50) + '\n');

    // Update Astronaut Lamp
    const [astronautResult] = await db.query(
      `UPDATE products 
       SET image_url = ? 
       WHERE name = 'Astronaut Lamp'`,
      ['https://images.unsplash.com/photo-1541873676-a18131494184?auto=format&fit=crop&w=600&q=80']
    );
    
    if (astronautResult.affectedRows > 0) {
      console.log('✅ Updated image for "Astronaut Lamp"');
    } else {
      console.log('⚠️  "Astronaut Lamp" not found in database');
    }

    // Update Neon Core Upgrade
    const [neonResult] = await db.query(
      `UPDATE products 
       SET image_url = ? 
       WHERE name = 'Neon Core Upgrade'`,
      ['https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80']
    );
    
    if (neonResult.affectedRows > 0) {
      console.log('✅ Updated image for "Neon Core Upgrade"');
    } else {
      console.log('⚠️  "Neon Core Upgrade" not found in database');
    }

    // Update Energy Drink
    const [energyResult] = await db.query(
      `UPDATE products 
       SET image_url = ? 
       WHERE name = 'Energy Drink'`,
      ['https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80']
    );
    
    if (energyResult.affectedRows > 0) {
      console.log('✅ Updated image for "Energy Drink"');
    } else {
      console.log('⚠️  "Energy Drink" not found in database');
    }

    console.log('\n🎉 Marketplace visuals upgraded!');
    console.log('\n' + '='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Product visuals update failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await db.end(); // Close the connection pool
    process.exit(0);
  }
}

// Run the update
updateProductVisuals();
