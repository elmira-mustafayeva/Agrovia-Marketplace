const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    // Məhsul sahibi (Satici)
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // Kateqoriya
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    
    // Əsas məlumatlar
    name: {
      type: String,
      required: [true, 'Məhsul adı tələb olunur'],
      trim: true,
      maxlength: [50, 'Məhsul adı maksimum 50 simvol ola bilər']
    },
    description: {
      type: String,
      required: [true, 'Məhsul təsviri tələb olunur'],
      maxlength: [1000, 'Təsvir maksimum 1000 simvol ola bilər']
    },
    
    // Qiymət və miqdar
    price: {
      type: Number,
      required: [true, 'Qiymət tələb olunur'],
      min: [0, 'Qiymət mənfi ola bilməz']
    },
    unit: {
      type: String,
      required: true,
      enum: ['kg', 'gram', 'ton', 'piece', 'liter', 'bottle', 'box', 'bag'],
      default: 'kg'
      // kg - kiloqram, gram - qram, ton - ton, piece - ədəd, 
      // liter - litr, bottle - şüşə, box - qutu, bag - çanta
    },
    minOrderQuantity: {
      type: Number,
      required: [true, 'Minimum sifariş miqdarı tələb olunur'],
      min: [1, 'Minimum 1 olmalıdır'],
      default: 1
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Stok miqdarı tələb olunur'],
      min: [0, 'Stok mənfi ola bilməz'],
      default: 0
    },
    
    // Media fayllar
    images: [{
      public_id: String,
      url: String,
      isMain: {
        type: Boolean,
        default: false
      }
    }],
    videos: [{
      public_id: String,
      url: String,
      thumbnail: String
    }],
    
    // Region (hansı regionda satılır)
    region: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Region',
      required: true
    },
    
    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'out_of_stock', 'pending'],
      default: 'pending'
      // active - aktiv, inactive - deaktiv, out_of_stock - stokda yoxdur, pending - təsdiq gözləyir
    },
    
    // Reytinq
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    totalSales: {
      type: Number,
      default: 0
    },
    
    // Xüsusiyyətlər (məsələn: rəng, ölçü və s.)
    attributes: [{
      key: String,
      value: String
    }],
    
    // SEO
    tags: [{
      type: String,
      trim: true
    }],
    
    // Endirim
    discount: {
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      validUntil: Date
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual - Endirimli qiymət
productSchema.virtual('discountedPrice').get(function() {
  if (this.discount && this.discount.percentage > 0) {
    const discountAmount = (this.price * this.discount.percentage) / 100;
    return this.price - discountAmount;
  }
  return this.price;
});

// Indexlər (axtarış sürətini artırmaq üçün)
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ region: 1, status: 1 });
productSchema.index({ price: 1 });

module.exports = mongoose.model('Product', productSchema);