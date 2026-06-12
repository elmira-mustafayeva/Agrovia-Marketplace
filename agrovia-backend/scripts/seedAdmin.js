const dns = require('dns');

dns.setServers(['1.1.1.1', '8.8.8.8']);
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const required = ['MONGODB_URI', 'ADMIN_FIRST_NAME', 'ADMIN_LAST_NAME', 'ADMIN_EMAIL', 'ADMIN_PHONE', 'ADMIN_PASSWORD'];
const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`Admin seed xətası: aşağıdakı mühit dəyişənləri təyin edilməyib: ${missing.join(', ')}`);
  process.exit(1);
}

const adminData = {
  firstName: process.env.ADMIN_FIRST_NAME,
  lastName: process.env.ADMIN_LAST_NAME,
  email: process.env.ADMIN_EMAIL,
  phone: process.env.ADMIN_PHONE,
  password: process.env.ADMIN_PASSWORD,
  role: 'admin'
};

const connectDB = async () => {
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
