const mongoose = require('mongoose');

const regionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Region adı tələb olunur'],
      unique: true,
      trim: true
    },
    nameEn: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['city', 'district'],
      required: true
      // city - şəhər, district - rayon
    },
    parentRegion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Region',
      default: null
      // Əgər rayonsa, hansı şəhərə bağlıdır (məsələn, Xətai rayonu Bakı şəhərinə bağlı)
    },
    coordinates: {
      lat: Number,
      lng: Number
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Region', regionSchema);