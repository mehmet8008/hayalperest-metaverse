import express from 'express';
import { getAllProducts, purchaseProduct, getInventory, useItem, equipItem } from '../controllers/productController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/products - Get all products
router.get('/', getAllProducts);

// GET /api/products/inventory - Get user's inventory (protected route)
router.get('/inventory', authMiddleware, getInventory);

// POST /api/products/buy - Purchase a product (protected route)
router.post('/buy', authMiddleware, purchaseProduct);

// POST /api/products/use - Use an item from inventory (protected route)
router.post('/use', authMiddleware, useItem);

// POST /api/products/equip - Equip an item (protected route)
router.post('/equip', authMiddleware, equipItem);

export default router;
