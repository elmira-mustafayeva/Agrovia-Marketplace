const mongoose = require('mongoose');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const createNotification = require('../utils/createNotification');

// @desc    Add review
// @route   POST /api/reviews
// @access  Private (Buyer)
exports.addReview = async (req, res) => {
  try {
    // Courier rating is a separate, order-level concept (POST /api/orders/:id/courier-review).
    const { orderId, productId, productRating, productReview } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      buyer: req.user.id,
      status: 'delivered',
      'payment.status': 'paid'
    });

    if (!order) {
      return res.status(400).json({
        success: false,
        message: 'Rəy yalnız çatdırılmış və ödənişi tamamlanmış sifariş üçün yazıla bilər'
      });
    }

    const hasProduct = order.items.some(item => item.product.toString() === productId);
    if (!hasProduct) {
      return res.status(400).json({
        success: false,
        message: 'Bu sifarişdə bu məhsul yoxdur'
      });
    }

    // One review per buyer per product (MVP rule). Drop `order` from the guard so a
    // buyer cannot create multiple reviews for the same product from different orders.
    const existingReview = await Review.findOne({ user: req.user.id, product: productId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Bu məhsul üçün artıq rəy yazmısınız'
      });
    }

    const trimmedReview = (productReview || '').trim();
    if (!trimmedReview) {
      return res.status(400).json({ success: false, message: 'Rəy mətni boş ola bilməz' });
    }

    const review = await Review.create({
      user: req.user.id,
      product: productId,
      order: orderId,
      productRating,
      productReview: trimmedReview,
    });

    // Rating aggregation is best-effort: the review is the only critical write.
    // It MUST NOT make the request look failed after the review is inserted, so the
    // whole block is wrapped — any failure is logged but still returns 201.
    try {
      // Update product rating. (No `$exists` filter: productRating is required, and
      // sanitizeFilter would neutralize the operator → empty result → NaN → CastError.)
      const productReviews = await Review.find({ product: productId });
      const avgProductRating = productReviews.length
        ? productReviews.reduce((sum, r) => sum + r.productRating, 0) / productReviews.length
        : 0;

      await Product.findByIdAndUpdate(productId, {
        rating: Math.round(avgProductRating * 10) / 10,
        totalReviews: productReviews.length
      });

      // Update seller rating. trusted() is required — sanitizeFilter neutralizes a raw $in.
      const product = await Product.findById(productId);
      const sellerProductIds = (await Product.find({ seller: product.seller }).select('_id')).map((p) => p._id);
      const sellerReviews = await Review.find({ product: mongoose.trusted({ $in: sellerProductIds }) });
      const avgSellerRating = sellerReviews.length
        ? sellerReviews.reduce((sum, r) => sum + r.productRating, 0) / sellerReviews.length
        : 0;

      await User.findByIdAndUpdate(product.seller, {
        'sellerInfo.rating': Math.round(avgSellerRating * 10) / 10
      });

      // Notify the seller about the new review
      const preview = trimmedReview.length > 80
        ? trimmedReview.substring(0, 80) + '...'
        : trimmedReview;
      await createNotification({
        recipient: product.seller,
        sender: req.user.id,
        type: 'review',
        title: 'Məhsulunuza yeni rəy əlavə edildi',
        message: `${productRating} ulduz reytinq: "${preview}"`,
        relatedProduct: product._id,
        relatedReview: review._id
      });
    } catch (aggErr) {
      console.error('Review aggregation/notification failed (review still saved):', aggErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Rəy əlavə edildi',
      review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Rəy əlavə edilərkən xəta',
      error: error.message
    });
  }
};

// @desc    Get product reviews
// @route   GET /api/reviews/product/:productId
// @access  Public
exports.getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'firstName lastName avatar')
      .sort({ createdAt: -1 });

    const stats = {
      total: reviews.length,
      average: reviews.length > 0 
        ? (reviews.reduce((sum, r) => sum + r.productRating, 0) / reviews.length).toFixed(1)
        : 0
    };

    res.status(200).json({
      success: true,
      stats,
      reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Rəylər gətirilərkən xəta',
      error: error.message
    });
  }
};

// @desc    Get my reviews
// @route   GET /api/reviews/my
// @access  Private
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user.id })
      .populate('product', 'name images')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Rəylər gətirilərkən xəta',
      error: error.message
    });
  }
};