const express = require('express');
const router = express.Router();
const { getDashboard, getSellerOrders, updateSellerProfile } = require('../controllers/sellerController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, authorize('seller'), getDashboard);
router.get('/orders', protect, authorize('seller'), getSellerOrders);
router.put('/profile', protect, authorize('seller'), updateSellerProfile);

module.exports = router;