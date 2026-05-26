const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');

// Sifariş yarat
exports.createOrder = async (req, res) => {
  try {
    const {
      deliveryAddress,
      paymentMethod,
      notes
    } = req.body;

    // Səbəti tap
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Səbətiniz boşdur'
      });
    }

    // Səbətdəki məhsulları yoxla
    const orderItems = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);

      if (!product || product.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `${item.product.name} artıq satışda deyil`
        });
      }

      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.name} üçün stokda kifayət qədər məhsul yoxdur`
        });
      }

      const totalPrice = product.price * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        product: product._id,
        seller: product.seller,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        unit: product.unit,
        totalPrice
      });

      // Stoku azalt
      product.stockQuantity -= item.quantity;
      product.totalSales += item.quantity;
      await product.save();
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

    res.status(201).json({
      success: true,
      message: 'Sifariş uğurla yaradıldı',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sifariş yaradılarkən xəta',
      error: error.message
    });
  }
};

// Alıcının sifarişləri
exports.getMyOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { buyer: req.user.id };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('items.product', 'name images')
      .populate('items.seller', 'firstName lastName sellerInfo.businessName')
      .populate('courier', 'firstName lastName courierInfo.vehicleType')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
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

// Tək sifariş gətir
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name images unit')
      .populate('items.seller', 'firstName lastName phone sellerInfo.businessName')
      .populate('courier', 'firstName lastName phone courierInfo')
      .populate('buyer', 'firstName lastName phone')
      .populate('deliveryAddress.region', 'name');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sifariş tapılmadı'
      });
    }

    // Yalnız öz sifarişi, satici, kuryer və ya admin görə bilər
    const isAuthorized = 
      order.buyer._id.toString() === req.user.id ||
      order.items.some(item => item.seller._id.toString() === req.user.id) ||
      (order.courier && order.courier._id.toString() === req.user.id) ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Bu sifarişi görmək icazəniz yoxdur'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sifariş gətirilərkən xəta',
      error: error.message
    });
  }
};

// Sifariş statusunu yenilə (Admin/Satici/Kuryer)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, description } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sifariş tapılmadı'
      });
    }

    // Status keçidlərini yoxla
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready'],
      ready: ['shipped'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
      returned: []
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Sifariş statusu ${order.status} -> ${status} keçidi mümkün deyil`
      });
    }

    order.status = status;

    // Xüsusi tarixlər
    if (status === 'shipped') {
      order.pickedUpAt = new Date();
    }
    if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.payment.status = 'completed';
    }

    // Tracking tarixçəsi
    order.trackingHistory.push({
      status,
      description: description || `Status dəyişdirildi: ${status}`,
      timestamp: new Date()
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Sifariş statusu yeniləndi',
      order
    })
    } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sifariş statusu yenilənərkən xəta',
        error: error.message
    });
    }   
};
