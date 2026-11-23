import { z } from 'zod';

export const updateShopBody = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  businessType: z.enum(['grocery', 'supermarket', 'online', 'restaurant', 'workshop', 'other']).optional(),
  phone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(300).optional(),
  currency: z.enum(['IRT', 'IRR']).optional(),
  settings: z
    .object({
      allowNegativeStock: z.boolean().optional(),
      updateBuyPriceOnPurchase: z.boolean().optional(),
      receiptFooter: z.string().max(300).optional(),
    })
    .optional(),
});
