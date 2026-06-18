const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const createNotification = require('../utils/createNotification');
const deductOrderStock = require('../utils/deductOrderStock');

// Sifariş yarat
exports.createOrder = asyncHandler(async (req, res) => {
  const { deliveryAddress, paymentMethod, notes } = req.body;

  // Səbəti tap
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Səbətiniz boşdur');
  }

  // Səbətdəki məhsulları yoxla
  const orderItems = [];
  let subtotal = 0;

  for (const item of cart.items) {
    const product = await Product.findById(item.product._id);

    if (!product || product.status !== 'active') {
      throw new ApiError(400, `${item.product.name} artıq satışda deyil`);
    }

    if (product.stockQuantity < item.quantity) {
      throw new ApiError(400, `${product.name} üçün stokda kifayət qədər məhsul yoxdur`);
    }

    const totalPrice = item.price * item.quantity;
    subtotal += totalPrice;

    orderItems.push({
      product: product._id,
      seller: product.seller,
      name: product.name,
      quantity: item.quantity,
      price: item.price,
      unit: product.unit,
      totalPrice
    });

    // Stock is NOT deducted here. It is deducted atomically at payment success
    // (card → confirmPayment/webhook) or delivery (cash) via deductOrderStock().
    // The check above is a friendly pre-validation only.
  }

  // Çatdırılma haqqı (müvəqqəti olaraq 5 AZN)
  const deliveryFee = subtotal >= 50 ? 0 : 5;
  const totalAmount = subtotal + deliveryFee;

  // Sifariş yarat
  const order = await Order.create({
    buyer: req.user.id,
    items: orderItems,
    subtotal,
    deliveryFee,
    totalAmount,
    deliveryAddress,
    payment: {
      method: paymentMethod,
      status: 'pending'
    },
    notes,
    trackingHistory: [{
      status: 'pending',
      description: 'Sifariş qəbul edildi',
      timestamp: new Date()
    }]
  });

  // Səbəti təmizlə
  cart.items = [];
  await cart.save();

  // Notify each unique seller about the new order
  const uniqueSellerIds = [...new Set(orderItems.map(item => item.seller.toString()))];
  await Promise.all(
    uniqueSellerIds.map(sellerId =>
      createNotification({
        recipient: sellerId,
        sender: req.user.id,
        type: 'order',
        title: 'Yeni sifariş daxil oldu',
        message: `Yeni sifariş daxil oldu (ID: ${order._id}).`,
        relatedOrder: order._id
      })
    )
  );

  res.status(201).json({
    success: true,
    message: 'Sifariş uğurla yaradıldı',
    order
  });
});

// Alıcının sifarişləri
exports.getMyOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = { buyer: req.user.id };
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('items.product', 'name images')
      .populate('items.seller', 'firstName lastName sellerInfo.businessName')
      .populate('courier', 'firstName lastName courierInfo.vehicleType')
      .populate('deliveryAddress.region', 'name')
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

// Tək sifariş gətir
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('items.product', 'name images unit')
    .populate('items.seller', 'firstName lastName phone sellerInfo.businessName')
    .populate('courier', 'firstName lastName phone courierInfo')
    .populate('buyer', 'firstName lastName phone')
    .populate('deliveryAddress.region', 'name');

  if (!order) {
    throw new ApiError(404, 'Sifariş tapılmadı');
  }

  // Yalnız öz sifarişi, satici, kuryer və ya admin görə bilər
  const isAuthorized =
    order.buyer._id.toString() === req.user.id ||
    order.items.some(item => item.seller._id.toString() === req.user.id) ||
    (order.courier && order.courier._id.toString() === req.user.id) ||
    req.user.role === 'admin';

  if (!isAuthorized) {
    throw new ApiError(403, 'Bu sifarişi görmək icazəniz yoxdur');
  }

  res.status(200).json({
    success: true,
    order
  });
});

// Sifariş statusunu yenilə (Admin/Satici/Kuryer)
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, description } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Sifariş tapılmadı');
  }

  // Seller-specific guards
  if (req.user.role === 'seller') {
    const isSeller = order.items.some(
      (item) => item.seller.toString() === req.user.id.toString()
    );
    if (!isSeller) {
      throw new ApiError(403, 'Bu sifarişə icazəniz yoxdur.');
    }

    // Whitelist: seller may only advance through these exact transitions
    const SELLER_TRANSITIONS = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
    };
    const allowedTarget = SELLER_TRANSITIONS[order.status];
    if (!allowedTarget || status !== allowedTarget) {
      throw new ApiError(403, 'Satıcı bu status keçidini edə bilməz.');
    }

    // Card payment guard — backend source of truth
    if (
      status === 'confirmed' &&
      order.payment?.method === 'card' &&
      order.payment?.status !== 'paid'
    ) {
      throw new ApiError(400, 'Kart ödənişi tamamlanmadan sifariş təsdiqlənə bilməz.');
    }
  }

  // Status keçidlərini yoxla
  const validTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready'],
    ready: ['out_for_delivery'],
    out_for_delivery: ['delivered'],
    delivered: [],
    cancelled: [],
    returned: []
  };

  if (!validTransitions[order.status].includes(status)) {
    throw new ApiError(400, `Sifariş statusu ${order.status} -> ${status} keçidi mümkün deyil`);
  }

  order.status = status;

  // Xüsusi tarixlər
  if (status === 'out_for_delivery') {
    order.pickedUpAt = new Date();
  }
  if (status === 'delivered') {
    order.deliveredAt = new Date();
    if (order.payment.method === 'cash') {
      order.payment.status = 'paid';
      // Cash is collected on delivery → deduct stock now (idempotent, best-effort:
      // never block the delivery confirmation if stock math fails on this unused path).
      try {
        await deductOrderStock(order._id);
      } catch (stockErr) {
        console.error('Cash delivery stock deduction failed:', stockErr.message);
      }
    }
  }

  // Tracking tarixçəsi
  order.trackingHistory.push({
    status,
    description: description || `Status dəyişdirildi: ${status}`,
    timestamp: new Date()
  });

  await order.save();

  // Notify the buyer about every status change
  const statusMessages = {
    confirmed: 'Sifarişiniz satıcı tərəfindən təsdiqləndi',
    preparing: 'Sifarişiniz hazırlanmağa başladı',
    ready: 'Sifarişiniz hazırdır, kuryer gözlənilir',
    out_for_delivery: 'Sifarişiniz kuryer tərəfindən çatdırılmaya götürüldü',
    delivered: 'Sifarişiniz uğurla çatdırıldı',
    cancelled: 'Sifarişiniz ləğv edildi',
    returned: 'Sifarişiniz geri qaytarıldı'
  };
  const notifType = (status === 'out_for_delivery' || status === 'delivered') ? 'delivery' : 'order';

  await createNotification({
    recipient: order.buyer,
    sender: req.user._id,
    type: notifType,
    title: statusMessages[status] || 'Sifariş statusu dəyişdi',
    message: description || statusMessages[status] || `Sifarişin statusu "${status}" olaraq yeniləndi.`,
    relatedOrder: order._id
  });

  res.status(200).json({
    success: true,
    message: 'Sifariş statusu yeniləndi',
    order
  });
});
