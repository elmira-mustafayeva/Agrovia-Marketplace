const Cart = require('../models/Cart');
const Product = require('../models/Product');

const UNIT_LABELS = {
  kg: 'kq', gram: 'qram', liter: 'litr', piece: 'ədəd',
  bottle: 'şüşə', box: 'qutu', bag: 'kisə', ton: 'ton'
};
const unitLabel = (unit) => UNIT_LABELS[unit] || unit;

const getDiscountedPrice = (product) => {
  if (product.discount?.percentage > 0) {
    return Math.round((product.price - product.price * product.discount.percentage / 100) * 100) / 100;
  }
  return product.price;
};

// Səbəti gətir
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id })
      .populate({
        path: 'items.product',
        select: 'name price unit images stockQuantity status minOrderQuantity seller',
        populate: { path: 'seller', select: 'firstName lastName' }
      });

    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }

    res.status(200).json({
      success: true,
      cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Səbət gətirilərkən xəta',
      error: error.message
    });
  }
};

// Səbətə əlavə et
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Məhsulu yoxla
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Məhsul tapılmadı'
      });
    }

    if (product.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Bu məhsul hazırda satışda deyil'
      });
    }

    if (product.stockQuantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Stokda kifayət qədər məhsul yoxdur'
      });
    }

    if (quantity < product.minOrderQuantity) {
      return res.status(400).json({
        success: false,
        message: `Bu məhsuldan minimum ${product.minOrderQuantity} ${unitLabel(product.unit)} sifariş etməlisiniz.`
      });
    }

    // Səbəti tap və ya yarat
    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    // Məhsul artıq səbətdədirsə
    const existingItem = cart.items.find(
      item => item.product.toString() === productId
    );

    if (existingItem) {
      return res.status(409).json({
        success: false,
        alreadyInCart: true,
        message: 'Bu məhsul artıq səbətdədir. Miqdarı səbətdə dəyişə bilərsiniz.'
      });
    }

    cart.items.push({
      product: productId,
      quantity: Number(quantity),
      price: getDiscountedPrice(product)
    });

    await cart.save();

    // Populate ilə qaytar
    cart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price unit images stockQuantity status minOrderQuantity'
    });

    res.status(200).json({
      success: true,
      message: 'Məhsul səbətə əlavə edildi',
      cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Səbətə əlavə edilərkən xəta',
      error: error.message
    });
  }
};

// Səbətdəki miqdarı yenilə
exports.updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Səbət tapılmadı'
      });
    }

    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Məhsul səbətdə tapılmadı'
      });
    }

    // Məhsulu yoxla
    const product = await Product.findById(item.product);

    if (quantity > product.stockQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Stokda kifayət qədər məhsul yoxdur'
      });
    }

    if (quantity < product.minOrderQuantity) {
      return res.status(400).json({
        success: false,
        message: `Bu məhsuldan minimum ${product.minOrderQuantity} ${unitLabel(product.unit)} sifariş etməlisiniz.`
      });
    }

    if (quantity <= 0) {
      // Sil
      cart.items = cart.items.filter(i => i._id.toString() !== itemId);
    } else {
      item.quantity = Number(quantity);
      item.price = getDiscountedPrice(product);
    }

    await cart.save();

    cart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price unit images stockQuantity status minOrderQuantity'
    });

    res.status(200).json({
      success: true,
      message: 'Səbət yeniləndi',
      cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Səbət yenilənərkən xəta',
      error: error.message
    });
  }
};

// Səbətdən sil
exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Səbət tapılmadı'
      });
    }

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    await cart.save();

    cart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name price unit images stockQuantity status minOrderQuantity'
    });

    res.status(200).json({
      success: true,
      message: 'Məhsul səbətdən silindi',
      cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Səbətdən silinərkən xəta',
      error: error.message
    });
  }
};

// Səbəti təmizlə
exports.clearCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id });

    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: 'Səbət təmizləndi',
      cart: cart || { items: [], totalAmount: 0, totalItems: 0 }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Səbət təmizlənərkən xəta',
      error: error.message
    });
  }
};