const express = require('express');
const router = express.Router();
const { addReview, getProductReviews, getMyReviews } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('buyer'), addReview);
router.get('/my', protect, getMyReviews);
router.get('/product/:productId', getProductReviews);

module.exports = router;