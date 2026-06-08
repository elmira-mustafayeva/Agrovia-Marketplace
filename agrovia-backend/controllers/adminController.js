const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');

// @desc    Get admin dashboard
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
exports.getDashboard = async (req, res) => {
  try {
    const stats = {
      users: {
        total: await User.countDocuments(),
        buyers: await User.countDocuments({ role: 'buyer' }),
        sellers: await User.countDocuments({ role: 'seller' }),
        couriers: await User.countDocuments({ role: 'courier' })
      },
      sellers: {
        pending: await User.countDocuments({ role: 'seller', isActive: false })
      },
      couriers: {
        pending: await User.countDocuments({ role: 'courier', isActive: false })
      },
      products: {
        total: await Product.countDocuments(),
        pending: await Product.countDocuments({ status: 'pending' }),
        active: await Product.countDocuments({ status: 'active' })
      },
      orders: {
        total: await Order.countDocuments(),
        pending: await Order.countDocuments({ status: 'pending' }),
        delivered: await Order.countDocuments({ status: 'delivered' })
      },
      revenue: 0
    };

    const revenue = await Order.aggregate([
      { $match: { 'payment.status': 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    stats.revenue = revenue[0]?.total || 0;

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Dashboard gətirilərkən xəta',
      error: error.message
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      users,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İstifadəçilər gətirilərkən xəta',
      error: error.message
    });
  }
};

// @desc    Toggle user status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'İstifadəçi tapılmadı'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `İstifadəçi ${user.isActive ? 'aktiv' : 'deaktiv'} edildi`,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Status yenilənərkən xəta',
      error: error.message
    });
  }
};

// @desc    Verify seller
// @route   PUT /api/admin/sellers/:id/verify
// @access  Private (Admin)
exports.verifySeller = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'seller' },
      { 'sellerInfo.isVerified': true, isActive: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Satici tapılmadı'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Satici təsdiqləndi',
      sellerInfo: user.sellerInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Təsdiqlənərkən xəta',
      error: error.message
    });
  }
};

// @desc    Approve seller or courier account
// @route   PUT /api/admin/users/:id/approve
// @access  Private (Admin)
exports.approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'İstifadəçi tapılmadı'
      });
    }

    if (!['seller', 'courier'].includes(user.role)) {
      return res.status(400).json({
        success: false,
        message: 'Yalnız satici və kuryer təsdiqlənə bilər'
      });
    }

    user.isActive = true;
    if (user.role === 'seller') {
      user.sellerInfo = user.sellerInfo || {};
      user.sellerInfo.isVerified = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `${user.role === 'seller' ? 'Satici' : 'Kuryer'} təsdiqləndi`,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İstifadəçi təsdiqlənərkən xəta',
      error: error.message
    });
  }
};

// @desc    Get pending products
// @route   GET /api/admin/products/pending
// @access  Private (Admin)
exports.getPendingProducts = async (req, res) => {
  try {
    const products = await Product.find({ status: 'pending' })
      .populate('seller', 'firstName lastName sellerInfo.businessName')
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Məhsullar gətirilərkən xəta',
      error: error.message
    });
  }
};

// @desc    Approve/Reject product
// @route   PUT /api/admin/products/:id/approve
// @access  Private (Admin)
exports.approveProduct = async (req, res) => {
  try {
    const { status } = req.body; // 'active' or 'rejected'

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Məhsul tapılmadı'
      });
    }

    res.status(200).json({
      success: true,
      message: `Məhsul ${status === 'active' ? 'təsdiqləndi' : 'rədd edildi'}`,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Məhsul yenilənərkən xəta',
      error: error.message
    });
  }
};

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private (Admin)
exports.getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('buyer', 'firstName lastName phone')
      .populate('courier', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      orders,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sifarişlər gətirilərkən xəta',
      error: error.message
    });
  }
};

// @desc    Assign courier to order
// @route   PUT /api/admin/orders/:id/assign-courier
// @access  Private (Admin)
exports.assignCourier = async (req, res) => {
  try {
    const { courierId } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        courier: courierId,
        status: 'out_for_delivery',
        assignedAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sifariş tapılmadı'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Kuryer təyin edildi',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kuryer təyin edilərkən xəta',
      error: error.message
    });
  }
};