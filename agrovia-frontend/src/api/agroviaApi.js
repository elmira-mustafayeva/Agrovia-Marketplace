import { http } from './http';

const unwrap = (response) => response.data;

export const api = {
  health: () => http.get('/health').then(unwrap),
  getCategories: () => http.get('/categories').then(unwrap),
  getRegions: () => http.get('/regions').then(unwrap),
  getProducts: (params = {}) => http.get('/products', { params }).then(unwrap),
  getProduct: (id) => http.get(`/products/${id}`).then(unwrap),
  getCart: () => http.get('/cart').then(unwrap),
  addToCart: (payload) => http.post('/cart', payload).then(unwrap),
  updateCartItem: (itemId, payload) => http.put(`/cart/${itemId}`, payload).then(unwrap),
  removeFromCart: (itemId) => http.delete(`/cart/${itemId}`).then(unwrap),
  clearCart: () => http.delete('/cart').then(unwrap),
  getWishlist: () => http.get('/wishlist').then(unwrap),
  addToWishlist: (payload) => http.post('/wishlist', payload).then(unwrap),
  removeFromWishlist: (productId) => http.delete(`/wishlist/${productId}`).then(unwrap),
  moveWishlistToCart: (payload) => http.post('/wishlist/move-to-cart', payload).then(unwrap),
  getMyOrders: () => http.get('/orders/my').then(unwrap),
  createOrder: (payload) => http.post('/orders', payload).then(unwrap),
  getReviews: (productId) => http.get(`/reviews/product/${productId}`).then(unwrap),
  addReview: (payload) => http.post('/reviews', payload).then(unwrap),
  calculateDelivery: (payload) => http.post('/delivery/calculate', payload).then(unwrap),
  login: (payload) => http.post('/auth/login', payload).then(unwrap),
  register: (payload) => http.post('/auth/register', payload).then(unwrap),
  me: () => http.get('/auth/me').then(unwrap),
  sellerDashboard: () => http.get('/seller/dashboard').then(unwrap),
  sellerOrders: () => http.get('/seller/orders').then(unwrap),
  sellerProducts: () => http.get('/products/my/products').then(unwrap),
  createSellerProduct: (formData) => http.post('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(unwrap),
  courierDashboard: () => http.get('/courier/dashboard').then(unwrap),
  courierOrders: () => http.get('/courier/deliveries').then(unwrap),
  adminDashboard: () => http.get('/admin/dashboard').then(unwrap),
  adminUsers: () => http.get('/admin/users').then(unwrap),
  adminOrders: () => http.get('/admin/orders').then(unwrap),
  adminPendingProducts: () => http.get('/admin/products/pending').then(unwrap),
  approveProduct: (id, payload) => http.put(`/admin/products/${id}/approve`, payload).then(unwrap)
};