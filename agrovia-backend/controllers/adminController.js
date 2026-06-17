const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const createNotification = require('../utils/createNotification');

// @desc    Get admin dashboard
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
exports.getDashboard = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    buyerCount,
    sellerCount,
    courierCount,
    pendingSellers,
    pendingCouriers,
    totalProducts,
    pendingProducts,
    activeProducts,
    totalOrders,
    pendingOrders,
    deliveredOrders,
    revenueResult
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'buyer' }),
    User.countDocuments({ role: 'seller' }),
    User.countDocuments({ role: 'courier' }),
    User.countDocuments({ role: 'seller', isActive: false }),
    User.countDocuments({ role: 'courier', isActive: false }),
    Product.countDocuments(),
    Product.countDocuments({ status: 'pending' }),
    Product.countDocuments({ status: 'active' }),
    Order.countDocuments(),
    Order.countDocuments({ status: 'pending' }),
    Order.countDocuments({ status: 'delivered' }),
    Order.aggregate([
      { $match: { 'payment.status': 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])
  ]);

  res.status(200).json({
    success: true,
    stats: {
      users: {
        total: totalUsers,
        buyers: buyerCount,
        sellers: sellerCount,
        couriers: courierCount
      },
      sellers: { pending: pendingSellers },
      couriers: { pending: pendingCouriers },
      products: {
        total: totalProducts,
        pending: pendingProducts,
        active: activeProducts
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        delivered: deliveredOrders
      },
      revenue: revenueResult[0]?.total || 0
    }
  });
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;

  const query = {};
  if (role) query.role = role;
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { firstName: { $regex: escapedSearch, $options: 'i' } },
      { lastName: { $regex: escapedSearch, $options: 'i' } },
      { email: { $regex: escapedSearch, $options: 'i' } }
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    User.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    users,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit)
  });
});

// @desc    Toggle user status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
exports.toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'İstifadəçi tapılmadı');
  }

  if (user.role === 'admin') {
    throw new ApiError(400, 'Admin deaktiv edilə bilməz');
  }

  user.isActive = !user.isActive;
  await user.save();

  res.status(200).json({
    success: true,
    message: `İstifadəçi ${user.isActive ? 'aktiv' : 'deaktiv'} edildi`,
    user
  });
});

// @desc    Verify seller
// @route   PUT /api/admin/sellers/:id/verify
// @access  Private (Admin)
exports.verifySeller = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'seller' },
    { 'sellerInfo.isVerified': true, isActive: true },
    { new: true }
  );

  if (!user) {
    throw new ApiError(404, 'Satici tapılmadı');
  }

  await createNotification({
    recipient: user._id,
    sender: req.user._id,
    type: 'approval',
    title: 'Satıcı hesabınız doğrulandı',
    message: 'Admin tərəfindən satıcı hesabınız doğrulandı. Artıq məhsul əlavə edə bilərsiniz.'
  });

  res.status(200).json({
    success: true,
    message: 'Satici təsdiqləndi',
    sellerInfo: user.sellerInfo
  });
});

// @desc    Approve seller or courier account
// @route   PUT /api/admin/users/:id/approve
// @access  Private (Admin)
exports.approveUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'İstifadəçi tapılmadı');
  }

  if (!['seller', 'courier'].includes(user.role)) {
    throw new ApiError(400, 'Yalnız satici və kuryer təsdiqlənə bilər');
  }

  user.isActive = true;
  if (user.role === 'seller') {
    user.sellerInfo = user.sellerInfo || {};
    user.sellerInfo.isVerified = true;
  }

  await user.save();

  await createNotification({
    recipient: user._id,
    sender: req.user._id,
    type: 'approval',
    title: user.role === 'seller' ? 'Satıcı hesabınız təsdiqləndi' : 'Kuryer hesabınız təsdiqləndi',
    message: user.role === 'seller'
      ? 'Admin tərəfindən satıcı hesabınız təsdiqləndi. Artıq məhsul əlavə edə bilərsiniz.'
      : 'Admin tərəfindən kuryer hesabınız təsdiqləndi. Artıq sifariş qəbul edə bilərsiniz.'
  });

  res.status(200).json({
    success: true,
    message: `${user.role === 'seller' ? 'Satici' : 'Kuryer'} təsdiqləndi`,
    user
  });
});

// @desc    Get pending products
// @route   GET /api/admin/products/pending
// @access  Private (Admin)
exports.getPendingProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ status: 'pending' })
    .populate('seller', 'firstName lastName sellerInfo.businessName sellerInfo.saleType')
    .populate('category', 'name')
    .populate('region', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: products.length,
    products
  });
});

// @desc    Approve/Reject product
// @route   PUT /api/admin/products/:id/approve
// @access  Private (Admin)
exports.approveProduct = asyncHandler(async (req, res) => {
  const { status } = req.body;

  // Admin may only approve (active) or reject (rejected). Anything else — including
  // a missing/misnamed field — is a clean 400 instead of a silent no-op.
  const ALLOWED_STATUSES = ['active', 'rejected'];
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new ApiError(400, "Status yalnız 'active' və ya 'rejected' ola bilər");
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Məhsul tapılmadı');
  }

  // save() runs schema validators (enum) — the status is guaranteed to persist correctly.
  product.status = status;
  await product.save();

  // Notify the seller about the decision (createNotification never throws).
  await createNotification({
    recipient: product.seller,
    sender: req.user._id,
    type: 'product',
    title: status === 'active' ? 'Məhsulunuz təsdiqləndi' : 'Məhsulunuz rədd edildi',
    message: status === 'active'
      ? `"${product.name}" adlı məhsulunuz təsdiqləndi və artıq satışdadır.`
      : `"${product.name}" adlı məhsulunuz admin tərəfindən rədd edildi.`,
    relatedProduct: product._id
  });

  res.status(200).json({
    success: true,
    message: `Məhsul ${status === 'active' ? 'təsdiqləndi' : 'rədd edildi'}`,
    product
  });
});

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private (Admin)
exports.getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('buyer', 'firstName lastName phone')
      .populate('courier', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Order.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    orders,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit)
  });
});

// @desc    Assign courier to order
// @route   PUT /api/admin/orders/:id/assign-courier
// @access  Private (Admin)
exports.assignCourier = asyncHandler(async (req, res) => {
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
    throw new ApiError(404, 'Sifariş tapılmadı');
  }

  res.status(200).json({
    success: true,
    message: 'Kuryer təyin edildi',
    order
  });
});
