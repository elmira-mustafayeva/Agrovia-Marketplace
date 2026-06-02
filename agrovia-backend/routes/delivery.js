const express = require('express');
const router = express.Router();
const { calculateDelivery } = require('../controllers/deliveryController');

router.post('/calculate', calculateDelivery);

module.exports = router;