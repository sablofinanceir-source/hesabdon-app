import { z } from 'zod';
import { boolish, dateRange, money, pagination } from '../../core/schemas.js';

const base = {
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(20).optional(),
  type: z.enum(['customer', 'supplier', 'both']).default('customer'),
  address: z.string().trim().max(300).optional(),
  note: z.string().max(500).optional(),
  creditLimit: money.default(0),
};

export const createPartyBody = z.object(base);
export const updatePartyBody = z.object(base).partial();

export const listPartiesQuery = z.object({
  search: z.string().trim().optional(),
  type: z.enum(['customer', 'supplier', 'both']).optional(),
  debtors: boolish.optional(), // فقط کسانی که به ما بدهکارند (نسیه)
  creditors: boolish.optional(), // فقط کسانی که ما به آن‌ها بدهکاریم
  ...pagination,
});

export const ledgerQuery = z.object({ ...dateRange, ...pagination });

export const paymentBody = z.object({
  direction: z.enum(['received', 'paid']), // received: از او دریافت کردیم، paid: به او پرداختیم
  amount: z.number().finite().positive(),
  method: z.enum(['cash', 'card', 'transfer', 'cheque']).default('cash'),
  note: z.string().max(300).optional(),
  date: z.coerce.date().optional(),
});
