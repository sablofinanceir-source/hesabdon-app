import { AppError } from '../../core/AppError.js';
import { LedgerEntry } from './ledgerEntry.model.js';
import { Party } from './party.model.js';

/** ثبت یک ردیف در دفتر حساب و به‌روزرسانی اتمیک مانده شخص */
export async function postLedger({ shopId, partyId, amount, type, method, ref, refType, note, userId, date }) {
  const party = await Party.findOneAndUpdate({ _id: partyId, shop: shopId }, { $inc: { balance: amount } }, { new: true });
  if (!party) throw AppError.notFound('طرف حساب پیدا نشد', 'PARTY_NOT_FOUND');
  return LedgerEntry.create({
    shop: shopId, party: partyId, type, amount, balanceAfter: party.balance,
    method, ref, refType, note, date: date ?? new Date(), createdBy: userId,
  });
}
