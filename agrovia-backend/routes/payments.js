const express = require('express');
const router = express.Router();

const {
  createPaymentIntent,
  confirmPayment,
  stripeWebhook
} = require('../controllers/paymentController');

const { protect } = require('../middleware/auth');

// Webhook is public — identity verified via Stripe signature inside the controller.
// Raw body is made available via the verify callback on express.json() in index.js.
router.post('/webhook', stripeWebhook);

// Protected buyer routes
router.post('/create-intent', protect, createPaymentIntent);
router.post('/confirm', protect, confirmPayment);

module.exports = router;
