const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const createNotification = require('../utils/createNotification');
const deductOrderStock = require('../utils/deductOrderStock');
const { computeOrderDelivery } = require('../utils/computeOrderDelivery');

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
  const originItems = [];
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

    if (product.region) {
      originItems.push({
        productLocation: product.location,
        sellerId: product.seller,
        regionId: product.region
      });
    }

    // Stock is NOT deducted here. It is deducted atomically at payment success
    // (card → confirmPayment/webhook) or delivery (cash) via deductOrderStock().
    // The check above is a friendly pre-validation only.
  }

  // Distance-based delivery to the buyer's EXACT (geocoded) destination.
  // Snapshotted, immutable. Sum per distinct origin region.
  let delivery;
  try {
    delivery = await computeOrderDelivery(originItems, {
      destRegionId: deliveryAddress?.region,
      destStreet: deliveryAddress?.street,
      destLocation: deliveryAddress?.location || deliveryAddress?.coordinates
    });
  } catch (e) {
    if (e.message === 'DEST_GEOCODE_FAILED') {
      throw new ApiError(400, 'Çatdırılma ünvanını xəritədə tapmaq mümkün olmadı. Zəhmət olmasa ünvanı daha dəqiq daxil edin.');
    }
    throw new ApiError(400, 'Çatdırılma məsafəsini hesablamaq üçün ünvan məlumatları tam deyil.');
  }
  // Persist the resolved exact destination point on the order.
  deliveryAddress.coordinates = delivery.destLocation;
  const deliveryFee = delivery.price;
  const totalAmount = subtotal + deliveryFee;

  // Financial ledger snapshot (immutable after creation). Commission default 0%.
  // courierEarning = distance-based delivery price (no free delivery → no base subsidy).
  const platformCommissionRate = Number(process.env.PLATFORM_COMMISSION_RATE || 0);
  const round2 = (n) => Math.round(n * 100) / 100;
  const platformFee = round2(subtotal * platformCommissionRate);
  const payout = {
    productSubtotal: subtotal,
    deliveryFee,
    platformCommissionRate,
    platformFee,
    sellerEarning: round2(subtotal - platformFee),
    courierEarning: deliveryFee,
    sellerPayoutStatus: 'pending',
    courierPayoutStatus: 'pending'
  };

  // Sifariş yarat
  const order = await Order.create({
    buyer: req.user.id,
    items: orderItems,
    subtotal,
    deliveryFee,
    delivery,
    totalAmount,
    deliveryAddress,
    payment: {
      method: paymentMethod,
      status: 'pending'
    },
    payout,
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

// Çatdırılma haqqının ön qiymətləndirilməsi (ödənişdən əvvəl göstərmək üçün)
// POST /api/orders/estimate-delivery  (Buyer) — backend hesablayır, frontend qiymət göndərmir
exports.estimateDelivery = asyncHandler(async (req, res) => {
  const { region, street, location } = req.body;
  if (!region) {
    throw new ApiError(400, 'Region tələb olunur');
  }

  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product', 'region location seller');
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Səbətiniz boşdur');
  }

  const originItems = cart.items
    .filter((item) => item.product?.region)
    .map((item) => ({
      productLocation: item.product.location,
      sellerId: item.product.seller,
      regionId: item.product.region
    }));

  let delivery;
  try {
    delivery = await computeOrderDelivery(originItems, {
      destRegionId: region,
      destStreet: street,
      destLocation: location
    });
  } catch (e) {
    if (e.message === 'DEST_GEOCODE_FAILED') {
      throw new ApiError(400, 'Çatdırılma ünvanını xəritədə tapmaq mümkün olmadı. Zəhmət olmasa ünvanı daha dəqiq daxil edin.');
    }
    throw new ApiError(400, 'Çatdırılma məsafəsini hesablamaq üçün ünvan məlumatları tam deyil.');
  }

  res.status(200).json({
    success: true,
    deliveryFee: delivery.price,
    distanceKm: delivery.distanceKm,
    durationMinutes: delivery.durationMinutes,
    destinationLocation: delivery.destLocation
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
    // Earnings become payable once delivered (payment is paid by this point).
    if (order.payout) {
      if (order.payout.sellerPayoutStatus === 'pending') order.payout.sellerPayoutStatus = 'available';
      if (order.payout.courierPayoutStatus === 'pending') order.payout.courierPayoutStatus = 'available';
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

// Kuryeri qiymətləndir (order-level — məhsul rəyindən ayrı)
// POST /api/orders/:id/courier-review  (Buyer)
exports.addCourierReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    throw new ApiError(400, 'Reytinq 1 ilə 5 arasında olmalıdır');
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new ApiError(404, 'Sifariş tapılmadı');
  }
  if (order.buyer.toString() !== req.user.id) {
    throw new ApiError(403, 'Bu sifarişi qiymətləndirmək icazəniz yoxdur');
  }
  if (order.status !== 'delivered' || order.payment.status !== 'paid') {
    throw new ApiError(400, 'Kuryer yalnız çatdırılmış və ödənilmiş sifariş üçün qiymətləndirilə bilər');
  }
  if (!order.courier) {
    throw new ApiError(400, 'Bu sifariş üçün kuryer təyin olunmayıb');
  }
  if (order.deliveryReview && order.deliveryReview.rating) {
    throw new ApiError(400, 'Bu sifariş üçün kuryeri artıq qiymətləndirmisiniz');
  }

  order.deliveryReview = {
    rating: numericRating,
    comment: (comment || '').trim() || undefined,
    createdAt: new Date()
  };
  await order.save();

  // Recompute courier average safely (JS filter avoids the sanitizeFilter $exists trap;
  // divide-by-zero guarded so the rating can never become NaN).
  try {
    const courierOrders = await Order.find({ courier: order.courier });
    const ratings = courierOrders
      .map((o) => o.deliveryReview?.rating)
      .filter((r) => typeof r === 'number');
    const avg = ratings.length
      ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10
      : 0;
    await User.findByIdAndUpdate(order.courier, { 'courierInfo.rating': avg });
  } catch (aggErr) {
    console.error('Courier rating aggregation failed (review still saved):', aggErr.message);
  }

  res.status(201).json({
    success: true,
    message: 'Kuryer qiymətləndirildi',
    deliveryReview: order.deliveryReview
  });
});
