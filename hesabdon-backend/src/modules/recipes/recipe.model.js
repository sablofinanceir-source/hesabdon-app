import mongoose from 'mongoose';

// با فروش هر واحد «product»، مواد اولیه از موجودی کم می‌شود و بهای تمام‌شده محاسبه می‌شود
const recipeSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    ingredients: [
      {
        _id: false,
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 0.0001 },
      },
    ],
    yield: { type: Number, default: 1, min: 0.0001 }, // مقادیر مواد برای تولید چند واحد است
    note: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

recipeSchema.index({ shop: 1, product: 1 }, { unique: true });

export const Recipe = mongoose.model('Recipe', recipeSchema);
