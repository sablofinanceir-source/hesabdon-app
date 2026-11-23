import mongoose from 'mongoose';
import multer from 'multer';
import { AppError } from '../core/AppError.js';

export function notFoundHandler(req, _res, next) {
  next(AppError.notFound(`مسیر ${req.originalUrl} وجود ندارد`, 'ROUTE_NOT_FOUND'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let e = err;

  if (err instanceof mongoose.Error.ValidationError) {
    e = new AppError('داده‌های ارسالی نامعتبر است', 422, 'VALIDATION_ERROR',
      Object.values(err.errors).map((x) => ({ path: x.path, message: x.message })));
  } else if (err instanceof mongoose.Error.CastError) {
    e = AppError.badRequest('شناسه یا مقدار نامعتبر است', 'INVALID_VALUE');
  } else if (err?.code === 11000) {
    e = AppError.conflict('این مقدار قبلاً ثبت شده است', 'DUPLICATE_KEY', err.keyValue);
  } else if (err instanceof multer.MulterError) {
    e = AppError.badRequest(err.code === 'LIMIT_FILE_SIZE' ? 'حجم فایل بیش از حد مجاز است' : 'خطا در آپلود فایل', 'UPLOAD_ERROR');
  } else if (err?.type === 'entity.parse.failed') {
    e = AppError.badRequest('بدنه درخواست JSON معتبر نیست', 'INVALID_JSON');
  }

  if (!(e instanceof AppError)) {
    console.error(err);
    e = new AppError('خطای داخلی سرور', 500, 'INTERNAL_ERROR');
  }

  res.status(e.statusCode).json({ success: false, error: { code: e.code, message: e.message, details: e.details } });
}
