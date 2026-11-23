import { AppError } from '../../core/AppError.js';
import { round } from '../../core/math.js';
import { paginate } from '../../core/pagination.js';
import { assertCan, can } from '../../middlewares/permission.js';
import { PERMISSIONS as P } from '../../config/permissions.js';
import { applyStockChange, reverseMovement } from '../inventory/inventory.service.js';
import { StockMovement } from '../inventory/stockMovement.model.js';
import { postLedger } from '../parties/ledger.service.js';
import { Party } from '../parties/party.model.js';
import { Product } from '../products/product.model.js';
import { computeRecipeCost, getRecipeByProduct } from '../recipes/recipe.service.js';
import { nextSequence } from '../shops/counter.model.js';
import { getShop } from '../shops/shop.service.js';
import { Invoice } from './invoice.model.js';

const UNDO_WINDOW_MS = 10 * 60 * 1000; // ثبت‌کننده تا ۱۰ دقیقه می‌تواند فاکتور خودش را برگرداند
const CREATE_PERMISSION = { sale: P.SALES_CREATE, purchase: P.PURCHASES_CREATE };

// ---------------------------------------------------------------- helpers

async function loadInvoice(auth, id) {
  const inv = await Invoice.findOne({ _id: id, shop: auth.shopId });
  if (!inv) throw AppError.notFound('فاکتور پیدا نشد', 'INVOICE_NOT_FOUND');
  assertCan(auth, CREATE_PERMISSION[inv.type]);
  return inv;
}

/** ویرایش/ابطال فاکتور ثبت‌شده: مجوز sales.void، یا ثبت‌کننده در بازه کوتاه (برای «برگشت» ثبت صوتی) */
function assertCanModifyFinalized(auth, inv) {
  const recentOwn = String(inv.createdBy) === auth.userId && Date.now() - inv.createdAt.getTime() < UNDO_WINDOW_MS;
  if (!recentOwn) assertCan(auth, P.SALES_VOID);
}

async function assertParty(shopId, partyId) {
  if (!partyId) return;
  if (!(await Party.exists({ _id: partyId, shop: shopId, isActive: true }))) {
    throw AppError.notFound('طرف حساب پیدا نشد', 'PARTY_NOT_FOUND');
  }
}

async function findProduct(shopId, { productId, barcode }) {
  const filter = productId ? { _id: productId } : { barcode };
  const product = await Product.findOne({ ...filter, shop: shopId, isActive: true });
  if (!product) {
    throw AppError.notFound(barcode ? 'کالایی با این بارکد ثبت نشده است' : 'کالا پیدا نشد', barcode ? 'BARCODE_NOT_FOUND' : 'PRODUCT_NOT_FOUND');
  }
  return product;
}

/** ورودی خام آیتم‌ها → آیتم‌های کامل با قیمت و بهای تمام‌شده */
async function resolveItems(shopId, type, rawItems) {
  const ids = [...new Set(rawItems.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: ids }, shop: shopId, isActive: true });
  const map = new Map(products.map((p) => [String(p._id), p]));

  const items = [];
  for (const raw of rawItems) {
    const p = map.get(raw.productId);
    if (!p) throw AppError.notFound('یکی از کالاها پیدا نشد یا غیرفعال است', 'PRODUCT_NOT_FOUND', { productId: raw.productId });
    const unitPrice = raw.unitPrice ?? (type === 'sale' ? p.sellPrice : p.buyPrice);
    let unitCost = type === 'sale' ? p.buyPrice : unitPrice;
    if (type === 'sale' && p.hasRecipe) unitCost = (await computeRecipeCost(shopId, p._id)) ?? p.buyPrice;
    items.push(buildItem(p, { quantity: raw.quantity, unitPrice, unitCost, discount: raw.discount ?? 0 }));
  }
  return items;
}

const lineTotal = (quantity, unitPrice, discount) => Math.max(0, round(quantity * unitPrice - discount, 2));

function buildItem(p, { quantity, unitPrice, unitCost, discount }) {
  return {
    product: p._id, name: p.name, unit: p.unit, quantity: round(quantity),
    unitPrice, unitCost, discount, total: lineTotal(quantity, unitPrice, discount),
  };
}

function computeTotals(inv) {
  inv.subtotal = round(inv.items.reduce((s, i) => s + i.total, 0), 2);
  inv.total = Math.max(0, round(inv.subtotal - (inv.discount || 0), 2));
  inv.costTotal = inv.type === 'sale' ? round(inv.items.reduce((s, i) => s + i.quantity * i.unitCost, 0), 2) : 0;
}

