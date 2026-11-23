import { z } from 'zod';
import { AppError } from './AppError.js';

/**
 * ولیدیشن body / query / params با zod.
 * خروجی تمیز‌شده در req.valid.{body,query,params} قرار می‌گیرد (فیلدهای اضافه حذف می‌شوند).
 */
export const validate = ({ body, query, params }) => {
  const schema = z.object({ body: body ?? z.any(), query: query ?? z.any(), params: params ?? z.any() });
  return (req, _res, next) => {
    const parsed = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({ path: i.path.slice(1).join('.'), message: i.message }));
      return next(new AppError('داده‌های ارسالی نامعتبر است', 422, 'VALIDATION_ERROR', details));
    }
    req.valid = parsed.data;
    next();
  };
};
