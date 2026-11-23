import { AppError } from '../../core/AppError.js';
import { paginate } from '../../core/pagination.js';
import { Reminder } from './reminder.model.js';
import { getShopPushTokens, sendPush } from './push.service.js';

function advance(date, repeat) {
  const d = new Date(date);
  if (repeat === 'daily') d.setDate(d.getDate() + 1);
  else if (repeat === 'weekly') d.setDate(d.getDate() + 7);
  else if (repeat === 'monthly') d.setMonth(d.getMonth() + 1);
  return d;
}

export async function listReminders(shopId, q) {
  const filter = { shop: shopId };
  if (q.done !== undefined) filter.isDone = q.done;
  if (q.type) filter.type = q.type;
  if (q.from || q.to) filter.dueAt = { ...(q.from && { $gte: q.from }), ...(q.to && { $lte: q.to }) };
  return paginate(Reminder, filter, { page: q.page, limit: q.limit, sort: { dueAt: 1 } });
}

export const createReminder = (shopId, userId, data) => Reminder.create({ ...data, shop: shopId, createdBy: userId });

export async function updateReminder(shopId, id, data) {
  const update = { ...data };
  if (data.dueAt) update.notifiedAt = null; // موعد عوض شد؛ دوباره اعلان بده
  const r = await Reminder.findOneAndUpdate({ _id: id, shop: shopId }, { $set: update }, { new: true, runValidators: true }).lean();
  if (!r) throw AppError.notFound('یادآوری پیدا نشد');
  return r;
}

/** انجام شد: یادآوری تکرارشونده به موعد بعدی می‌رود، بقیه بسته می‌شوند */
export async function completeReminder(shopId, id) {
  const r = await Reminder.findOne({ _id: id, shop: shopId });
  if (!r) throw AppError.notFound('یادآوری پیدا نشد');
  if (r.repeat !== 'none') {
    r.dueAt = advance(r.dueAt, r.repeat);
    r.notifiedAt = null;
  } else {
    r.isDone = true;
    r.doneAt = new Date();
  }
  await r.save();
  return r;
}

export async function deleteReminder(shopId, id) {
  const r = await Reminder.findOneAndDelete({ _id: id, shop: shopId });
  if (!r) throw AppError.notFound('یادآوری پیدا نشد');
  return { deleted: true };
}

/** برای زمان‌بند: یادآوری‌هایی که وقتشان رسیده اعلان می‌گیرند */
export async function processDueReminders(now = new Date()) {
  const due = await Reminder.find({
    isDone: false,
    notifiedAt: null,
    $expr: { $lte: [{ $subtract: ['$dueAt', { $multiply: ['$notifyBeforeMinutes', 60000] }] }, now] },
  }).limit(200);

  const tokensByShop = new Map();
  for (const r of due) {
    const key = String(r.shop);
    if (!tokensByShop.has(key)) tokensByShop.set(key, await getShopPushTokens(r.shop));
    const tokens = tokensByShop.get(key);

    if (tokens.length) {
      await sendPush(tokens, { title: r.title, body: r.note || 'زمان یادآوری رسیده است', data: { type: 'reminder', id: String(r._id) } });
    }

    if (r.repeat !== 'none') {
      // موعدهای گذشته را رد می‌کند تا پشت‌سرهم اعلان نرود
      do { r.dueAt = advance(r.dueAt, r.repeat); } while (r.dueAt < now);
      r.notifiedAt = null;
    } else {
      r.notifiedAt = now;
    }
    await r.save();
  }
  return due.length;
}
