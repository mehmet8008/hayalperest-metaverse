import { db } from '../config/db.js';

export const getAllProducts = async (req, res) => {
  try {
    // Query all products from the database
    const [products] = await db.query(
      'SELECT id, name, description, price, image_url, type, created_at FROM products ORDER BY created_at DESC'
    );

    return res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      count: products.length,
      products: products
    });

  } catch (error) {
    console.error('Get products error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching products',
      error: error.message
    });
  }
};

export const getInventory = async (req, res) => {
  try {
    // Get userId from middleware (set by authMiddleware)
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Find user's avatar
    const [avatars] = await db.query(
      'SELECT id FROM avatars WHERE user_id = ?',
      [userId]
    );

    if (avatars.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found for this user'
      });
    }

    const avatarId = avatars[0].id;

    // Query inventory table for all items belonging to this avatar
    const [inventory] = await db.query(
      'SELECT id, item_name, item_type, image_url, created_at FROM inventory WHERE avatar_id = ? ORDER BY created_at DESC',
      [avatarId]
    );

    return res.status(200).json({
      success: true,
      inventory: inventory
    });

  } catch (error) {
    console.error('Get inventory error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching inventory',
      error: error.message
    });
  }
};

export const useItem = async (req, res) => {
  try {
    // Get userId from middleware (set by authMiddleware)
    const userId = req.user?.id;
    const { inventoryId, itemType } = req.body;

    // Validate required fields
    if (!inventoryId) {
      return res.status(400).json({
        success: false,
        message: 'Inventory ID is required'
      });
    }

    if (!itemType) {
      return res.status(400).json({
        success: false,
        message: 'Item type is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Find user's avatar
      const [avatars] = await connection.query(
        'SELECT id FROM avatars WHERE user_id = ?',
        [userId]
      );

      if (avatars.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Avatar not found for this user'
        });
      }

      const avatarId = avatars[0].id;

      // Verify the inventory item belongs to this user's avatar
      const [inventoryItems] = await connection.query(
        'SELECT id, item_name, item_type FROM inventory WHERE id = ? AND avatar_id = ?',
        [inventoryId, avatarId]
      );

      if (inventoryItems.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found or does not belong to user'
        });
      }

      const inventoryItem = inventoryItems[0];

      // Verify item type matches
      if (inventoryItem.item_type !== itemType) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'Item type mismatch'
        });
      }

      let itemRemoved = false;
      let newStats = {};
      let message = '';
      let levelUp = false;

      // Handle DIGITAL items (specifically Energy Drink)
      if (itemType === 'DIGITAL' && inventoryItem.item_name === 'Energy Drink') {
        // Find the user's avatar_stats for 'energy'
        const [energyRows] = await connection.query(
          'SELECT id, value FROM avatar_stats WHERE avatar_id = ? AND key_name = ?',
          [avatarId, 'energy']
        );

        let currentEnergy = 0;
        let energyStatId = null;

        if (energyRows.length === 0) {
          // If energy stat doesn't exist, create it
          const [insertResult] = await connection.query(
            'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
            [avatarId, 'PHYSICAL', 'energy', '20']
          );
          currentEnergy = 20;
          energyStatId = insertResult.insertId;
        } else {
          currentEnergy = parseInt(energyRows[0].value, 10);
          energyStatId = energyRows[0].id;
        }

        // Get current xp and level stats
        const [xpRows] = await connection.query(
          'SELECT id, value FROM avatar_stats WHERE avatar_id = ? AND key_name = ?',
          [avatarId, 'xp']
        );

        const [levelRows] = await connection.query(
          'SELECT id, value FROM avatar_stats WHERE avatar_id = ? AND key_name = ?',
          [avatarId, 'level']
        );

        let currentXp = 0;
        let xpStatId = null;
        let currentLevel = 1;
        let levelStatId = null;

        if (xpRows.length > 0) {
          currentXp = parseInt(xpRows[0].value, 10);
          xpStatId = xpRows[0].id;
        }

        if (levelRows.length > 0) {
          currentLevel = parseInt(levelRows[0].value, 10);
          levelStatId = levelRows[0].id;
        }

        // Increase XP by 20
        const newXp = currentXp + 20;

        // Check for level up
        if (newXp >= 100) {
          levelUp = true;
          const remainingXp = newXp - 100;
          const newLevel = currentLevel + 1;
          const newEnergy = 100; // Fill energy to 100 on level up

          // Update XP (new_xp - 100)
          if (xpStatId) {
            await connection.query(
              'UPDATE avatar_stats SET value = ? WHERE id = ?',
              [String(remainingXp), xpStatId]
            );
          } else {
            await connection.query(
              'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
              [avatarId, 'PROGRESSION', 'xp', String(remainingXp)]
            );
          }

          // Update level
          if (levelStatId) {
            await connection.query(
              'UPDATE avatar_stats SET value = ? WHERE id = ?',
              [String(newLevel), levelStatId]
            );
          } else {
            await connection.query(
              'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
              [avatarId, 'PROGRESSION', 'level', String(newLevel)]
            );
          }

          // Update energy to 100
          await connection.query(
            'UPDATE avatar_stats SET value = ? WHERE id = ?',
            [String(newEnergy), energyStatId]
          );

          message = 'Energy Drink consumed! Level Up! Energy fully restored!';
        } else {
          // No level up - just increase energy by 20 (cap at 100) and xp by 20
          const newEnergy = Math.min(currentEnergy + 20, 100);

          // Update energy
          await connection.query(
            'UPDATE avatar_stats SET value = ? WHERE id = ?',
            [String(newEnergy), energyStatId]
          );

          // Update XP
          if (xpStatId) {
            await connection.query(
              'UPDATE avatar_stats SET value = ? WHERE id = ?',
              [String(newXp), xpStatId]
            );
          } else {
            await connection.query(
              'INSERT INTO avatar_stats (avatar_id, stat_type, key_name, value) VALUES (?, ?, ?, ?)',
              [avatarId, 'PROGRESSION', 'xp', String(newXp)]
            );
          }

          message = 'Energy Drink consumed. Energy and XP restored!';
        }

        // Delete the item from inventory
        await connection.query(
          'DELETE FROM inventory WHERE id = ?',
          [inventoryId]
        );

        // Fetch all updated stats
        const [allStatsRows] = await connection.query(
          'SELECT key_name, value FROM avatar_stats WHERE avatar_id = ?',
          [avatarId]
        );

        allStatsRows.forEach(stat => {
          newStats[stat.key_name] = parseInt(stat.value, 10) || stat.value;
        });

        itemRemoved = true;

      } else if (itemType === 'PHYSICAL') {
        // For PHYSICAL items, don't delete - just return delivery message
        itemRemoved = false;
        message = 'Delivery status tracked.';

        // Get current stats (optional, for consistency)
        const [statsRows] = await connection.query(
          'SELECT key_name, value FROM avatar_stats WHERE avatar_id = ?',
          [avatarId]
        );

        statsRows.forEach(stat => {
          newStats[stat.key_name] = parseInt(stat.value, 10) || stat.value;
        });

      } else {
        // Unknown item type or item name
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'Item cannot be used or is not a consumable item'
        });
      }

      // Commit transaction
      await connection.commit();
      connection.release();

      // Return success response
      return res.status(200).json({
        success: true,
        message: message,
        stats: newStats,
        itemRemoved: itemRemoved,
        levelUp: levelUp
      });

    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Use item error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error while using item',
      error: error.message
    });
  }
};

