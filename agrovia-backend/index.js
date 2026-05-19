const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Route fayllarını import et
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const regionRoutes = require('./routes/regions');
const deliveryRoutes = require('./routes/delivery');

// Error handler
const errorHandler = require('./middleware/errorHandler');

// Environment variables yüklə
dotenv.config();

// Express app yarat
const app = express();

// Middleware-lər
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// DNS fix (SRV problem üçün)

await setServers(["1.1.1.1", "8.8.8.8"]);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static fayllar (uploads qovluğu varsa)
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Agrovia API işləyir!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/delivery', deliveryRoutes);

// 404 - Route tapılmadı
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint tapılmadı'
  });
});

// Error handler (sonuncu middleware olmalıdır)
app.use(errorHandler);

// MongoDB bağlantısı
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // MongoDB 6+ üçün bu parametrlər default olaraq təyin olunub
    });
    console.log(`✅ MongoDB Bağlantısı Uğurlu: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Bağlantı Xətası: ${error.message}`);
    process.exit(1);
  }
};

// Serveri başlat
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda işləyir`);
    console.log(`API URL: http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();

// Təhlükəsiz bağlantı (process dayandırılanda)
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});