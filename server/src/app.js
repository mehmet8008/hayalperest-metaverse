import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './config/db.js'; // db importunun doğru olduğundan emin olalım
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import productRoutes from './routes/productRoutes.js';
import missionRoutes from './routes/missionRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Load environment variables
dotenv.config();

const app = express();

// --- GÜVENLİK AYARI (CORS) ---
// Dynamic CORS origin based on environment variable
// Allows flexible deployment with different frontend URLs
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

console.log(`🌐 CORS configured for origin: ${allowedOrigin}`);

app.use(express.json());

// --- AUTH ROUTES ---
app.use('/api/auth', authRoutes);

// --- CHAT ROUTES ---
app.use('/api/chat', chatRoutes);

// --- PRODUCT ROUTES ---
app.use('/api/products', productRoutes);

// --- MISSION ROUTES ---
app.use('/api/missions', missionRoutes);

// --- LEADERBOARD ROUTES ---
app.use('/api/leaderboard', leaderboardRoutes);

// --- MEDIA ROUTES ---
app.use('/api/media', mediaRoutes);

// --- ADMIN ROUTES ---
app.use('/api/admin', adminRoutes);

// --- SAĞLIK KONTROLÜ (TEST LİNKİ) ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'Backend ve HayalPerest sunucusu aktif!', 
    timestamp: new Date() 
  });
});

// --- BASİT BİR DB TEST ROTASI ---
app.get('/api/db-test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json({ message: 'Veritabanı bağlantısı başarılı!', result: rows[0].result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Veritabanı hatası', error: error.message });
  }
});

export default app;