import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ALL_PERMISSIONS } from '../config/permissions.js';
import { AppError } from '../core/AppError.js';
import { asyncHandler } from '../core/asyncHandler.js';
import { User } from '../modules/users/user.model.js';

/** توکن را بررسی می‌کند و req.auth را می‌سازد. کاربر هر بار از دیتابیس خوانده می‌شود تا تغییر مجوز/غیرفعال‌سازی فوراً اعمال شود. */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw AppError.unauthorized('توکن ارسال نشده است');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtAccessSecret);
  } catch {
    throw AppError.unauthorized('توکن نامعتبر یا منقضی شده است', 'TOKEN_EXPIRED');
  }

  const user = await User.findById(payload.sub).select('shop role permissions isActive name').lean();
  if (!user || !user.isActive) throw AppError.unauthorized('حساب کاربری غیرفعال است', 'ACCOUNT_DISABLED');

  req.auth = {
    userId: String(user._id),
    shopId: String(user.shop),
    role: user.role,
    name: user.name,
    permissions: user.role === 'owner' ? ALL_PERMISSIONS : user.permissions,
  };
  next();
});
