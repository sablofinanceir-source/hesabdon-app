import mongoose from 'mongoose';
import { AppError } from '../../core/AppError.js';
import { paginate } from '../../core/pagination.js';
import { endOfTehranDay } from '../../core/time.js';
import { postLedger } from '../parties/ledger.service.js';
import { Party } from '../parties/party.model.js';
import { Reminder } from '../reminders/reminder.model.js';
import { Cheque } from './cheque.model.js';

async function assertParty(shopId, partyId) {
  if (partyId && !(await Party.exists({ _id: partyId, shop: shopId }))) throw AppError.notFound('طرف حساب پیدا نشد', 'PARTY_NOT_FOUND');
}

export async function listCheques(shopId, q) {
  const filter = { shop: shopId };
  for (const k of ['direction', 'status']) if (q[k]) filter[k] = q[k];
  if (q.partyId) filter.party = q.partyId;
  if (q.search) filter.$or = [{ number: q.search }, { partyName: new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }];
  if (q.from || q.to) filter.dueDate = { ...(q.from && { $gte: q.from }), ...(q.to && { $lte: q.to }) };
  return paginate(Cheque, filter, { page: q.page, limit: q.limit, sort: { dueDate: 1 }, populate: { path: 'party', select: 'name phone' } });
}

export async function getCheque(shopId, id) {
  const cheque = await Cheque.findOne({ _id: id, shop: shopId }).populate('party', 'name phone').lean();
  if (!cheque) throw AppError.notFound('چک پیدا نشد');
  return cheque;
}

export async function createCheque(auth, { remindBeforeDays, partyId, ...data }) {
  await assertParty(auth.shopId, partyId);
  const cheque = await Cheque.create({ ...data, party: partyId, shop: auth.shopId, createdBy: auth.userId });

  // یادآوری خودکار سررسید
  await Reminder.create({
    shop: auth.shopId, createdBy: auth.userId, type: 'cheque', ref: cheque._id, refType: 'Cheque',
    title: `سررسید چک ${cheque.direction === 'received' ? 'دریافتی' : 'پرداختی'}`,
    note: `${cheque.partyName ?? ''} ${cheque.number ? `- شماره ${cheque.number}` : ''}`.trim(),
    amount: cheque.amount, dueAt: cheque.dueDate, notifyBeforeMinutes: remindBeforeDays * 1440,
  });
  return cheque;
}

export async function updateCheque(shopId, id, { partyId, ...data }) {
  const cheque = await Cheque.findOne({ _id: id, shop: shopId });
  if (!cheque) throw AppError.notFound('چک پیدا نشد');
  if (cheque.status !== 'pending') throw AppError.conflict('چک تعیین تکلیف‌شده قابل ویرایش نیست', 'CHEQUE_SETTLED');
  if (partyId) { await assertParty(shopId, partyId); cheque.party = partyId; }
  cheque.set(data);
  await cheque.save();
  if (data.dueDate) await Reminder.updateMany({ shop: shopId, refType: 'Cheque', ref: id }, { dueAt: data.dueDate, notifiedAt: null });
  return cheque;
}

export async function changeStatus(auth, id, { status, applyToLedger }) {
  const cheque = await Cheque.findOne({ _id: id, shop: auth.shopId });
  if (!cheque) throw AppError.notFound('چک پیدا نشد');
  if (cheque.status === status) return cheque;

  if (status === 'cashed' && applyToLedger && cheque.party && !cheque.ledgerApplied) {
    const received = cheque.direction === 'received';
    await postLedger({
      shopId: auth.shopId, partyId: cheque.party, amount: received ? -cheque.amount : cheque.amount,
      type: received ? 'payment_in' : 'payment_out', method: 'cheque', ref: cheque._id, refType: 'Cheque',
      note: `وصول چک ${cheque.number ?? ''}`.trim(), userId: auth.userId,
    });
    cheque.ledgerApplied = true;
  }

  cheque.status = status;
  cheque.settledAt = status === 'pending' ? undefined : new Date();
  await cheque.save();

  // وقتی تعیین تکلیف شد، یادآوری‌اش بسته می‌شود
  await Reminder.updateMany(
    { shop: auth.shopId, refType: 'Cheque', ref: id },
    status === 'pending' ? { isDone: false, doneAt: null } : { isDone: true, doneAt: new Date() },
  );
  return cheque;
}

export async function deleteCheque(shopId, id) {
  const cheque = await Cheque.findOne({ _id: id, shop: shopId });
  if (!cheque) throw AppError.notFound('چک پیدا نشد');
  if (cheque.ledgerApplied) throw AppError.conflict('این چک روی حساب شخص اثر گذاشته و قابل حذف نیست', 'CHEQUE_IN_LEDGER');
  await cheque.deleteOne();
  await Reminder.deleteMany({ shop: shopId, refType: 'Cheque', ref: id });
  return { deleted: true };
}

/** خلاصه وضعیت چک‌ها برای داشبورد */
export async function summary(shopId) {
  const now = new Date();
  const in7days = endOfTehranDay(new Date(Date.now() + 7 * 86400000));
  const [byDirection, overdue, dueSoon] = await Promise.all([
    Cheque.aggregate([
      { $match: { shop: new mongoose.Types.ObjectId(shopId), status: 'pending' } },
      { $group: { _id: '$direction', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
    Cheque.countDocuments({ shop: shopId, status: 'pending', dueDate: { $lt: now } }),
    Cheque.countDocuments({ shop: shopId, status: 'pending', dueDate: { $gte: now, $lte: in7days } }),
  ]);
  const pick = (d) => byDirection.find((x) => x._id === d) ?? { count: 0, total: 0 };
  return {
    pendingReceived: { count: pick('received').count, total: pick('received').total },
    pendingIssued: { count: pick('issued').count, total: pick('issued').total },
    overdue,
    dueWithin7Days: dueSoon,
  };
}
