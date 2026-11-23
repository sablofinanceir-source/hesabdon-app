import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    businessType: {
      type: String,
      enum: ['grocery', 'supermarket', 'online', 'restaurant', 'workshop', 'other'],
      default: 'other',
    },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    currency: { type: String, enum: ['IRT', 'IRR'], default: 'IRT' }, // تومان یا ریال
    settings: {
      allowNegativeStock: { type: Boolean, default: false },
      updateBuyPriceOnPurchase: { type: Boolean, default: true },
      receiptFooter: { type: String, default: '', maxlength: 300 },
    },
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
    planExpiresAt: Date,
  },
  { timestamps: true },
);

export const Shop = mongoose.model('Shop', shopSchema);
