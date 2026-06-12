const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

// @desc    Get seller dashboard
// @route   GET /api/seller/dashboard
// @access  Private (Seller)
exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const totalProducts = await Product.countDocuments({ seller: req.user.id });
    const totalOrders = await Order.countDocuments({
      'items.seller': req.user.id
    });
    const pendingOrders = await Order.countDocuments({
      'items.seller': req.user.id,
      status: { $in: ['pending', 'confirmed', 'preparing'] }
    });

    const sellerId = req.user._id;
    const revenue = await Order.aggregate([
      { $match: { 'items.seller': sellerId, 'payment.status': 'completed' } },
      { $unwind: '$items' },
      { $match: { 'items.seller': sellerId } },
      { $group: { _id: null, total: { $sum: '$items.totalPrice' } } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        businessName: user.sellerInfo?.businessName,
        isVerified: user.sellerInfo?.isVerified,
        rating: user.sellerInfo?.rating,
        totalProducts,
        totalOrders,
        pendingOrders,
        revenue: revenue[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Dashboard gətirilərkən xəta',
      error: error.message
    });
  }
};

// @desc    Get seller orders
// @route   GET /api/seller/orders
// @access  Private (Seller)
exports.getSellerOrders = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = { 'items.seller': req.user.id };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('buyer', 'firstName lastName phone')
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sifarişlər gətirilərkən xəta',
      error: error.message
    });
  }
};

// @desc    Update seller profile
// @route   PUT /api/seller/profile
// @access  Private (Seller)
exports.updateSellerProfile = async (req, res) => {
  try {
    const { businessName, businessDescription, taxNumber } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          'sellerInfo.businessName': businessName,
          'sellerInfo.businessDescription': businessDescription,
          'sellerInfo.taxNumber': taxNumber
        }
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Satici profili yeniləndi',
      sellerInfo: user.sellerInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Profil yenilənərkən xəta',
      error: error.message
    });
  }
};