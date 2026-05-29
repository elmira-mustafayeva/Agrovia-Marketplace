const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Add review
// @route   POST /api/reviews
// @access  Private (Buyer)
exports.addReview = async (req, res) => {
  try {
    const { orderId, productId, productRating, productReview, courierRating, courierReview } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      buyer: req.user.id,
      status: 'delivered'
    });

    if (!order) {
      return res.status(400).json({
        success: false,
        message: 'Sifariş tapılmadı və ya çatdırılmayıb'
      });
    }

    const hasProduct = order.items.some(item => item.product.toString() === productId);
    if (!hasProduct) {
      return res.status(400).json({
        success: false,
        message: 'Bu sifarişdə bu məhsul yoxdur'
      });
    }

    const existingReview = await Review.findOne({ user: req.user.id, product: productId, order: orderId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Bu məhsul üçün artıq rəy yazmısınız'
      });
    }

    const review = await Review.create({
      user: req.user.id,
      product: productId,
      order: orderId,
      productRating,
      productReview,
      courierRating,
      courierReview,
      courier: order.courier
    });

    // Update product rating
    const productReviews = await Review.find({ product: productId, productRating: { $exists: true } });
    const avgProductRating = productReviews.reduce((sum, r) => sum + r.productRating, 0) / productReviews.length;
    
    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(avgProductRating * 10) / 10,
      totalReviews: productReviews.length
    });

    // Update seller rating
    const product = await Product.findById(productId);
    const sellerReviews = await Review.find({ product: { $in: await Product.find({ seller: product.seller }).select('_id') } });
    const avgSellerRating = sellerReviews.reduce((sum, r) => sum + r.productRating, 0) / sellerReviews.length;
    
    await User.findByIdAndUpdate(product.seller, {
      'sellerInfo.rating': Math.round(avgSellerRating * 10) / 10
    });

    // Update courier rating if provided
    if (courierRating && order.courier) {
      const courierReviews = await Review.find({ courier: order.courier, courierRating: { $exists: true } });
      const avgCourierRating = courierReviews.reduce((sum, r) => sum + r.courierRating, 0) / courierReviews.length;
      
      await User.findByIdAndUpdate(order.courier, {
        'courierInfo.rating': Math.round(avgCourierRating * 10) / 10
      });
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