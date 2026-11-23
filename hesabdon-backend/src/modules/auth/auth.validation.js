import { z } from 'zod';
import { toLatinDigits } from '../../core/phone.js';
import { mobileSchema } from '../../core/schemas.js';

// ارقام فارسی/عربی و فاصله را می‌پذیرد و به لاتین تبدیل می‌کند
const otpCode = z
  .string()
  .transform((s) => toLatinDigits(s).replace(/\s/g, ''))
  .pipe(z.string().regex(/^\d{4,8}$/, 'کد تأیید نامعتبر است'));

export const requestOtpBody = z.object({ phone: mobileSchema });

// name و shopName فقط برای شمارهٔ جدید (ثبت‌نام) لازم‌اند؛ برای کاربر موجود نادیده گرفته می‌شوند
export const verifyOtpBody = z.object({
  phone: mobileSchema,
  code: otpCode,
  name: z.string().trim().min(1).max(80).optional(),
  shopName: z.string().trim().min(1).max(100).optional(),
  businessType: z.enum(['grocery', 'supermarket', 'online', 'restaurant', 'workshop', 'other']).default('other'),
});

export const refreshBody = z.object({ refreshToken: z.string().min(20) });
