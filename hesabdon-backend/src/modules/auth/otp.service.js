import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../core/AppError.js';
import { sendOtpSms } from '../../services/smsir.client.js';
import { Otp } from './otp.model.js';

const { length, ttlSeconds, resendSeconds, maxSendsPerHour, maxAttempts, secret } = env.otp;
const WINDOW_MS = 60 * 60 * 1000;
const EPOCH = new Date(0);

const hashCode = (phone, code) => crypto.createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
const generateCode = () => String(crypto.randomInt(0, 10 ** length)).padStart(length, '0');
const safeEqual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const secondsUntil = (date, now) => Math.max(1, Math.ceil((date.getTime() - now.getTime()) / 1000));

/**
 * ساخت و ارسال کد جدید. همهٔ محدودیت‌ها اتمیک هستند تا درخواست‌های همزمان از آن‌ها عبور نکنند:
 *  - فاصلهٔ حداقل بین دو ارسال (OTP_RESEND_SECONDS)
 *  - سقف ارسال در هر ساعت برای هر شماره (OTP_MAX_SENDS_PER_HOUR)
 */
export async function requestCode(phone) {
  const now = new Date();

  // ۱) سند شماره را بساز (اگر نیست). برخورد همزمان دو درخواست بی‌ضرر است
  try {
    await Otp.updateOne(
      { phone },
      {
        $setOnInsert: {
          codeHash: null,
          attempts: 0,
          sendCount: 0, // حتماً باید وجود داشته باشد؛ شرط $lt روی فیلد ناموجود برقرار نمی‌شود
          expiresAt: EPOCH,
          lastSentAt: EPOCH,
          windowStartedAt: now,
          purgeAt: new Date(now.getTime() + WINDOW_MS),
        },
      },
      { upsert: true },
    );
  } catch (err) {
    if (err?.code !== 11000) throw err;
  }

  // ۲) پنجرهٔ یک‌ساعتهٔ تمام‌شده را ریست کن
  await Otp.updateOne(
    { phone, windowStartedAt: { $lte: new Date(now.getTime() - WINDOW_MS) } },
    { $set: { windowStartedAt: now, sendCount: 0 } },
  );

  // ۳) اتمیک: اگر مجاز بود، کد جدید را ثبت کن (کد قبلی همان لحظه باطل می‌شود)
  const code = generateCode();
  const claimed = await Otp.findOneAndUpdate(
    { phone, lastSentAt: { $lte: new Date(now.getTime() - resendSeconds * 1000) }, sendCount: { $lt: maxSendsPerHour } },
    {
      $set: {
        codeHash: hashCode(phone, code),
        expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
        attempts: 0,
        lastSentAt: now,
        purgeAt: new Date(now.getTime() + WINDOW_MS),
      },
      $inc: { sendCount: 1 },
    },
    { new: true },
  );

  if (!claimed) {
    const cur = await Otp.findOne({ phone }).lean();
    if (!cur) throw new AppError('درخواست همزمان؛ دوباره تلاش کنید', 429, 'OTP_RETRY');
    if (cur.sendCount >= maxSendsPerHour) {
      const retryAfter = secondsUntil(new Date(cur.windowStartedAt.getTime() + WINDOW_MS), now);
      throw new AppError('تعداد درخواست کد برای این شماره زیاد است. بعداً دوباره تلاش کنید', 429, 'OTP_LIMIT_REACHED', { retryAfter });
    }
    const retryAfter = secondsUntil(new Date(cur.lastSentAt.getTime() + resendSeconds * 1000), now);
    throw new AppError(`برای دریافت کد جدید ${retryAfter} ثانیه صبر کنید`, 429, 'OTP_COOLDOWN', { retryAfter });
  }

  // ۴) ارسال پیامک؛ اگر شکست خورد، سهمیه را برمی‌گردانیم تا کاربر بتواند فوراً دوباره امتحان کند
  try {
    await sendOtpSms(phone, code);
  } catch (err) {
    await Otp.updateOne(
      { phone, lastSentAt: now },
      { $set: { codeHash: null, expiresAt: EPOCH, lastSentAt: EPOCH }, $inc: { sendCount: -1 } },
    );
    throw err;
  }

  return { expiresIn: ttlSeconds, resendAfter: resendSeconds, length };
}

/**
 * بررسی کد (بدون مصرف). هر فراخوانی یک تلاش حساب می‌شود؛ بعد از OTP_MAX_ATTEMPTS تلاش ناموفق کد قفل می‌شود.
 * در صورت صحیح بودن، «بلیت» برمی‌گرداند که با consumeTicket مصرف می‌شود.
 */
export async function verifyCode(phone, code) {
  const now = new Date();
  const doc = await Otp.findOneAndUpdate(
    { phone, codeHash: { $ne: null }, expiresAt: { $gt: now }, attempts: { $lt: maxAttempts } },
    { $inc: { attempts: 1 } },
    { new: true },
  );

  if (!doc) {
    const cur = await Otp.findOne({ phone }).lean();
    if (cur?.codeHash && cur.expiresAt > now && cur.attempts >= maxAttempts) {
      throw new AppError('تلاش‌های ناموفق زیاد بود. یک کد جدید دریافت کنید', 429, 'OTP_ATTEMPTS_EXCEEDED');
    }
    throw AppError.unauthorized('کد منقضی شده است. یک کد جدید دریافت کنید', 'OTP_EXPIRED');
  }

  if (!safeEqual(doc.codeHash, hashCode(phone, code))) {
    const attemptsLeft = Math.max(0, maxAttempts - doc.attempts);
    throw new AppError('کد واردشده اشتباه است', 401, 'OTP_INVALID', { attemptsLeft });
  }
  return { phone, codeHash: doc.codeHash };
}

/** مصرف اتمیک کد؛ فقط یک درخواست می‌تواند یک کد را مصرف کند. */
export async function consumeTicket({ phone, codeHash }) {
  const consumed = await Otp.findOneAndUpdate(
    { phone, codeHash },
    { $set: { codeHash: null, expiresAt: EPOCH } },
  );
  if (!consumed) throw AppError.unauthorized('کد منقضی شده است. یک کد جدید دریافت کنید', 'OTP_EXPIRED');
}

/**
 * کد درست بوده ولی ثبت‌نام هنوز کامل نیست (نام/فروشگاه لازم است):
 * تلاش را پس می‌دهیم و به کاربر فرصت پر کردن فرم می‌دهیم تا کد را دوباره نگیرد.
 */
export async function holdTicket({ phone, codeHash }) {
  await Otp.updateOne(
    { phone, codeHash },
    { $inc: { attempts: -1 }, $max: { expiresAt: new Date(Date.now() + 5 * 60 * 1000) } },
  );
}
