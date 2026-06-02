const express = require('express');
const router = express.Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct, deleteProductImage, getMyProducts } = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { uploadImages, uploadVideo } = require('../middleware/upload');
const { validateProduct } = require('../middleware/validators');

// Public routes
router.get('/', getProducts);

// Protected seller routes (specific must come before param routes)
router.get('/my/products', protect, authorize('seller'), getMyProducts);

// Public product detail (param route placed after specific routes)
router.get('/:id', getProduct);

// Protected seller routes
router.post('/', protect, authorize('seller', 'admin'), validateProduct, uploadImages, uploadVideo, createProduct);
router.put('/:id', protect, authorize('seller', 'admin'), validateProduct, uploadImages, uploadVideo, updateProduct);
router.delete('/:id/image/:imageId', protect, authorize('seller', 'admin'), deleteProductImage);
router.delete('/:id', protect, authorize('seller', 'admin'), deleteProduct);

module.exports = router;