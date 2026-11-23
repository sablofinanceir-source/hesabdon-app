import { AppError } from '../../core/AppError.js';
import { paginate } from '../../core/pagination.js';
import { escapeRegex } from '../../core/text.js';
import { applyStockChange } from '../inventory/inventory.service.js';
import { getShopPlan } from '../shops/shop.service.js';
import { Product } from './product.model.js';

export async function listProducts(shopId, q) {
  const filter = { shop: shopId, isActive: q.active ?? true };
  if (q.category) filter.category = q.category;
  if (q.search) {
    const term = q.search.trim();
    const rx = new RegExp(escapeRegex(term), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { barcode: term }];
  }
  if (q.lowStock) {
    filter.hasRecipe = false;
    filter.$expr = { $lte: ['$stock', '$minStock'] };
  }
  return paginate(Product, filter, { page: q.page, limit: q.limit, sort: { name: 1 } });
}

export const listCategories = (shopId) => Product.distinct('category', { shop: shopId, isActive: true, category: { $ne: null } });

export async function getProduct(shopId, id) {
  const product = await Product.findOne({ _id: id, shop: shopId }).lean();
  if (!product) throw AppError.notFound('کالا پیدا نشد');
  return product;
}

export async function getByBarcode(shopId, code) {
  const product = await Product.findOne({ shop: shopId, barcode: code, isActive: true }).lean();
  if (!product) throw AppError.notFound('کالایی با این بارکد ثبت نشده است', 'BARCODE_NOT_FOUND');
  return product;
}

export async function createProduct(auth, data) {
  const plan = await getShopPlan(auth.shopId);
  if (plan.maxProducts !== null) {
    const count = await Product.countDocuments({ shop: auth.shopId, isActive: true });
    if (count >= plan.maxProducts) {
      throw new AppError(`در طرح رایگان حداکثر ${plan.maxProducts} کالا مجاز است`, 402, 'PRODUCT_LIMIT_REACHED');
    }
  }

  const { initialStock, ...fields } = data;
  if (!fields.barcode) delete fields.barcode;
  if (!fields.sku) delete fields.sku;

  const product = await Product.create({ ...fields, shop: auth.shopId });
  if (initialStock > 0) {
    await applyStockChange({
      shopId: auth.shopId, productId: product._id, delta: initialStock,
      type: 'initial', unitCost: product.buyPrice, userId: auth.userId, note: 'موجودی اولیه',
    });
  }
  return Product.findById(product._id).lean();
}

export async function updateProduct(shopId, id, data) {
  const update = { $set: { ...data } };
  if ('barcode' in data && !data.barcode) { delete update.$set.barcode; update.$unset = { barcode: 1 }; }
  if ('sku' in data && !data.sku) { delete update.$set.sku; update.$unset = { ...update.$unset, sku: 1 }; }

  const product = await Product.findOneAndUpdate({ _id: id, shop: shopId }, update, { new: true, runValidators: true }).lean();
  if (!product) throw AppError.notFound('کالا پیدا نشد');
  return product;
}

// حذف نرم: سابقه فاکتورها و گزارش‌ها حفظ می‌شود
export async function archiveProduct(shopId, id) {
  const product = await Product.findOneAndUpdate({ _id: id, shop: shopId }, { isActive: false }, { new: true }).lean();
  if (!product) throw AppError.notFound('کالا پیدا نشد');
  return product;
}
