const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const createNotification = require('../utils/createNotification');
const deductOrderStock = require('../utils/deductOrderStock');

// @desc    Get courier dashboard
// @route   GET /api/courier/dashboard
// @access  Private (Courier)
exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const totalDeliveries = await Order.countDocuments({ courier: req.user.id });
    const pendingDeliveries = await Order.countDocuments({
      courier: req.user.id,
      status: 'out_for_delivery'
    });

    // Earnings from the order ledger (delivered orders only)
    const deliveredOrders = await Order.find({ courier: req.user.id, status: 'delivered' }).select('payout');
    let totalEarnings = 0;
    let availablePayout = 0;
    let paidPayout = 0;
    for (const o of deliveredOrders) {
      const earning = o.payout?.courierEarning || 0;
      totalEarnings += earning;
      if (o.payout?.courierPayoutStatus === 'available') availablePayout += earning;
      else if (o.payout?.courierPayoutStatus === 'paid') paidPayout += earning;
    }
    const round2 = (n) => Math.round(n * 100) / 100;

    res.status(200).json({
      success: true,
      stats: {
        vehicleType: user.courierInfo?.vehicleType,
        isAvailable: user.courierInfo?.isAvailable,
        rating: user.courierInfo?.rating,
        totalDeliveries,
        pendingDeliveries,
        completedDeliveries: deliveredOrders.length,
        totalEarnings: round2(totalEarnings),
        availablePayout: round2(availablePayout),
        paidPayout: round2(paidPayout)
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

// @desc    Get available orders for courier
// @route   GET /api/courier/available-orders
// @access  Private (Courier)
exports.getAvailableOrders = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const regions = user.courierInfo?.regions || [];

    // Region seçilməyibsə — boş siyahı + frontend üçün aydın səbəb
    if (regions.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        orders: [],
        reason: 'NO_REGIONS',
        message: 'Xidmət regionları seçilməyib. Sifarişləri görmək üçün xidmət regionlarınızı seçin.'
      });
    }

    const orders = await Order.find({
      status: 'ready',
      courier: null,
      // sanitizeFilter (config/database.js) wraps raw operators in $eq — trusted() bypasses it
      'deliveryAddress.region': mongoose.trusted({ $in: regions })
    })
      .populate('buyer', 'firstName lastName phone')
      .populate('items.product', 'name')
      .populate('deliveryAddress.region', 'name')
      .sort({ createdAt: 1 });

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

// @desc    Accept order
// @route   POST /api/courier/accept-order/:id
// @access  Private (Courier)
exports.acceptOrder = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.courierInfo?.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Siz hazırda əlçatan deyilsiniz'
      });
    }

    const regions = user.courierInfo?.regions || [];
    if (regions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Xidmət regionları seçilməyib. Sifariş qəbul etmək üçün xidmət regionlarınızı seçin.'
      });
    }

    // Region uyğunluğu atomik şəkildə yoxlanılır — kuryer öz regionundan kənar
    // və ya artıq başqasına təyin olunmuş sifarişi qəbul edə bilməz
    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.id,
        courier: null,
        status: 'ready',
        // sanitizeFilter (config/database.js) wraps raw operators in $eq — trusted() bypasses it
        'deliveryAddress.region': mongoose.trusted({ $in: regions })
      },
      {
        courier: req.user.id,
        status: 'out_for_delivery',
        assignedAt: new Date(),
        $push: {
          trackingHistory: {
            status: 'out_for_delivery',
            description: `Kuryer ${user.fullName} tərəfindən qəbul edildi`,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    if (!order) {
      return res.status(400).json({
        success: false,
        message: 'Sifariş tapılmadı və ya artıq başqa kuryerə təyin olunub'
      });
    }

    // Make courier unavailable
    user.courierInfo.isAvailable = false;
    await user.save();

    // Notify buyer and each unique seller
    const uniqueSellerIds = [...new Set(order.items.map(item => item.seller.toString()))];
    await Promise.all([
      createNotification({
        recipient: order.buyer,
        sender: req.user.id,
        type: 'delivery',
        title: 'Sifarişiniz kuryer tərəfindən qəbul edildi',
        message: `Kuryer ${user.fullName} sifarişinizi çatdıracaq.`,
        relatedOrder: order._id
      }),
      ...uniqueSellerIds.map(sellerId =>
        createNotification({
          recipient: sellerId,
          sender: req.user.id,
          type: 'delivery',
          title: 'Kuryer sifarişi qəbul etdi',
          message: `Kuryer ${user.fullName} sifarişi çatdırılmaya götürdü.`,
          relatedOrder: order._id
        })
      )
    ]);

    res.status(200).json({
      success: true,
      message: 'Sifariş qəbul edildi',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sifariş qəbul edilərkən xəta',
      error: error.message
    });
  }
};

// @desc    Get my deliveries
// @route   GET /api/courier/deliveries
// @access  Private (Courier)
exports.getMyDeliveries = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = { courier: req.user.id };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('buyer', 'firstName lastName phone')
      .populate('items.product', 'name')
      .populate('deliveryAddress.region', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Çatdırılmalar gətirilərkən xəta',
      error: error.message
    });
  }
};

// @desc    Update delivery status
// @route   PUT /api/courier/deliveries/:id/status
// @access  Private (Courier)
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { status, description } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      courier: req.user.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sifariş tapılmadı'
      });
    }

    const validStatuses = ['picked_up', 'in_transit', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Yanlış status'
      });
    }

    // Map to order status
    const statusMap = {
      'picked_up': 'out_for_delivery',
      'in_transit': 'out_for_delivery',
      'delivered': 'delivered'
    };

    order.status = statusMap[status];
    
    if (status === 'delivered') {
      order.deliveredAt = new Date();
      if (order.payment.method === 'cash') {
        order.payment.status = 'paid';
        // Cash collected on delivery → deduct stock now (idempotent, best-effort:
        // never block the delivery confirmation if stock math fails on this unused path).
        try {
          await deductOrderStock(order._id);
        } catch (stockErr) {
          console.error('Cash delivery stock deduction failed:', stockErr.message);
        }
      }

      // Earnings become payable once delivered.
      if (order.payout) {
        if (order.payout.sellerPayoutStatus === 'pending') order.payout.sellerPayoutStatus = 'available';
        if (order.payout.courierPayoutStatus === 'pending') order.payout.courierPayoutStatus = 'available';
      }

      // Make courier available again
      await User.findByIdAndUpdate(req.user.id, {
        'courierInfo.isAvailable': true,
        $inc: { 'courierInfo.totalDeliveries': 1 }
      });
    }

    order.trackingHistory.push({
      status: order.status,
      description: description || `Status: ${status}`,
      timestamp: new Date()
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Status yeniləndi',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Status yenilənərkən xəta',
      error: error.message
    });
  }
};

// @desc    Toggle availability
// @route   PUT /api/courier/availability
// @access  Private (Courier)
exports.toggleAvailability = async (req, res) => {
  try {
    const { isAvailable, workingHours, regions } = req.body;

    const updates = {};
    if (isAvailable !== undefined) updates['courierInfo.isAvailable'] = isAvailable;
    if (workingHours) {
      updates['courierInfo.workingHours.start'] = workingHours.start;
      updates['courierInfo.workingHours.end'] = workingHours.end;
    }
    // Xidmət regionlarını yenilə (qeydiyyatdan sonra da dəyişdirilə bilər)
    if (Array.isArray(regions)) {
      updates['courierInfo.regions'] = regions;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    );

    res.status(200).json({
      success: true,
      courierInfo: user.courierInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Əlçatanlıq yenilənərkən xəta',
      error: error.message
    });
  }
};