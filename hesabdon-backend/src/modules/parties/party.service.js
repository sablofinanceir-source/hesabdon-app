import { AppError } from '../../core/AppError.js';
import { paginate } from '../../core/pagination.js';
import { escapeRegex } from '../../core/text.js';
import { LedgerEntry } from './ledgerEntry.model.js';
import { postLedger } from './ledger.service.js';
import { Party } from './party.model.js';

export async function listParties(shopId, q) {
  const filter = { shop: shopId, isActive: true };
  if (q.type) filter.type = q.type === 'customer' || q.type === 'supplier' ? { $in: [q.type, 'both'] } : q.type;
  if (q.debtors) filter.balance = { $gt: 0 };
  if (q.creditors) filter.balance = { $lt: 0 };
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search.trim()), 'i');
    filter.$or = [{ name: rx }, { phone: rx }];
  }
  return paginate(Party, filter, { page: q.page, limit: q.limit, sort: { name: 1 } });
}

export async function getParty(shopId, id) {
  const party = await Party.findOne({ _id: id, shop: shopId }).lean();
  if (!party) throw AppError.notFound('طرف حساب پیدا نشد', 'PARTY_NOT_FOUND');
  return party;
}

export const createParty = (shopId, data) => Party.create({ ...data, shop: shopId });

export async function updateParty(shopId, id, data) {
  const party = await Party.findOneAndUpdate({ _id: id, shop: shopId }, { $set: data }, { new: true, runValidators: true }).lean();
  if (!party) throw AppError.notFound('طرف حساب پیدا نشد', 'PARTY_NOT_FOUND');
  return party;
}

export async function archiveParty(shopId, id) {
  const party = await getParty(shopId, id);
  if (party.balance !== 0) throw AppError.conflict('این شخص هنوز مانده حساب دارد و قابل حذف نیست', 'PARTY_HAS_BALANCE');
  return Party.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
}

/** گردش حساب (صورت‌حساب) یک شخص */
export async function getLedger(shopId, id, q) {
  const party = await getParty(shopId, id);
  const filter = { shop: shopId, party: id };
  if (q.from || q.to) filter.date = { ...(q.from && { $gte: q.from }), ...(q.to && { $lte: q.to }) };
  const { items, meta } = await paginate(LedgerEntry, filter, { page: q.page, limit: q.limit, sort: { date: -1, _id: -1 } });
  return { party, items, meta };
}

/** ثبت دریافت/پرداخت نقدی (تسویه نسیه) */
export async function recordPayment(auth, id, data) {
  await getParty(auth.shopId, id);
  const received = data.direction === 'received';
  const entry = await postLedger({
    shopId: auth.shopId, partyId: id, amount: received ? -data.amount : data.amount,
    type: received ? 'payment_in' : 'payment_out', method: data.method, note: data.note, date: data.date, userId: auth.userId,
  });
  return { entry, party: await getParty(auth.shopId, id) };
}
