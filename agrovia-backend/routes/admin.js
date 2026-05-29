const express = require('express');
const router = express.Router();
const { getDashboard, getUsers, toggleUserStatus, verifySeller, getPendingProducts, approveProduct, getAllOrders, assignCourier } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, authorize('admin'), getDashboard);
router.get('/users', protect, authorize('admin'), getUsers);
router.put('/users/:id/status', protect, authorize('admin'), toggleUserStatus);
router.put('/sellers/:id/verify', protect, authorize('admin'), verifySeller);
router.get('/products/pending', protect, authorize('admin'), getPendingProducts);
router.put('/products/:id/approve', protect, authorize('admin'), approveProduct);
router.get('/orders', protect, authorize('admin'), getAllOrders);
router.put('/orders/:id/assign-courier', protect, authorize('admin'), assignCourier);

module.exports = router;