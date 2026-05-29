const express = require('express');
const router = express.Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct, deleteProductImage, getMyProducts } = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { uploadImages, uploadVideo } = require('../middleware/upload');
const { validateProduct } = require('../middleware/validators');

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);

// Protected seller routes
router.post('/', protect, authorize('seller', 'admin'), validateProduct, uploadImages, uploadVideo, createProduct);
router.get('/my/products', protect, authorize('seller'), getMyProducts);
router.put('/:id', protect, authorize('seller', 'admin'), validateProduct, uploadImages, uploadVideo, updateProduct);
router.delete('/:id/image/:imageId', protect, authorize('seller', 'admin'), deleteProductImage);
router.delete('/:id', protect, authorize('seller', 'admin'), deleteProduct);

module.exports = router;