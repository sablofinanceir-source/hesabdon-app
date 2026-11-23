import mongoose from 'mongoose';

// شمارنده اتمیک برای شماره فاکتورهای هر فروشگاه
const counterSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, required: true },
  key: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
counterSchema.index({ shop: 1, key: 1 }, { unique: true });

export const Counter = mongoose.model('Counter', counterSchema);

export async function nextSequence(shopId, key) {
  const c = await Counter.findOneAndUpdate({ shop: shopId, key }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return c.seq;
}
