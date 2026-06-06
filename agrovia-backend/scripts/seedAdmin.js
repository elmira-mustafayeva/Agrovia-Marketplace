const dns = require('dns');

dns.setServers(['1.1.1.1', '8.8.8.8']);
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const adminData = {
  firstName: process.env.ADMIN_FIRST_NAME || 'Elmira',
  lastName: process.env.ADMIN_LAST_NAME || 'Mustafayeva',
  email: process.env.ADMIN_EMAIL || 'mustafazadelmira@gmail.com',
  phone: process.env.ADMIN_PHONE || '+994997133777',
  password: process.env.ADMIN_PASSWORD || 'Elmira2027',
  role: 'admin'
};

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }
console.log('Mongo URI:', process.env.MONGODB_URI);

await mongoose.connect(process.env.MONGODB_URI);
};

const seedAdmin = async () => {
  try {
    await connectDB();

    let admin = await User.findOne({ email: adminData.email });

    if (admin) {
      admin.firstName = adminData.firstName;
      admin.lastName = adminData.lastName;
      admin.phone = adminData.phone;
      admin.role = 'admin';
      admin.password = adminData.password;
      admin.isActive = true;
      admin.isEmailVerified = true;
      await admin.save();
      console.log(`Admin updated: ${admin.email}`);
    } else {
      admin = await User.create({
        ...adminData,
        isActive: true,
        isEmailVerified: true
      });
      console.log(`Admin created: ${admin.email}`);
    }

    console.log('Admin seed completed successfully.');
    process.exit(0);
  } catch (error) {
   console.error('Admin seed failed:', error);
    process.exit(1);
  }
};

seedAdmin();
