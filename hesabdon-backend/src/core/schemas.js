import { z } from 'zod';
import { normalizePhone, isMobile } from './phone.js';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'شناسه نامعتبر است');
export const idParams = z.object({ id: objectId });
export const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
export const dateRange = { from: z.coerce.date().optional(), to: z.coerce.date().optional() };
export const money = z.number().finite().min(0);
export const qty = z.number().finite().positive();
// برای query string و multipart که مقدارها رشته می‌آیند
export const boolish = z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]);
export const mobileSchema = z.string().transform(normalizePhone).refine(isMobile, 'شماره موبایل نامعتبر است');
