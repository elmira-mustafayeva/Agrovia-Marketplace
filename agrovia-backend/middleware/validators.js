const validator = require('validator');

// Helper to collect errors
const validationResult = (req) => {
  return req.validationErrors || [];
};

// Helper to check if validation passed
const isEmpty = (value) => {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'object' && Object.keys(value).length === 0) ||
    (typeof value === 'string' && value.trim().length === 0)
  );
};

// Register validation
exports.validateRegister = (req, res, next) => {
  const errors = [];
  const body = req.body || {};
  const { firstName, lastName, email, phone, password, role, region, address } = body;

  if (isEmpty(firstName) || firstName.length < 3) {
    errors.push('Ad minimum 3 simvol olmalıdır');
  }
  if (isEmpty(lastName) || lastName.length < 3) {
    errors.push('Soyad minimum 3 simvol olmalıdır');
  }
  if (isEmpty(email) || !validator.isEmail(email)) {
    errors.push('Düzgün email daxil edin');
  }
  if (isEmpty(phone)) {
    errors.push('Telefon nömrəsi tələb olunur');
  }
  if (isEmpty(password) || password.length < 6) {
    errors.push('Şifrə minimum 6 simvol olmalıdır');
  }
  if (!['admin', 'seller', 'buyer', 'courier'].includes(role)) {
    errors.push('Düzgün rol seçin');
  }

  const resolvedRegion = region || address?.region;
  if (role === 'seller' && isEmpty(resolvedRegion)) {
    errors.push('Satici qeydiyyatı üçün region seçimi məcburidir');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validasiya xətası',
      errors
    });
  }

  next();
};

// Login validation
exports.validateLogin = (req, res, next) => {
  const errors = [];
  const body = req.body || {};
  const { email, password } = body;

  if (isEmpty(email) || !validator.isEmail(email)) {
    errors.push('Düzgün email daxil edin');
  }
  if (isEmpty(password)) {
    errors.push('Şifrə tələb olunur');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validasiya xətası',
      errors
    });
  }

  next();
};

// Product validation
exports.validateProduct = (req, res, next) => {
  const errors = [];
  const body = req.body || {};
  const { name, description, price, unit, minOrderQuantity, stockQuantity, category, region } = body;

  if (isEmpty(name) || name.length < 2) {
    errors.push('Məhsul adı minimum 2 simvol olmalıdır');
  }
  if (isEmpty(description)) {
    errors.push('Təsvir tələb olunur');
  }
  if (isEmpty(price) || !validator.isFloat(price.toString(), { min: 0 })) {
    errors.push('Düzgün qiymət daxil edin');
  }
  if (!['kg', 'gram', 'ton', 'piece', 'liter', 'bottle', 'box', 'bag'].includes(unit)) {
    errors.push('Düzgün vahid seçin');
  }
  if (isEmpty(minOrderQuantity) || minOrderQuantity < 1) {
    errors.push('Minimum sifariş miqdarı minimum 1 olmalıdır');
  }
  if (isEmpty(stockQuantity) || stockQuantity < 0) {
    errors.push('Stok miqdarı düzgün deyil');
  }
  if (isEmpty(category)) {
    errors.push('Kateqoriya seçin');
  }
  if (isEmpty(region)) {
    errors.push('Region seçin');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validasiya xətası',
      errors
    });
  }

  next();
};

// Order validation
exports.validateOrder = (req, res, next) => {
  const errors = [];
  const body = req.body || {};
  const { deliveryAddress, paymentMethod } = body;

  if (isEmpty(deliveryAddress)) {
    errors.push('Çatdırılma ünvanı tələb olunur');
  }
  if (!['cash', 'card', 'online'].includes(paymentMethod)) {
    errors.push('Düzgün ödəniş üsulu seçin');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validasiya xətası',
      errors
    });
  }

  next();
};

// Review validation
exports.validateReview = (req, res, next) => {
  const errors = [];
  const body = req.body || {};
  const { productRating, productReview } = body;

  if (!productRating || productRating < 1 || productRating > 5) {
    errors.push('Reytinq 1-5 arası olmalıdır');
  }
  if (isEmpty(productReview) || productReview.length < 5) {
    errors.push('Rəy minimum 5 simvol olmalıdır');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validasiya xətası',
      errors
    });
  }

  next();
};