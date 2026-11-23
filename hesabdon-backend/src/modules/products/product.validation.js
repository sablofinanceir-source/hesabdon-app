import { z } from 'zod';
import { boolish, money, pagination } from '../../core/schemas.js';

const base = {
  name: z.string().trim().min(1).max(120),
  barcode: z.string().trim().max(64).optional(),
  sku: z.string().trim().max(64).optional(),
  unit: z.string().trim().min(1).max(20).default('عدد'),
  category: z.string().trim().max(60).optional(),
  buyPrice: money.default(0),
  sellPrice: money.default(0),
  minStock: z.number().min(0).default(0),
  notes: z.string().max(500).optional(),
};

export const createProductBody = z.object({ ...base, initialStock: z.number().min(0).optional() });
export const updateProductBody = z.object(base).partial().extend({ isActive: z.boolean().optional() });

export const listProductsQuery = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  lowStock: boolish.optional(),
  active: boolish.optional(),
  ...pagination,
});

export const barcodeParams = z.object({ code: z.string().trim().min(1).max(64) });
