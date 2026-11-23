import mongoose from 'mongoose';

// برای هر شماره یک سند: کد فعال + شمارندهٔ محدودیت ارسال
const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  codeHash: { type: String, default: null }, // HMAC کد؛ null یعنی کد فعالی وجود ندارد
  expiresAt: { type: Date, required: true }, // انقضای کد
  attempts: { type: Number, default: 0 }, // تلاش‌های تأیید برای کد فعلی
  lastSentAt: { type: Date, required: true }, // برای فاصلهٔ بین دو ارسال
  windowStartedAt: { type: Date, required: true }, // شروع پنجرهٔ یک‌ساعته
  sendCount: { type: Number, default: 0 }, // تعداد ارسال در پنجره
  purgeAt: { type: Date, required: true }, // حذف خودکار سند
});
otpSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = mongoose.model('Otp', otpSchema);
