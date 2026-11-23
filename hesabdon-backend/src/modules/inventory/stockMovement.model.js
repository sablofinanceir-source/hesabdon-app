import mongoose from 'mongoose';

// دفتر گردش انبار: هر تغییر موجودی یک رکورد دارد
const stockMovementSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    type: {
      type: String,
      enum: ['initial', 'purchase', 'sale', 'recipe_consume', 'adjustment', 'reversal'],
      required: true,
    },
    quantity: { type: Number, required: true }, // مقدار علامت‌دار (ورود مثبت، خروج منفی)
    stockAfter: { type: Number, required: true },
    unitCost: { type: Number, default: 0 },
    ref: { type: mongoose.Schema.Types.ObjectId },
    refType: { type: String }, // مثلاً Invoice
    reversed: { type: Boolean, default: false }, // آیا توسط حرکت معکوس خنثی شده؟
    note: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

stockMovementSchema.index({ shop: 1, product: 1, createdAt: -1 });
stockMovementSchema.index({ shop: 1, ref: 1, reversed: 1 });

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
