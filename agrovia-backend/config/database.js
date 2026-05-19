const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // MongoDB 6+ üçün bu parametrlər artıq default olaraq təyin olunub
    });

    console.log(`MongoDB Bağlantısı Uğurlu: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Bağlantı Xətası: ${error.message}`);
    process.exit(1); // Proqramı dayandır
  }
};

module.exports = connectDB;