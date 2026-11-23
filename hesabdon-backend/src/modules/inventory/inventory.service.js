import { AppError } from '../../core/AppError.js';
import { round } from '../../core/math.js';
import { paginate } from '../../core/pagination.js';
import { Product } from '../products/product.model.js';
import { StockMovement } from './stockMovement.model.js';

/**
 * تنها نقطه‌ای که موجودی کالا را تغییر می‌دهد (اتمیک با $inc).
 * اگر کم کردن موجودی باعث منفی شدن شود و allowNegative=false باشد، خطا می‌دهد.
 */
export async function applyStockChange({
  shopId, productId, delta, type, ref, refType, unitCost = 0, note, userId,
  allowNegative = false, reversed = false,
}) {
  delta = round(delta);
  const filter = { _id: productId, shop: shopId };
  if (delta < 0 && !allowNegative) filter.stock = { $gte: -delta };

  const product = await Product.findOneAndUpdate(filter, { $inc: { stock: delta } }, { new: true });
  if (!product) {
    const found = await Product.findOne({ _id: productId, shop: shopId }).select('name stock unit').lean();
    if (!found) throw AppError.notFound('کالا پیدا نشد', 'PRODUCT_NOT_FOUND');
    throw AppError.conflict(`موجودی «${found.name}» کافی نیست (موجودی فعلی: ${found.stock} ${found.unit})`, 'INSUFFICIENT_STOCK', {
      productId: String(productId), available: found.stock, requested: -delta,
    });
  }

  const movement = await StockMovement.create({
    shop: shopId, product: productId, type, quantity: delta, stockAfter: product.stock,
    unitCost, ref, refType, note, reversed, createdBy: userId,
  });
  return { product, movement };
}

/** خنثی کردن یک حرکت قبلی (برای ابطال/ویرایش فاکتور) */
export async function reverseMovement(movement, userId) {
  await applyStockChange({
    shopId: movement.shop, productId: movement.product, delta: -movement.quantity, type: 'reversal',
    ref: movement.ref, refType: movement.refType, userId, allowNegative: true, reversed: true, note: 'برگشت عملیات',
  });
  await StockMovement.updateOne({ _id: movement._id }, { reversed: true });
}

/** اصلاح دستی موجودی: یا تغییر (delta) یا مقدار نهایی (newStock) */
export async function adjustStock(auth, { productId, delta, newStock, note }) {
  const product = await Product.findOne({ _id: productId, shop: auth.shopId }).select('stock buyPrice').lean();
  if (!product) throw AppError.notFound('کالا پیدا نشد', 'PRODUCT_NOT_FOUND');
  const change = newStock !== undefined ? round(newStock - product.stock) : delta;
  if (!change) throw AppError.unprocessable('تغییری برای اعمال وجود ندارد', 'NO_CHANGE');

  const { product: updated, movement } = await applyStockChange({
    shopId: auth.shopId, productId, delta: change, type: 'adjustment',
    unitCost: product.buyPrice, note: note || 'اصلاح موجودی', userId: auth.userId,
  });
  return { product: updated, movement };
}

export async function listMovements(shopId, q) {
  const filter = { shop: shopId };
  if (q.productId) filter.product = q.productId;
  if (q.type) filter.type = q.type;
  if (q.from || q.to) filter.createdAt = { ...(q.from && { $gte: q.from }), ...(q.to && { $lte: q.to }) };
  return paginate(StockMovement, filter, { page: q.page, limit: q.limit, populate: { path: 'product', select: 'name unit' } });
}

/** ارزش کل انبار به قیمت خرید */
export async function valuation(shopId) {
  const products = await Product.find({ shop: shopId, isActive: true, hasRecipe: false, stock: { $gt: 0 } })
    .select('stock buyPrice sellPrice').lean();
  let cost = 0;
  let retail = 0;
  for (const p of products) { cost += p.stock * p.buyPrice; retail += p.stock * p.sellPrice; }
  return { productCount: products.length, costValue: round(cost, 0), retailValue: round(retail, 0) };
}