/** اعتبارسنجی پیش از ثبت نهایی */
async function validateFinalize(inv) {
  if (!inv.items.length) throw AppError.unprocessable('فاکتور بدون کالا قابل ثبت نیست', 'EMPTY_INVOICE');
  if (inv.paidAmount > inv.total) throw AppError.unprocessable('مبلغ پرداختی بیشتر از جمع فاکتور است', 'OVERPAID');

  const remaining = round(inv.total - inv.paidAmount, 2);
  if (remaining <= 0) return;
  if (!inv.party) {
    throw AppError.unprocessable('برای مبلغ باقی‌مانده (نسیه) باید طرف حساب انتخاب شود', 'PARTY_REQUIRED');
  }
  const party = await Party.findOne({ _id: inv.party, shop: inv.shop }).lean();
  if (!party) throw AppError.notFound('طرف حساب پیدا نشد', 'PARTY_NOT_FOUND');
  if (inv.type === 'sale' && party.creditLimit > 0 && party.balance + remaining > party.creditLimit) {
    throw AppError.conflict('با این فاکتور سقف اعتبار مشتری رد می‌شود', 'CREDIT_LIMIT_EXCEEDED', {
      creditLimit: party.creditLimit, balance: party.balance, remaining,
    });
  }
}

// ---------------------------------------------------------------- اثرهای فاکتور روی انبار و حساب

async function applyEffects(inv, { userId, shop }) {
  const applied = [];
  const meta = { shopId: inv.shop, ref: inv._id, refType: 'Invoice', userId };
  const allowNegative = shop.settings?.allowNegativeStock ?? false;

  try {
    for (const item of inv.items) {
      if (inv.type === 'purchase') {
        applied.push(await applyStockChange({ ...meta, productId: item.product, delta: item.quantity, type: 'purchase', unitCost: item.unitPrice }));
        if (shop.settings?.updateBuyPriceOnPurchase) {
          await Product.updateOne({ _id: item.product, shop: inv.shop }, { buyPrice: item.unitPrice });
        }
        continue;
      }

      const recipe = await getRecipeByProduct(inv.shop, item.product);
      if (recipe) {
        // کالای دارای دستور ساخت: مواد اولیه مصرف می‌شود، نه خود کالا
        for (const ing of recipe.ingredients) {
          applied.push(await applyStockChange({
            ...meta, productId: ing.product, delta: -round((ing.quantity * item.quantity) / recipe.yield),
            type: 'recipe_consume', allowNegative, note: `مصرف برای ${item.name}`,
          }));
        }
      } else {
        applied.push(await applyStockChange({
          ...meta, productId: item.product, delta: -item.quantity, type: 'sale', unitCost: item.unitCost, allowNegative,
        }));
      }
    }

    const remaining = round(inv.total - inv.paidAmount, 2);
    inv.ledgerEffect = { party: undefined, amount: 0 };
    if (remaining > 0 && inv.party) {
      // فروش نسیه: مشتری بدهکار می‌شود (+) | خرید نسیه: ما بدهکار می‌شویم (−)
      const amount = inv.type === 'sale' ? remaining : -remaining;
      await postLedger({
        shopId: inv.shop, partyId: inv.party, amount, type: 'invoice', ref: inv._id, refType: 'Invoice', userId,
        note: `فاکتور ${inv.type === 'sale' ? 'فروش' : 'خرید'} شماره ${inv.number ?? ''}`.trim(),
      });
      inv.ledgerEffect = { party: inv.party, amount };
    }
  } catch (err) {
    for (const a of applied.reverse()) await reverseMovement(a.movement, userId).catch((e) => console.error('rollback failed', e));
    throw err;
  }
}

async function reverseEffects(inv, userId) {
  const movements = await StockMovement.find({ shop: inv.shop, ref: inv._id, refType: 'Invoice', reversed: false });
  for (const m of movements) await reverseMovement(m, userId);

  if (inv.ledgerEffect?.party && inv.ledgerEffect.amount) {
    await postLedger({
      shopId: inv.shop, partyId: inv.ledgerEffect.party, amount: -inv.ledgerEffect.amount, type: 'reversal',
      ref: inv._id, refType: 'Invoice', userId, note: `برگشت فاکتور شماره ${inv.number ?? ''}`.trim(),
    });
  }
  inv.ledgerEffect = { party: undefined, amount: 0 };
}

