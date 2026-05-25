const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

// İstək siyahısını gətir
exports.getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user.id })
      .populate({
        path: 'items.product',
        select: 'name price unit images stockQuantity status discount rating',
        populate: { path: 'seller', select: 'firstName lastName sellerInfo.businessName' }
      });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user.id, items: [] });
    }

    res.status(200).json({
      success: true,
      wishlist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İstək siyahısı gətirilərkən xəta',
      error: error.message
    });
  }
};

// İstək siyahısına əlavə et
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    // Məhsulu yoxla
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Məhsul tapılmadı'
      });
    }

    let wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user.id, items: [] });
    }

    // Artıq varsa
    const exists = wishlist.items.some(
      item => item.product.toString() === productId
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Bu məhsul artıq istək siyahınızdadır'
      });
    }

    wishlist.items.push({ product: productId });
    await wishlist.save();

    wishlist = await Wishlist.findById(wishlist._id).populate({
      path: 'items.product',
      select: 'name price unit images stockQuantity status discount'
    });

    res.status(200).json({
      success: true,
      message: 'Məhsul istək siyahısına əlavə edildi',
      wishlist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İstək siyahısına əlavə edilərkən xəta',
      error: error.message
    });
  }
};

// İstək siyahısından sil
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    let wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'İstək siyahısı tapılmadı'
      });
    }

    wishlist.items = wishlist.items.filter(
      item => item.product.toString() !== productId
    );

    await wishlist.save();

    wishlist = await Wishlist.findById(wishlist._id).populate({
      path: 'items.product',
      select: 'name price unit images stockQuantity status discount'
    });

    res.status(200).json({
      success: true,
      message: 'Məhsul istək siyahısından silindi',
      wishlist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İstək siyahısından silinərkən xəta',
      error: error.message
    });
  }
};

// İstək siyahısından səbətə əlavə et
exports.moveToCart = async (req, res) => {
  try {
    const { productId } = req.body;

    const Cart = require('../models/Cart');

    let wishlist = await Wishlist.findOne({ user: req.user.id });
    let cart = await Cart.findOne({ user: req.user.id });

    if (!wishlist || !wishlist.items.some(item => item.product.toString() === productId)) {
      return res.status(404).json({
        success: false,
        message: 'Məhsul istək siyahınızda tapılmadı'
      });
    }

    const product = await Product.findById(productId);

    if (!product || product.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Məhsul hazırda satışda deyil'
      });
    }

    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    const existingItem = cart.items.find(
      item => item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.items.push({
        product: productId,
        quantity: product.minOrderQuantity,
        price: product.price
      });
    }

    await cart.save();

    // İstək siyahısından sil
    wishlist.items = wishlist.items.filter(
      item => item.product.toString() !== productId
    );
    await wishlist.save();

    cart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price unit images stockQuantity status'
    });

    res.status(200).json({
      success: true,
      message: 'Məhsul səbətə köçürüldü',
      cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Səbətə köçürülərkən xəta',
      error: error.message
    });
  }
};