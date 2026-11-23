import { env } from '../config/env.js';
import { AppError } from '../core/AppError.js';

const TIMEOUT_MS = 10_000;

export const isSmsConfigured = () => Boolean(env.smsir.apiKey) && env.smsir.templateId > 0;

const upstream = () => new AppError('ارسال پیامک ناموفق بود. چند لحظه بعد دوباره تلاش کنید', 502, 'SMS_SEND_FAILED');

/**
 * ارسال کد تأیید با API «Verify» سرویس sms.ir (ارسال سریع با قالب).
 * قالب باید در پنل ساخته شود، مثلاً: «کد ورود شما: #Code#»
 * @param {string} phone شماره به شکل 09xxxxxxxxx
 * @param {string} code  کد (حداکثر ۲۵ کاراکتر طبق محدودیت sms.ir)
 */
export async function sendOtpSms(phone, code) {
  if (!isSmsConfigured()) {
    if (env.isProd) throw new AppError('سرویس پیامک پیکربندی نشده است', 503, 'SMS_NOT_CONFIGURED');
    console.log(`[DEV] کد OTP برای ${phone}: ${code}  (SMSIR_API_KEY تنظیم نشده؛ پیامکی ارسال نشد)`);
    return { dev: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  let body;
  try {
    res = await fetch(`${env.smsir.baseUrl}/send/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-api-key': env.smsir.apiKey },
      body: JSON.stringify({
        mobile: phone.replace(/^0/, ''), // sms.ir شماره را بدون صفر اول می‌گیرد: 9xxxxxxxxx
        templateId: env.smsir.templateId,
        parameters: [{ name: env.smsir.codeParam, value: String(code) }],
      }),
      signal: controller.signal,
    });
    body = await res.json().catch(() => null);
  } catch (err) {
    console.error('[sms.ir] خطای شبکه:', err?.name === 'AbortError' ? 'timeout' : err?.message);
    throw upstream();
  } finally {
    clearTimeout(timer);
  }

  // موفق: HTTP 200 و status === 1
  if (!res.ok || body?.status !== 1) {
    console.error('[sms.ir] درخواست رد شد:', { http: res.status, status: body?.status, message: body?.message });
    throw upstream();
  }
  return { messageId: body.data?.messageId };
}
