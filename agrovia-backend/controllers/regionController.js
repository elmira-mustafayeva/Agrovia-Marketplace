const Region = require('../models/Region');

// @desc    Get all regions
// @route   GET /api/regions
// @access  Public
exports.getRegions = async (req, res) => {
  try {
    const { type, parentRegion } = req.query;

    const filter = { isActive: true };
    if (type) filter.type = type;
    if (parentRegion) filter.parentRegion = parentRegion;

    const regions = await Region.find(filter)
      .populate('parentRegion', 'name')
      .sort({ type: -1, name: 1 });

    res.status(200).json({
      success: true,
      count: regions.length,
      regions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Regionlar gətirilərkən xəta',
      error: error.message
    });
  }
};

// @desc    Get single region
// @route   GET /api/regions/:id
// @access  Public
exports.getRegion = async (req, res) => {
  try {
    const region = await Region.findById(req.params.id)
      .populate('parentRegion', 'name');

    if (!region) {
      return res.status(404).json({
        success: false,
        message: 'Region tapılmadı'
      });
    }

    res.status(200).json({
      success: true,
      region
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Region gətirilərkən xəta',
      error: error.message
    });
  }
};