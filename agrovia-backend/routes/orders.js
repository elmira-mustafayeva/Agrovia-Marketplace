const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrder, updateOrderStatus, addCourierReview, estimateDelivery } = require('../controllers/orderController');
const { getSellerOrders } = require('../controllers/sellerController');
const { protect, authorize } = require('../middleware/auth');
const { validateOrder } = require('../middleware/validators');

router.post('/', protect, authorize('buyer'), validateOrder, createOrder);
router.get('/my', protect, getMyOrders);
router.post('/estimate-delivery', protect, authorize('buyer'), estimateDelivery);
// Compatibility alias for clients that call /api/orders/seller — must be declared
// before '/:id' so it isn't captured as an order id (which caused a CastError 404).
// Canonical endpoint /api/seller/orders is unchanged.
router.get('/seller', protect, authorize('seller'), getSellerOrders);
router.get('/:id', protect, getOrder);
router.put('/:id/status', protect, authorize('admin', 'seller', 'courier'), updateOrderStatus);
router.post('/:id/courier-review', protect, authorize('buyer'), addCourierReview);

module.exports = router;