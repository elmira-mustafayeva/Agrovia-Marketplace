const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');
const { apiLimiter, conversationLimiter } = require('./middleware/rateLimiters');
const initSocket = require('./socket');

// ENV
dotenv.config();

// DNS fix (SRV)
dns.setServers(['1.1.1.1', '8.8.8.8']);

// Express app yarat
const app = express();

// Security middleware
app.use(helmet());
app.use(morgan('dev'));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5175',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
// The verify callback saves the raw Buffer for the Stripe webhook route only.
// All other routes continue to receive a fully-parsed JSON body — nothing changes.
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith('/api/payments/webhook')) {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ extended: true }));

// Rate limit — general API budget (conversations are skipped here; they use their own).
// OPTIONS preflight is excluded so CORS is never throttled.
app.use('/api', apiLimiter);

// Route faylları
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
const sellerRoutes = require('./routes/seller');
const courierRoutes = require('./routes/courier');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payments');
const conversationRoutes = require('./routes/conversations');

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Agrovia API işləyir!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API sağlamlıq yoxlanışı OK',
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
app.use('/api/seller', sellerRoutes);
app.use('/api/courier', courierRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/conversations', conversationLimiter, conversationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint tapılmadı'
  });
});

// Error handler (ən sonda olmalıdır)
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Use centralized DB connection helper
const connectDB = require('./config/database');

// Server start
const PORT = process.env.PORT || 5000;

// Wrap the Express app in an HTTP server so Socket.io can share the same port.
// All existing middleware/routes are unchanged — only the listen mechanism differs.
const server = http.createServer(app);
initSocket(server);

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`Server ${PORT} portunda işləyir`);
    console.log(`API URL: http://localhost:${PORT}`);
    console.log(`Socket.io: aktiv`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();

// Global error catch
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});