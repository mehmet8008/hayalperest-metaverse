import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// .env dosyasını oku
dotenv.config();

// Veritabanı bağlantı havuzunu oluştur ve "db" adıyla dışarı aktar (export)
export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Bağlantıyı test edelim (Terminalde görmek için)
db.getConnection()
  .then((connection) => {
    console.log('✅ TiDB (MySQL) Veritabanına Başarıyla Bağlandı!');
    connection.release();
  })
  .catch((err) => {
    console.error('❌ Veritabanı Bağlantı Hatası:', err.message);
  });