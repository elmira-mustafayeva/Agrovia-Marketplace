const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cloudinary konfiqurasiyası
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Şəkil üçün storage
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'agrovia/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit' }]
  }
});

// Video üçün storage
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'agrovia/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi', 'wmv']
  }
});

// Məhsul media storage — şəkil və video eyni request-də, ayrı Cloudinary qovluqlarına
const productMediaStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    if (file.mimetype.startsWith('video/')) {
      return {
        folder: 'agrovia/videos',
        resource_type: 'video',
        allowed_formats: ['mp4', 'mov', 'avi', 'wmv']
      };
    }
    return {
      folder: 'agrovia/products',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1200, height: 1200, crop: 'limit' }]
    };
  }
});

// Avatar üçün storage
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'agrovia/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill' }]
  }
});

// Upload middleware-ləri
exports.uploadImages = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).array('images', 5); // Maksimum 5 şəkil

exports.uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
}).single('video');

// Məhsul üçün birləşik upload: images (max 5) + video (max 1) eyni request-də
exports.uploadProductMedia = multer({
  storage: productMediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB (video üçün)
}).fields([
  { name: 'images', maxCount: 5 },
  { name: 'video', maxCount: 1 }
]);

exports.uploadAvatar = multer({ 
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
}).single('avatar');

exports.deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('Cloudinary silmə xətası:', error);
  }
};