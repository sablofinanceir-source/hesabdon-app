import { z } from 'zod';
import { dateRange } from '../../core/schemas.js';

export const rangeQuery = z.object({ ...dateRange });
export const salesByPeriodQuery = z.object({ ...dateRange, groupBy: z.enum(['day', 'month']).default('day') });
export const topProductsQuery = z.object({ ...dateRange, limit: z.coerce.number().int().min(1).max(50).default(10) });
