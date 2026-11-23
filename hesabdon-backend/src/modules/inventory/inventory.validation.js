import { z } from 'zod';
import { dateRange, objectId, pagination } from '../../core/schemas.js';

export const adjustBody = z
  .object({
    productId: objectId,
    delta: z.number().finite().optional(),
    newStock: z.number().finite().min(0).optional(),
    note: z.string().max(200).optional(),
  })
  .refine((d) => (d.delta === undefined) !== (d.newStock === undefined), {
    message: 'فقط یکی از delta یا newStock را بفرستید',
  });

export const movementsQuery = z.object({
  productId: objectId.optional(),
  type: z.enum(['initial', 'purchase', 'sale', 'recipe_consume', 'adjustment', 'reversal']).optional(),
  ...dateRange,
  ...pagination,
});
