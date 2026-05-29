const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrder, updateOrderStatus } = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('buyer'), createOrder);
router.get('/my', protect, getMyOrders);
router.get('/:id', protect, getOrder);
router.put('/:id/status', protect, authorize('admin', 'seller', 'courier'), updateOrderStatus);

module.exports = router;