import mongoose from 'mongoose';
import { round } from '../../core/math.js';
import { endOfTehranDay, startOfTehranDay } from '../../core/time.js';
import { Cheque } from '../cheques/cheque.model.js';
import { Invoice } from '../invoices/invoice.model.js';
import { Party } from '../parties/party.model.js';
import { Product } from '../products/product.model.js';
import { Reminder } from '../reminders/reminder.model.js';

const oid = (id) => new mongoose.Types.ObjectId(id);
// بازه پیش‌فرض: ۳۰ روز گذشته
const range = ({ from, to }) => ({ $gte: from ?? new Date(Date.now() - 30 * 86400000), $lte: to ?? new Date() });
const baseMatch = (shopId, q, type) => ({ shop: oid(shopId), status: 'finalized', type, date: range(q) });
const EMPTY = { count: 0, revenue: 0, cost: 0, discount: 0, collected: 0 };

async function totalsFor(shopId, q, type) {
  const [row] = await Invoice.aggregate([
    { $match: baseMatch(shopId, q, type) },
    { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total' }, cost: { $sum: '$costTotal' }, discount: { $sum: '$discount' }, collected: { $sum: '$paidAmount' } } },
  ]);
  return row ?? EMPTY;
}

/** خلاصه فروش، سود ناخالص و خرید در یک بازه */
export async function summary(shopId, q) {
  const [s, p] = await Promise.all([totalsFor(shopId, q, 'sale'), totalsFor(shopId, q, 'purchase')]);
  const grossProfit = round(s.revenue - s.cost, 2);
  return {
    sales: { count: s.count, revenue: s.revenue, discount: s.discount, collected: s.collected, onCredit: round(s.revenue - s.collected, 2) },
    grossProfit,
    marginPercent: s.revenue ? round((grossProfit / s.revenue) * 100, 1) : 0,
    purchases: { count: p.count, total: p.revenue, paid: p.collected },
  };
}

/** روند فروش به تفکیک روز یا ماه (میلادی؛ تبدیل به شمسی در اپ انجام شود) */
export function salesByPeriod(shopId, q) {
  return Invoice.aggregate([
    { $match: baseMatch(shopId, q, 'sale') },
    {
      $group: {
        _id: { $dateToString: { format: q.groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d', date: '$date', timezone: 'Asia/Tehran' } },
        count: { $sum: 1 }, revenue: { $sum: '$total' }, profit: { $sum: { $subtract: ['$total', '$costTotal'] } },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, period: '$_id', count: 1, revenue: 1, profit: 1 } },
  ]);
}

export function topProducts(shopId, q) {
  return Invoice.aggregate([
    { $match: baseMatch(shopId, q, 'sale') },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product', name: { $first: '$items.name' }, unit: { $first: '$items.unit' },
        quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.total' },
        profit: { $sum: { $subtract: ['$items.total', { $multiply: ['$items.quantity', '$items.unitCost'] }] } },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: q.limit },
    { $project: { _id: 0, productId: '$_id', name: 1, unit: 1, quantity: 1, revenue: 1, profit: 1 } },
  ]);
}

/** کالاهای رو به اتمام (موجودی ≤ حداقل موجودی) */
export const lowStock = (shopId) =>
  Product.find({ shop: shopId, isActive: true, hasRecipe: false, $expr: { $lte: ['$stock', '$minStock'] } })
    .select('name unit stock minStock barcode').sort({ stock: 1 }).limit(200).lean();

/** مانده حساب‌ها: چه کسانی بدهکارند و ما به چه کسانی بدهکاریم */
export async function balances(shopId) {
  const [debtors, creditors] = await Promise.all([
    Party.find({ shop: shopId, isActive: true, balance: { $gt: 0 } }).select('name phone balance').sort({ balance: -1 }).limit(200).lean(),
    Party.find({ shop: shopId, isActive: true, balance: { $lt: 0 } }).select('name phone balance').sort({ balance: 1 }).limit(200).lean(),
  ]);
  const sum = (list) => list.reduce((s, p) => s + Math.abs(p.balance), 0);
  return { receivable: { total: sum(debtors), parties: debtors }, payable: { total: sum(creditors), parties: creditors } };
}

/** داده صفحه اصلی اپ */
export async function dashboard(shopId) {
  const now = new Date();
  const today = { from: startOfTehranDay(now), to: now };
  const [todaySummary, lowCount, bal, chequesDue, remindersDue] = await Promise.all([
    summary(shopId, today),
    Product.countDocuments({ shop: shopId, isActive: true, hasRecipe: false, $expr: { $lte: ['$stock', '$minStock'] } }),
    Party.aggregate([
      { $match: { shop: oid(shopId), isActive: true } },
      { $group: { _id: null, receivable: { $sum: { $cond: [{ $gt: ['$balance', 0] }, '$balance', 0] } }, payable: { $sum: { $cond: [{ $lt: ['$balance', 0] }, { $abs: '$balance' }, 0] } } } },
    ]),
    Cheque.countDocuments({ shop: shopId, status: 'pending', dueDate: { $lte: endOfTehranDay(new Date(Date.now() + 7 * 86400000)) } }),
    Reminder.countDocuments({ shop: shopId, isDone: false, dueAt: { $lte: endOfTehranDay(now) } }),
  ]);
  return {
    today: todaySummary,
    lowStockCount: lowCount,
    receivable: bal[0]?.receivable ?? 0,
    payable: bal[0]?.payable ?? 0,
    chequesDueWithin7Days: chequesDue,
    remindersDueToday: remindersDue,
  };
}
