const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Public platform statistics (counts only — no sensitive data)
// @route   GET /api/stats
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
  const [users, products, orders] = await Promise.all([
    User.countDocuments({ isActive: true, role: { $ne: 'admin' } }),
    Product.countDocuments({ status: 'active' }),
    Order.countDocuments(),
  ]);

  res.json({ success: true, stats: { users, products, orders } });
}));

module.exports = router;