export const equipItem = async (req, res) => {
  try {
    // Get userId from middleware (set by authMiddleware)
    const userId = req.user?.id;
    const { itemId, itemName } = req.body;

    // Validate required fields
    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required'
      });
    }

    if (!itemName) {
      return res.status(400).json({
        success: false,
        message: 'Item name is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Find user's avatar
    const [avatars] = await db.query(
      'SELECT id FROM avatars WHERE user_id = ?',
      [userId]
    );

    if (avatars.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found for this user'
      });
    }

    const avatarId = avatars[0].id;

    // Verify the inventory item belongs to this user's avatar
    const [inventoryItems] = await db.query(
      'SELECT id, item_name FROM inventory WHERE id = ? AND avatar_id = ?',
      [itemId, avatarId]
    );

    if (inventoryItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found or does not belong to user'
      });
    }

    // Determine background based on item name
    let newBg = null;
    
    if (itemName === 'Astronaut Lamp') {
      newBg = 'SPACE_STATION';
    } else if (itemName === 'Neon Core Upgrade') {
      newBg = 'CYBER_CITY';
    } else {
      return res.status(400).json({
        success: false,
        message: 'This item cannot be equipped'
      });
    }

    // Update avatars table with current_bg
    await db.query(
      'UPDATE avatars SET current_bg = ? WHERE id = ?',
      [newBg, avatarId]
    );

    // Return success response
    return res.status(200).json({
      success: true,
      newBg: newBg
    });

  } catch (error) {
    console.error('Equip item error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error while equipping item',
      error: error.message
    });
  }
};

export const purchaseProduct = async (req, res) => {
  try {
    // Get userId from middleware (set by authMiddleware)
    const userId = req.user?.id;
    const { productId } = req.body;

    // Validate required fields
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Find user's avatar
      const [avatars] = await connection.query(
        'SELECT id FROM avatars WHERE user_id = ?',
        [userId]
      );

      if (avatars.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Avatar not found for this user'
        });
      }

      const avatarId = avatars[0].id;

      // Find the product
      const [products] = await connection.query(
        'SELECT id, name, price, image_url, type FROM products WHERE id = ?',
        [productId]
      );

      if (products.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const product = products[0];

      // Get current credits from avatar_stats
      const [creditsRows] = await connection.query(
        'SELECT value FROM avatar_stats WHERE avatar_id = ? AND key_name = ?',
        [avatarId, 'credits']
      );

      if (creditsRows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Credits stat not found for avatar'
        });
      }

      const currentCredits = parseInt(creditsRows[0].value, 10);
      const productPrice = parseInt(product.price, 10);

      // Check if user has sufficient credits
      if (currentCredits < productPrice) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'Insufficient funds',
          currentCredits: currentCredits,
          requiredCredits: productPrice
        });
      }

      // Calculate new credit balance
      const newCredits = currentCredits - productPrice;

      // Update avatar_stats: Decrease credits by price
      await connection.query(
        'UPDATE avatar_stats SET value = ? WHERE avatar_id = ? AND key_name = ?',
        [String(newCredits), avatarId, 'credits']
      );

      // Insert into inventory table
      await connection.query(
        'INSERT INTO inventory (avatar_id, item_name, item_type, image_url) VALUES (?, ?, ?, ?)',
        [avatarId, product.name, product.type, product.image_url]
      );

      // Commit transaction
      await connection.commit();
      connection.release();

      // Return success response with new credit balance
      return res.status(200).json({
        success: true,
        message: 'Product purchased successfully',
        product: {
          id: product.id,
          name: product.name,
          type: product.type
        },
        newCreditBalance: newCredits
      });

    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Purchase product error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error during purchase',
      error: error.message
    });
  }
};
