const Stripe = require('stripe');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const createNotification = require('../utils/createNotification');
const deductOrderStock = require('../utils/deductOrderStock');

// Lazily instantiate — throws a clear ApiError at call time if key is missing,
// rather than crashing the whole server at startup.
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new ApiError(500, 'STRIPE_SECRET_KEY konfiqurasiya edilməyib');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

// ─── CREATE PAYMENT INTENT ────────────────────────────────────────────────────
// POST /api/payments/create-intent  (protected — buyer only)
exports.createPaymentIntent = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    throw new ApiError(400, 'orderId tələb olunur');
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, 'Sifariş tapılmadı');
  }
  if (order.buyer.toString() !== req.user.id) {
    throw new ApiError(403, 'Bu sifarişə giriş icazəniz yoxdur');
  }
  if (order.payment.method !== 'card') {
    throw new ApiError(400, 'Bu sifariş kart ödənişi üçün deyil');
  }
  if (order.payment.status === 'paid') {
    throw new ApiError(400, 'Bu sifariş artıq ödənilib');
  }
  if (order.status === 'cancelled') {
    throw new ApiError(400, 'Ləğv edilmiş sifariş üçün ödəniş mümkün deyil');
  }

  const stripe = getStripe();

  // AZN (Azerbaijani Manat) is listed in Stripe's supported currencies, but
  // availability depends on your Stripe account's country/region configuration.
  // If your Stripe account does not support AZN, change 'azn' to 'usd' below
  // and handle currency conversion separately until AZN support is confirmed.
  const CURRENCY = 'azn'; // change to 'usd' if your Stripe account does not support AZN

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(order.totalAmount * 100), // Stripe uses smallest unit (qəpik / cent)
    currency: CURRENCY,
    metadata: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber || '',
      buyerId: req.user.id
    }
  });

  // Persist paymentIntentId so we can match webhook events to this order
  order.payment.paymentIntentId = paymentIntent.id;
  await order.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Ödəniş niyyəti yaradıldı',
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: order.totalAmount,
      currency: CURRENCY
    }
  });
});

// ─── CONFIRM PAYMENT ──────────────────────────────────────────────────────────
// POST /api/payments/confirm  (protected — buyer only)
// Called by the frontend after Stripe.js completes payment on the client side.
exports.confirmPayment = asyncHandler(async (req, res) => {
  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    throw new ApiError(400, 'paymentIntentId tələb olunur');
  }

  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  const order = await Order.findOne({ 'payment.paymentIntentId': paymentIntentId });

  if (!order) {
    throw new ApiError(404, 'Bu ödənişə aid sifariş tapılmadı');
  }
  if (order.buyer.toString() !== req.user.id) {
    throw new ApiError(403, 'Bu ödənişə giriş icazəniz yoxdur');
  }

  if (paymentIntent.status === 'succeeded') {
    // Idempotent: already finalized → return success without deducting stock again.
    if (order.payment.status === 'paid') {
      return res.status(200).json({
        success: true,
        message: 'Ödəniş artıq təsdiqlənib',
        data: {
          status: 'paid',
          orderId: order._id,
          orderNumber: order.orderNumber,
          paidAt: order.payment.paidAt
        }
      });
    }

    // Deduct stock atomically BEFORE marking paid. Insufficient stock throws
    // ApiError(400) → order stays unpaid, no partial deduction. (Edge: card was
    // already charged by Stripe; this requires a manual refund — rare, since stock
    // is validated at order creation.)
    await deductOrderStock(order._id);

    order.payment.status = 'paid';
    order.payment.paidAt = new Date();
    order.payment.transactionId = paymentIntent.id;
    await order.save({ validateBeforeSave: false });

    await createNotification({
      recipient: order.buyer,
      type: 'order',
      title: 'Ödənişiniz uğurla tamamlandı',
      message: `${order.orderNumber || order._id} nömrəli sifarişiniz üçün ödəniş qəbul edildi.`,
      relatedOrder: order._id
    });

    return res.status(200).json({
      success: true,
      message: 'Ödəniş uğurla tamamlandı',
      data: {
        status: 'paid',
        orderId: order._id,
        orderNumber: order.orderNumber,
        paidAt: order.payment.paidAt
      }
    });
  }

  // Stripe statuses that indicate the payment cannot proceed
  const failedStatuses = ['canceled', 'requires_payment_method'];
  if (failedStatuses.includes(paymentIntent.status)) {
    order.payment.status = 'failed';
    await order.save({ validateBeforeSave: false });

    await createNotification({
      recipient: order.buyer,
      type: 'order',
      title: 'Ödəniş uğursuz oldu',
      message: `${order.orderNumber || order._id} nömrəli sifarişiniz üçün ödəniş tamamlana bilmədi. Yenidən cəhd edin.`,
      relatedOrder: order._id
    });

    return res.status(200).json({
      success: true,
      message: 'Ödəniş uğursuz oldu',
      data: {
        status: 'failed',
        paymentIntentStatus: paymentIntent.status
      }
    });
  }

  // Payment is still in progress (e.g. requires_action, processing)
  res.status(200).json({
    success: true,
    message: 'Ödəniş hələ tamamlanmayıb',
    data: { status: paymentIntent.status }
  });
});

// ─── STRIPE WEBHOOK ───────────────────────────────────────────────────────────
// POST /api/payments/webhook  (public — verified via Stripe signature)
// Raw body is preserved by the verify callback added to express.json() in index.js.
exports.stripeWebhook = asyncHandler(async (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new ApiError(500, 'STRIPE_WEBHOOK_SECRET konfiqurasiya edilməyib');
  }

  const sig = req.headers['stripe-signature'];
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw new ApiError(400, `Webhook imzası doğrulanmadı: ${err.message}`);
  }

  const paymentIntent = event.data.object;

  if (event.type === 'payment_intent.succeeded') {
    const order = await Order.findOne({ 'payment.paymentIntentId': paymentIntent.id });

    if (order && order.payment.status !== 'paid') {
      // Secure stock first (idempotent — no-op if confirmPayment already deducted).
      // Only mark paid if stock could be deducted; otherwise leave for manual handling.
      try {
        await deductOrderStock(order._id);

        order.payment.status = 'paid';
        order.payment.paidAt = new Date();
        order.payment.transactionId = paymentIntent.id;
        await order.save({ validateBeforeSave: false });

        await createNotification({
          recipient: order.buyer,
          type: 'order',
          title: 'Ödənişiniz uğurla tamamlandı',
          message: `${order.orderNumber || order._id} nömrəli sifarişiniz üçün ödəniş qəbul edildi.`,
          relatedOrder: order._id
        });
      } catch (stockErr) {
        console.error('Webhook stock deduction failed, order left unpaid:', stockErr.message);
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const order = await Order.findOne({ 'payment.paymentIntentId': paymentIntent.id });

    if (order && order.payment.status !== 'paid') {
      order.payment.status = 'failed';
      await order.save({ validateBeforeSave: false });

      await createNotification({
        recipient: order.buyer,
        type: 'order',
        title: 'Ödəniş uğursuz oldu',
        message: `${order.orderNumber || order._id} nömrəli sifarişiniz üçün ödəniş tamamlana bilmədi.`,
        relatedOrder: order._id
      });
    }
  }

  // Always acknowledge receipt to Stripe — returning non-2xx causes Stripe to retry
  res.status(200).json({ received: true });
});
