import { z } from 'zod';
import { objectId } from '../../core/schemas.js';

const ingredient = z.object({ productId: objectId, quantity: z.number().finite().positive() });

export const createRecipeBody = z.object({
  productId: objectId,
  ingredients: z.array(ingredient).min(1).max(50),
  yield: z.number().finite().positive().default(1),
  note: z.string().max(500).optional(),
});

export const updateRecipeBody = createRecipeBody.omit({ productId: true }).partial();
