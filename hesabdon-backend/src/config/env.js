import 'dotenv/config';

const get = (key, fallback) => {
  const v = process.env[key];
  if (v !== undefined && v !== '') return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`متغیر محیطی ${key} تعریف نشده است (فایل .env را بررسی کنید)`);
};

const nodeEnv = get('NODE_ENV', 'development');
const isProd = nodeEnv === 'production';
const jwtAccessSecret = get('JWT_ACCESS_SECRET');
// در محیط توسعه مقدار پیامک اختیاری است (کد OTP در کنسول چاپ می‌شود)، در production الزامی است
const requiredInProd = (key, fallback = '') => (isProd ? get(key) : process.env[key] || fallback);

const int = (key, fallback, { min = 1 } = {}) => {
  const n = Number(get(key, fallback));
  if (!Number.isInteger(n) || n < min) throw new Error(`مقدار ${key} باید عدد صحیح و حداقل ${min} باشد`);
  return n;
};

export const env = {
  nodeEnv,
  port: Number(get('PORT', 4000)),
  mongoUri: get('MONGODB_URI'),
  jwtAccessSecret,
  accessTokenTtl: get('ACCESS_TOKEN_TTL', '15m'),
  refreshTokenDays: Number(get('REFRESH_TOKEN_DAYS', 30)),
  corsOrigins: get('CORS_ORIGINS', '*'),
  trialDays: Number(get('TRIAL_DAYS', 14)),
  // ورود با کد یک‌بارمصرف (OTP) از طریق پیامک
  otp: {
    secret: get('OTP_SECRET', jwtAccessSecret), // کلید HMAC برای هش کد؛ کد خام هرگز ذخیره نمی‌شود
    length: int('OTP_LENGTH', 6, { min: 4 }),
    ttlSeconds: int('OTP_TTL_SECONDS', 120, { min: 30 }),
    resendSeconds: int('OTP_RESEND_SECONDS', 60, { min: 10 }),
    maxSendsPerHour: int('OTP_MAX_SENDS_PER_HOUR', 5),
    maxAttempts: int('OTP_MAX_ATTEMPTS', 5),
  },
  smsir: {
    apiKey: requiredInProd('SMSIR_API_KEY'),
    templateId: Number(requiredInProd('SMSIR_TEMPLATE_ID', '0')),
    codeParam: get('SMSIR_CODE_PARAM', 'Code'), // نام پارامتر در قالب (بدون #)
    baseUrl: get('SMSIR_BASE_URL', 'https://api.sms.ir/v1'),
  },
  ai: {
    apiKey: process.env.GAPGPT_API_KEY || '',
    baseUrl: get('GAPGPT_BASE_URL', 'https://api.gapgpt.app/v1'),
    chatModel: get('GAPGPT_CHAT_MODEL', 'gpt-4o'),
    sttModel: get('GAPGPT_STT_MODEL', 'whisper-1'),
  },
};
env.isProd = isProd;

if (isProd && !(Number.isInteger(env.smsir.templateId) && env.smsir.templateId > 0)) {
  throw new Error('SMSIR_TEMPLATE_ID باید شناسهٔ عددی قالب تأیید (Verify) در پنل sms.ir باشد');
}
