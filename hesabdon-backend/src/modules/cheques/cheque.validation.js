import { z } from 'zod';
import { dateRange, money, objectId, pagination } from '../../core/schemas.js';

const base = {
  direction: z.enum(['received', 'issued']),
  partyId: objectId.optional(),
  partyName: z.string().trim().max(100).optional(),
  amount: money.refine((v) => v > 0, 'مبلغ باید بیشتر از صفر باشد'),
  number: z.string().trim().max(40).optional(),
  bank: z.string().trim().max(60).optional(),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date(),
  note: z.string().max(500).optional(),
};

export const createChequeBody = z
  .object({ ...base, remindBeforeDays: z.number().int().min(0).max(30).default(1) })
  .refine((d) => d.partyId || d.partyName, { message: 'طرف حساب (partyId یا partyName) الزامی است' });

export const updateChequeBody = z.object(base).partial();

export const changeStatusBody = z.object({
  status: z.enum(['pending', 'cashed', 'bounced', 'returned']),
  applyToLedger: z.boolean().default(false), // با وصول، پرداخت/دریافت در حساب شخص ثبت شود
});

export const listChequesQuery = z.object({
  direction: z.enum(['received', 'issued']).optional(),
  status: z.enum(['pending', 'cashed', 'bounced', 'returned']).optional(),
  partyId: objectId.optional(),
  search: z.string().trim().optional(),
  ...dateRange, // روی تاریخ سررسید
  ...pagination,
});
