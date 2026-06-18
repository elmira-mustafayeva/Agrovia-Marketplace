const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get seller dashboard
// @route   GET /api/seller/dashboard
// @access  Private (Seller)
exports.getDashboard = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;

  const [user, totalProducts, totalOrders, pendingOrders, revenue] = await Promise.all([
    User.findById(req.user.id),
    Product.countDocuments({ seller: req.user.id }),
    Order.countDocuments({ 'items.seller': req.user.id }),
    Order.countDocuments({
      'items.seller': req.user.id,
      status: { $in: ['pending', 'confirmed', 'preparing'] }
    }),
    Order.aggregate([
      { $match: { 'items.seller': sellerId, 'payment.status': 'paid' } },
      { $unwind: '$items' },
      { $match: { 'items.seller': sellerId } },
      { $group: { _id: null, total: { $sum: '$items.totalPrice' } } }
    ])
  ]);

  res.status(200).json({
    success: true,
    stats: {
      businessName: user.sellerInfo?.businessName,
      isVerified: user.sellerInfo?.isVerified,
      rating: user.sellerInfo?.rating,
      saleType: user.sellerInfo?.saleType || 'both',
      totalProducts,
      totalOrders,
      pendingOrders,
      revenue: revenue[0]?.total || 0
    }
  });
});

// @desc    Get seller orders
// @route   GET /api/seller/orders
// @access  Private (Seller)
exports.getSellerOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = { 'items.seller': req.user.id };
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('buyer', 'firstName lastName phone')
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit)),
    Order.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    totalPages: Math.ceil(total / Number(limit)),
    currentPage: Number(page),
    orders
  });
});

// @desc    Get reviews written for this seller's products
// @route   GET /api/seller/reviews
// @access  Private (Seller)
exports.getSellerReviews = asyncHandler(async (req, res) => {
  // Authorization is backend-enforced: only reviews of THIS seller's products.
  const sellerProductIds = (await Product.find({ seller: req.user.id }).select('_id')).map((p) => p._id);

  // trusted() is required — sanitizeFilter (config/database.js) would neutralize a raw $in.
  const reviews = await Review.find({ product: mongoose.trusted({ $in: sellerProductIds }) })
    .populate('product', 'name images seller')
    .populate('user', 'firstName lastName avatar')
    .populate('order', 'orderNumber')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: reviews.length,
    reviews
  });
});

// @desc    Update seller profile
// @route   PUT /api/seller/profile
// @access  Private (Seller)
exports.updateSellerProfile = asyncHandler(async (req, res) => {
  const { businessName, businessDescription, taxNumber, saleType } = req.body;

  const updateFields = {
    'sellerInfo.businessName': businessName,
    'sellerInfo.businessDescription': businessDescription,
    'sellerInfo.taxNumber': taxNumber
  };

  if (saleType && ['retail', 'wholesale', 'both'].includes(saleType)) {
    updateFields['sellerInfo.saleType'] = saleType;
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Satici profili yeniləndi',
    sellerInfo: user.sellerInfo
  });
});
