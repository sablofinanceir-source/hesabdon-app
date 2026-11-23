import { z } from 'zod';
import { dateRange, money, objectId, pagination, qty } from '../../core/schemas.js';
import { PAYMENT_METHODS } from './invoice.model.js';

const itemInput = z.object({
  productId: objectId,
  quantity: qty,
  unitPrice: money.optional(), // اگر نباشد قیمت پیش‌فرض کالا استفاده می‌شود
  discount: money.optional(),
});

export const createInvoiceBody = z.object({
  type: z.enum(['sale', 'purchase']),
  partyId: objectId.optional(),
  items: z.array(itemInput).max(200).default([]),
  discount: money.default(0),
  note: z.string().max(500).optional(),
  date: z.coerce.date().optional(),
  status: z.enum(['open', 'finalized']).default('open'),
  paidAmount: money.optional(), // اگر نباشد، کل مبلغ پرداخت‌شده فرض می‌شود
  paymentMethod: z.enum(PAYMENT_METHODS).default('cash'),
});

export const updateInvoiceBody = createInvoiceBody.omit({ type: true, status: true }).partial();

export const addItemBody = z
  .object({
    productId: objectId.optional(),
    barcode: z.string().trim().min(1).max(64).optional(), // اسکن بارکد
    quantity: qty.default(1),
    unitPrice: money.optional(),
    discount: money.optional(),
  })
  .refine((d) => d.productId || d.barcode, { message: 'productId یا barcode الزامی است' });

export const updateItemBody = z.object({ quantity: qty.optional(), unitPrice: money.optional(), discount: money.optional() });

export const finalizeBody = z.object({
  partyId: objectId.optional(),
  paidAmount: money.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  discount: money.optional(),
  note: z.string().max(500).optional(),
});

export const voidBody = z.object({ reason: z.string().max(300).optional() });

export const itemParams = z.object({ id: objectId, itemId: objectId });

export const listInvoicesQuery = z.object({
  type: z.enum(['sale', 'purchase']).optional(),
  status: z.enum(['open', 'finalized', 'void']).optional(),
  source: z.enum(['manual', 'voice']).optional(),
  partyId: objectId.optional(),
  number: z.coerce.number().int().optional(),
  ...dateRange,
  ...pagination,
});

export const receiptQuery = z.object({ format: z.enum(['json', 'html']).default('json') });
