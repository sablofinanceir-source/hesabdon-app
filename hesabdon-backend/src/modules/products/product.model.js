import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true, trim: true },
    barcode: { type: String, trim: true },
    sku: { type: String, trim: true },
    unit: { type: String, default: 'عدد', trim: true },
    category: { type: String, trim: true },
    buyPrice: { type: Number, default: 0, min: 0 },
    sellPrice: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0 }, // فقط از طریق inventory.service تغییر می‌کند
    minStock: { type: Number, default: 0, min: 0 }, // آستانه «رو به اتمام»
    hasRecipe: { type: Boolean, default: false }, // کالاهای دارای «دستور ساخت»
    isActive: { type: Boolean, default: true },
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

productSchema.index({ shop: 1, name: 1 });
// بارکد در هر فروشگاه یکتاست (کالاهای بدون بارکد مشکلی ندارند)
productSchema.index(
  { shop: 1, barcode: 1 },
  { unique: true, partialFilterExpression: { barcode: { $type: 'string' } } },
);

export const Product = mongoose.model('Product', productSchema);
