const Product = require('../models/Product');
const { deleteFromCloudinary } = require('../middleware/upload');

// Bütün məhsulları gətir (filter ilə)
exports.getProducts = async (req, res) => {
  try {
    const {
      category,
      region,
      minPrice,
      maxPrice,
      search,
      sort,
      page = 1,
      limit = 20,
    } = req.query;

    // Filter obyekti yarat — status is always 'active' for public endpoint
    const filter = { status: 'active' };

    if (category) filter.category = category;
    if (region) filter.region = region;
    
    // Qiymət aralığı
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Axtarış
    if (search) {
      filter.$text = { $search: search };
    }

    // Sıralama
    let sortOption = {};
    if (sort === 'price_asc') sortOption.price = 1;
    else if (sort === 'price_desc') sortOption.price = -1;
    else if (sort === 'newest') sortOption.createdAt = -1;
    else if (sort === 'popular') sortOption.totalSales = -1;
    else sortOption.createdAt = -1; // Default

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(filter)
      .populate('seller', 'firstName lastName sellerInfo.businessName sellerInfo.rating sellerInfo.saleType')
      .populate('category', 'name')
      .populate('region', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Məhsullar gətirilərkən xəta',
      error: error.message
    });
  }
};

// Tək məhsul gətir
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'firstName lastName sellerInfo.businessName sellerInfo.rating sellerInfo.saleType')
      .populate('category', 'name')
      .populate('region', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Məhsul tapılmadı'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Məhsul gətirilərkən xəta',
      error: error.message
    });
  }
};

// Məhsul yarat (Satici)
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      unit,
      saleType,
      minOrderQuantity,
      stockQuantity,
      category,
      region,
      attributes,
      tags,
      discount
    } = req.body;

    // req.files is an object from .fields(): { images: [...], video: [...] }
    const imageFiles = req.files?.images || [];
    const videoFile = req.files?.video?.[0] || null;

    const images = imageFiles.map((file, index) => ({
      public_id: file.filename,
      url: file.path,
      isMain: index === 0
    }));

    const videos = videoFile ? [{
      public_id: videoFile.filename,
      url: videoFile.path,
      thumbnail: null
    }] : [];

    const product = await Product.create({
      seller: req.user.id,
      name,
      description,
      price: Number(price),
      unit,
      saleType: saleType || 'retail',
      minOrderQuantity: Number(minOrderQuantity),
      stockQuantity: Number(stockQuantity),
      category,
      region,
      images,
      videos,
      attributes: attributes ? JSON.parse(attributes) : [],
      tags: tags ? JSON.parse(tags) : [],
      discount: discount ? JSON.parse(discount) : { percentage: 0 },
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Məhsul uğurla əlavə edildi. Admin təsdiqi gözləyir.',
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Məhsul əlavə edilərkən xəta',
      error: error.message
    });
  }
};

// Məhsulu yenilə (Satici)
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Məhsul tapılmadı'
      });
    }

    // Yalnız öz məhsulunu redaktə edə bilər
    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu məhsulu redaktə etmək icazəniz yoxdur'
      });
    }

    const allowedUpdates = [
      'name', 'description', 'price', 'unit', 'saleType', 'minOrderQuantity',
      'stockQuantity', 'category', 'region', 'attributes', 'tags', 'discount'
    ];
    // Only admins can set status directly — sellers must go through admin approval
    if (req.user.role === 'admin') allowedUpdates.push('status');

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (['attributes', 'tags', 'discount'].includes(field)) {
          updates[field] = JSON.parse(req.body[field]);
        } else if (['price', 'minOrderQuantity', 'stockQuantity'].includes(field)) {
          updates[field] = Number(req.body[field]);
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    // req.files is an object from .fields(): { images: [...], video: [...] }
    const newImageFiles = req.files?.images || [];
    if (newImageFiles.length > 0) {
      const newImages = newImageFiles.map((file, index) => ({
        public_id: file.filename,
        url: file.path,
        isMain: product.images.length === 0 && index === 0
      }));
      updates.images = [...product.images, ...newImages];
    }

    const newVideoFile = req.files?.video?.[0] || null;
    if (newVideoFile) {
      updates.videos = [...product.videos, {
        public_id: newVideoFile.filename,
        url: newVideoFile.path,
        thumbnail: null
      }];
    }

    product = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Məhsul yeniləndi',
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Məhsul yenilənərkən xəta',
      error: error.message
    });
  }
};

// Məhsul şəklini sil
exports.deleteProductImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Məhsul tapılmadı'
      });
    }

    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'İcazə yoxdur'
      });
    }

    const image = product.images.find(img => img.public_id === imageId);

    if (image) {
      await deleteFromCloudinary(image.public_id);
      product.images = product.images.filter(img => img.public_id !== imageId);
      await product.save();
    }

    res.status(200).json({
      success: true,
      message: 'Şəkil silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Şəkil silinərkən xəta',
      error: error.message
    });
  }
};

// Məhsulu sil (Satici/Admin)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Məhsul tapılmadı'
      });
    }

    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu məhsulu silmək icazəniz yoxdur'
      });
    }

    // Şəkilləri Cloudinary-dən sil
    for (const image of product.images) {
      await deleteFromCloudinary(image.public_id);
    }
    for (const video of product.videos) {
      await deleteFromCloudinary(video.public_id, 'video');
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Məhsul silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Məhsul silinərkən xəta',
      error: error.message
    });
  }
};

// Saticinin öz məhsulları
exports.getMyProducts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { seller: req.user.id };
    if (status) filter.status = status;

    const products = await Product.find(filter)
      .populate('category', 'name')
      .populate('region', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Məhsullar gətirilərkən xəta',
      error: error.message
    });
  }
};