// ---------------------------------------------------------------- عملیات اصلی

export async function createInvoice(auth, body) {
  assertCan(auth, CREATE_PERMISSION[body.type]);
  await assertParty(auth.shopId, body.partyId);

  const inv = new Invoice({
    shop: auth.shopId, type: body.type, party: body.partyId, discount: body.discount ?? 0,
    note: body.note, date: body.date, paymentMethod: body.paymentMethod, source: body.source ?? 'manual',
    voiceTranscript: body.voiceTranscript, createdBy: auth.userId, status: 'open',
    items: await resolveItems(auth.shopId, body.type, body.items ?? []),
  });
  computeTotals(inv);
  await inv.save();

  if (body.status !== 'finalized') return inv;
  try {
    return await finalizeInvoice(auth, inv.id, { paidAmount: body.paidAmount });
  } catch (err) {
    await Invoice.deleteOne({ _id: inv._id }); // ثبت مستقیم نهایی ناموفق بود؛ پیش‌نویس نیمه‌کاره نماند
    throw err;
  }
}

export async function finalizeInvoice(auth, id, body = {}) {
  const inv = await loadInvoice(auth, id);
  if (inv.status !== 'open') throw AppError.conflict('این فاکتور باز نیست', 'INVOICE_NOT_OPEN');

  if (body.partyId) { await assertParty(auth.shopId, body.partyId); inv.party = body.partyId; }
  if (body.discount !== undefined) inv.discount = body.discount;
  if (body.note !== undefined) inv.note = body.note;
  if (body.paymentMethod) inv.paymentMethod = body.paymentMethod;
  computeTotals(inv);
  inv.paidAmount = body.paidAmount ?? inv.total;
  await validateFinalize(inv);

  const shop = await getShop(auth.shopId);
  inv.number = await nextSequence(auth.shopId, `invoice:${inv.type}`);
  await applyEffects(inv, { userId: auth.userId, shop });

  inv.status = 'finalized';
  inv.finalizedAt = new Date();
  try {
    await inv.save();
  } catch (err) {
    await reverseEffects(inv, auth.userId);
    throw err;
  }
  return inv;
}

const SNAPSHOT_FIELDS = ['items', 'party', 'discount', 'subtotal', 'total', 'costTotal', 'paidAmount', 'paymentMethod', 'note', 'date'];

/** ویرایش فاکتور (باز یا ثبت‌شده). برای ثبت‌شده: اثرها برگردانده و دوباره با داده جدید اعمال می‌شود. */
export async function updateInvoice(auth, id, body) {
  const inv = await loadInvoice(auth, id);
  if (inv.status === 'void') throw AppError.conflict('فاکتور باطل‌شده قابل ویرایش نیست', 'INVOICE_VOID');

  const finalized = inv.status === 'finalized';
  if (finalized) assertCanModifyFinalized(auth, inv);
  if (body.partyId !== undefined) await assertParty(auth.shopId, body.partyId);

  const shop = await getShop(auth.shopId);
  const plain = finalized ? inv.toObject() : null;
  const snapshot = finalized ? Object.fromEntries(SNAPSHOT_FIELDS.map((k) => [k, plain[k]])) : null;
  const wasFullyPaid = inv.paidAmount >= inv.total;
  if (finalized) await reverseEffects(inv, auth.userId);

  try {
    if (body.partyId !== undefined) inv.party = body.partyId;
    if (body.items) inv.items = await resolveItems(auth.shopId, inv.type, body.items);
    for (const k of ['discount', 'note', 'date', 'paymentMethod']) if (body[k] !== undefined) inv[k] = body[k];
    computeTotals(inv);

    if (finalized) {
      inv.paidAmount = body.paidAmount ?? (wasFullyPaid ? inv.total : Math.min(inv.paidAmount, inv.total));
      await validateFinalize(inv);
      await applyEffects(inv, { userId: auth.userId, shop });
    }
    await inv.save();
    return inv;
  } catch (err) {
    if (finalized) {
      // بازگرداندن وضعیت قبلی تا داده ناسازگار نماند
      inv.set(snapshot);
      await applyEffects(inv, { userId: auth.userId, shop })
        .then(() => inv.save())
        .catch((e) => console.error('restore after failed edit failed', e));
    }
    throw err;
  }
}

