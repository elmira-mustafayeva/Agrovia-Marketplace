const express = require('express');
const router = express.Router();
const { getDashboard, getAvailableOrders, acceptOrder, getMyDeliveries, updateDeliveryStatus, toggleAvailability } = require('../controllers/courierController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, authorize('courier'), getDashboard);
router.get('/available-orders', protect, authorize('courier'), getAvailableOrders);
router.post('/accept-order/:id', protect, authorize('courier'), acceptOrder);
router.get('/deliveries', protect, authorize('courier'), getMyDeliveries);
router.put('/deliveries/:id/status', protect, authorize('courier'), updateDeliveryStatus);
router.put('/availability', protect, authorize('courier'), toggleAvailability);

module.exports = router;