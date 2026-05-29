const express = require('express');
const router = express.Router();
const { addReview, getProductReviews, getMyReviews } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');
const { validateReview } = require('../middleware/validators');

router.post('/', protect, authorize('buyer'), validateReview, addReview);
router.get('/my', protect, getMyReviews);
router.get('/product/:productId', getProductReviews);

module.exports = router;