export async function voidInvoice(auth, id, reason) {
  const inv = await loadInvoice(auth, id);
  if (inv.status === 'void') throw AppError.conflict('فاکتور قبلاً باطل شده است', 'INVOICE_VOID');
  if (inv.status === 'open') throw AppError.conflict('فاکتور باز را حذف کنید (ابطال فقط برای فاکتور ثبت‌شده است)', 'INVOICE_OPEN');
  assertCanModifyFinalized(auth, inv);

  await reverseEffects(inv, auth.userId);
  inv.status = 'void';
  inv.voidedAt = new Date();
  inv.voidedBy = auth.userId;
  inv.voidReason = reason;
  await inv.save();
  return inv;
}

export async function deleteOpenInvoice(auth, id) {
  const inv = await loadInvoice(auth, id);
  if (inv.status !== 'open') throw AppError.conflict('فقط فاکتور باز قابل حذف است', 'INVOICE_NOT_OPEN');
  await inv.deleteOne();
  return { deleted: true };
}

// ---------------------------------------------------------------- مدیریت آیتم‌های فاکتور باز (اسکن بارکد)

function assertOpen(inv) {
  if (inv.status !== 'open') throw AppError.conflict('فقط فاکتور باز قابل تغییر آیتم است', 'INVOICE_NOT_OPEN');
}

export async function addItem(auth, id, body) {
  const inv = await loadInvoice(auth, id);
  assertOpen(inv);

  const product = await findProduct(auth.shopId, body);
  const [fresh] = await resolveItems(auth.shopId, inv.type, [
    { productId: String(product._id), quantity: body.quantity, unitPrice: body.unitPrice, discount: body.discount },
  ]);

  // اسکن مجدد همان کالا با همان قیمت → فقط تعداد زیاد می‌شود
  const existing = inv.items.find((i) => String(i.product) === String(fresh.product) && i.unitPrice === fresh.unitPrice && !i.discount && !fresh.discount);
  if (existing) {
    existing.quantity = round(existing.quantity + fresh.quantity);
    existing.total = lineTotal(existing.quantity, existing.unitPrice, 0);
  } else {
    inv.items.push(fresh);
  }
  computeTotals(inv);
  await inv.save();
  return inv;
}

export async function updateItem(auth, id, itemId, body) {
  const inv = await loadInvoice(auth, id);
  assertOpen(inv);
  const item = inv.items.id(itemId);
  if (!item) throw AppError.notFound('آیتم فاکتور پیدا نشد');
  for (const k of ['quantity', 'unitPrice', 'discount']) if (body[k] !== undefined) item[k] = body[k];
  item.total = lineTotal(item.quantity, item.unitPrice, item.discount);
  computeTotals(inv);
  await inv.save();
  return inv;
}

export async function removeItem(auth, id, itemId) {
  const inv = await loadInvoice(auth, id);
  assertOpen(inv);
  if (!inv.items.id(itemId)) throw AppError.notFound('آیتم فاکتور پیدا نشد');
  inv.items.pull(itemId);
  computeTotals(inv);
  await inv.save();
  return inv;
}

// ---------------------------------------------------------------- خواندن

export async function getInvoice(auth, id) {
  const inv = await Invoice.findOne({ _id: id, shop: auth.shopId }).populate('party', 'name phone balance').lean();
  if (!inv) throw AppError.notFound('فاکتور پیدا نشد', 'INVOICE_NOT_FOUND');
  assertCan(auth, CREATE_PERMISSION[inv.type]);
  return inv;
}

export async function listInvoices(auth, q) {
  const filter = { shop: auth.shopId };
  if (q.type) filter.type = q.type;
  else {
    // کاربر فقط انواعی را می‌بیند که مجوزش را دارد
    const types = Object.keys(CREATE_PERMISSION).filter((t) => can(auth, CREATE_PERMISSION[t]));
    filter.type = { $in: types };
  }
  if (q.status) filter.status = q.status;
  if (q.source) filter.source = q.source;
  if (q.partyId) filter.party = q.partyId;
  if (q.number) filter.number = q.number;
  if (q.from || q.to) filter.date = { ...(q.from && { $gte: q.from }), ...(q.to && { $lte: q.to }) };
  return paginate(Invoice, filter, { page: q.page, limit: q.limit, sort: { date: -1, _id: -1 }, populate: { path: 'party', select: 'name phone' } });
}

export async function buildReceipt(auth, id) {
  const invoice = await getInvoice(auth, id);
  const shop = await getShop(auth.shopId);
  return {
    shop: { name: shop.name, phone: shop.phone, address: shop.address, footer: shop.settings?.receiptFooter, currency: shop.currency },
    invoice,
  };
}
