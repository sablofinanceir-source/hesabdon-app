import { AppError } from '../core/AppError.js';

export const can = (auth, permission) => auth.role === 'owner' || auth.permissions.includes(permission);

/** همه مجوزهای داده‌شده لازم است */
export const requirePermission = (...needed) => (req, _res, next) =>
  needed.every((p) => can(req.auth, p)) ? next() : next(AppError.forbidden('شما دسترسی لازم برای این عملیات را ندارید'));

/** داشتن حداقل یکی از مجوزها کافی است */
export const requireAny = (...options) => (req, _res, next) =>
  options.some((p) => can(req.auth, p)) ? next() : next(AppError.forbidden('شما دسترسی لازم برای این عملیات را ندارید'));

export const assertCan = (auth, permission) => {
  if (!can(auth, permission)) throw AppError.forbidden('شما دسترسی لازم برای این عملیات را ندارید');
};
