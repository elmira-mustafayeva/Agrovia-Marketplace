const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('Xəta:', err);

  // MongoDB bad ObjectId
  if (err.name === 'CastError') {
    error.message = 'Resurs tapılmadı';
    return res.status(404).json({
      success: false,
      message: error.message
    });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error.message = `${field} artıq mövcuddur`;
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // MongoDB validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error.message = messages.join(', ');
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Token etibarsızdır';
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }

  // JWT expired
  if (err.name === 'TokenExpiredError') {
    error.message = 'Tokenin vaxtı keçib';
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: error.message || 'Server xətası',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;