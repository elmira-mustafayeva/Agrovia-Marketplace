const express = require('express');
const router = express.Router();
const { 
  getDashboard, 
  getUsers, 
  toggleUserStatus, 
  approveUser, 
  verifySeller, 
  getPendingProducts, 
  approveProduct, 
  getAllOrders,
  assignCourier,
  markPayout
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Dashboard
router.get('/dashboard', protect, authorize('admin'), getDashboard);

// Users
router.get('/users', protect, authorize('admin'), getUsers);
router.put('/users/:id/status', protect, authorize('admin'), toggleUserStatus);
router.put('/users/:id/approve', protect, authorize('admin'), approveUser);

// Sellers
router.put('/sellers/:id/verify', protect, authorize('admin'), verifySeller);

// Products
router.get('/products/pending', protect, authorize('admin'), getPendingProducts);
router.put('/products/:id/approve', protect, authorize('admin'), approveProduct);

// Orders
router.get('/orders', protect, authorize('admin'), getAllOrders);
router.put('/orders/:id/assign-courier', protect, authorize('admin'), assignCourier);
router.put('/orders/:id/payout', protect, authorize('admin'), markPayout);

// KATEQORIYA CRUD
const { 
  getCategories, 
  getCategory, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} = require('../controllers/categoryController');

router.get('/categories', protect, authorize('admin'), getCategories);
router.get('/categories/:id', protect, authorize('admin'), getCategory);
router.post('/categories', protect, authorize('admin'), createCategory);
router.put('/categories/:id', protect, authorize('admin'), updateCategory);
router.delete('/categories/:id', protect, authorize('admin'), deleteCategory);

// REGION CRUD
const { 
  getRegions, 
  getRegion, 
  createRegion, 
  updateRegion, 
  deleteRegion 
} = require('../controllers/regionController');

router.get('/regions', protect, authorize('admin'), getRegions);
router.get('/regions/:id', protect, authorize('admin'), getRegion);
router.post('/regions', protect, authorize('admin'), createRegion);
router.put('/regions/:id', protect, authorize('admin'), updateRegion);
router.delete('/regions/:id', protect, authorize('admin'), deleteRegion);

module.exports = router;