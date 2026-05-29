const express = require('express');
const router = express.Router();
const { getWishlist, addToWishlist, removeFromWishlist, moveToCart } = require('../controllers/wishlistController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('buyer'), getWishlist);
router.post('/', protect, authorize('buyer'), addToWishlist);
router.delete('/:productId', protect, authorize('buyer'), removeFromWishlist);
router.post('/move-to-cart', protect, authorize('buyer'), moveToCart);

module.exports = router;