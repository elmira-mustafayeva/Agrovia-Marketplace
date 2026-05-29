const express = require('express');
const router = express.Router();
const { getRegions, getRegion } = require('../controllers/regionController');

router.get('/', getRegions);
router.get('/:id', getRegion);

module.exports = router;