import { z } from 'zod';
import { boolish, dateRange, money, pagination } from '../../core/schemas.js';

const base = {
  title: z.string().trim().min(1).max(150),
  note: z.string().max(500).optional(),
  type: z.enum(['purchase', 'installment', 'bill', 'task', 'cheque', 'other']).default('task'),
  amount: money.optional(),
  dueAt: z.coerce.date(),
  notifyBeforeMinutes: z.number().int().min(0).max(60 * 24 * 30).default(0),
  repeat: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
};

export const createReminderBody = z.object(base);
export const updateReminderBody = z.object(base).partial();

export const listRemindersQuery = z.object({
  done: boolish.optional(),
  type: z.enum(['purchase', 'installment', 'bill', 'task', 'cheque', 'other']).optional(),
  ...dateRange,
  ...pagination,
});
