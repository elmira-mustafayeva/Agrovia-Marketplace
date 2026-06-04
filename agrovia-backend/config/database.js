const mongoose = require('mongoose');

mongoose.set('sanitizeFilter', true);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Bağlantısı Uğurlu: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Bağlantı Xətası: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;