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


// @desc    Create region (Admin)
// @route   POST /api/admin/regions
// @access  Private (Admin)
exports.createRegion = async (req, res) => {
  try {
    const { name, nameEn, type, parentRegion, coordinates } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Region adı tələb olunur'
      });
    }

    if (!['city', 'district'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Region tipi city və ya district olmalıdır'
      });
    }

    const existing = await Region.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Bu region artıq mövcuddur'
      });
    }

    const region = await Region.create({
      name: name.trim(),
      nameEn: nameEn || '',
      type,
      parentRegion: parentRegion || null,
      coordinates: coordinates || { lat: 0, lng: 0 }
    });

    res.status(201).json({
      success: true,
      message: 'Region yaradıldı',
      region
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Region yaradılarkən xəta',
      error: error.message
    });
  }
};

// @desc    Update region (Admin)
// @route   PUT /api/admin/regions/:id
// @access  Private (Admin)
exports.updateRegion = async (req, res) => {
  try {
    const { name, nameEn, type, isActive, parentRegion, coordinates } = req.body;

    const region = await Region.findById(req.params.id);

    if (!region) {
      return res.status(404).json({
        success: false,
        message: 'Region tapılmadı'
      });
    }

    if (name && name !== region.name) {
      const existing = await Region.findOne({ name: name.trim() });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Bu region artıq mövcuddur'
        });
      }
      region.name = name.trim();
    }

    if (nameEn !== undefined) region.nameEn = nameEn;
    if (type !== undefined) region.type = type;
    if (isActive !== undefined) region.isActive = isActive;
    if (parentRegion !== undefined) region.parentRegion = parentRegion;
    if (coordinates !== undefined) region.coordinates = coordinates;

    await region.save();

    res.status(200).json({
      success: true,
      message: 'Region yeniləndi',
      region
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Region yenilənərkən xəta',
      error: error.message
    });
  }
};

// @desc    Delete region (Admin)
// @route   DELETE /api/admin/regions/:id
// @access  Private (Admin)
exports.deleteRegion = async (req, res) => {
  try {
    const region = await Region.findById(req.params.id);

    if (!region) {
      return res.status(404).json({
        success: false,
        message: 'Region tapılmadı'
      });
    }

    // Rayonları yoxla (əgər şəhərsə)
    const hasDistricts = await Region.countDocuments({ parentRegion: req.params.id });
    if (hasDistricts > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu şəhərdə rayonlar var. Əvvəlcə onları silin.'
      });
    }

    // Məhsulları yoxla
    const Product = require('../models/Product');
    const hasProducts = await Product.countDocuments({ region: req.params.id });
    if (hasProducts > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu regionda məhsullar var. Əvvəlcə onları silin.'
      });
    }

    await region.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Region silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Region silinərkən xəta',
      error: error.message
    });
  }
};