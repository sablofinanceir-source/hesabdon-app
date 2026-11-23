import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { ALL_PERMISSIONS } from '../../config/permissions.js';
import { AppError } from '../../core/AppError.js';
import { Shop } from '../shops/shop.model.js';
import { User } from '../users/user.model.js';
import * as otp from './otp.service.js';
import { RefreshToken } from './refreshToken.model.js';

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

async function issueTokens(user, userAgent) {
  const accessToken = jwt.sign({ sub: String(user._id), shop: String(user.shop), role: user.role }, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl,
  });
  const refreshToken = crypto.randomBytes(40).toString('hex'); // توکن مبهم؛ فقط هش آن ذخیره می‌شود
  await RefreshToken.create({
    user: user._id,
    tokenHash: sha256(refreshToken),
    expiresAt: new Date(Date.now() + env.refreshTokenDays * 86400000),
    userAgent,
  });
  return { accessToken, refreshToken };
}

const disabled = () => AppError.forbidden('حساب شما غیرفعال شده است', 'ACCOUNT_DISABLED');

/** مرحلهٔ ۱: ارسال کد پیامکی (برای ورود و ثبت‌نام یکسان است) */
export async function requestOtp({ phone }) {
  const user = await User.findOne({ phone }).select('isActive').lean();
  if (user && !user.isActive) throw disabled(); // برای حساب غیرفعال پیامک هزینه نمی‌کنیم
  return otp.requestCode(phone);
}

// هر فروشگاه جدید یک دوره آزمایشی حرفه‌ای می‌گیرد
async function createOwnerAccount({ phone, name, shopName, businessType }) {
  const shop = await Shop.create({
    name: shopName,
    businessType,
    plan: 'pro',
    planExpiresAt: new Date(Date.now() + env.trialDays * 86400000),
  });

  let user;
  try {
    user = await User.create({ shop: shop._id, name, phone, role: 'owner', permissions: ALL_PERMISSIONS });
  } catch (err) {
    await Shop.deleteOne({ _id: shop._id });
    throw err;
  }
  shop.owner = user._id;
  await shop.save();
  return user;
}

/**
 * مرحلهٔ ۲: تأیید کد.
 *  - کاربر موجود (مالک یا کارمند) → وارد می‌شود.
 *  - شمارهٔ جدید → اگر name و shopName آمده باشد حساب مالک و فروشگاه ساخته می‌شود؛
 *    وگرنه خطای REGISTRATION_REQUIRED (۴۲۲) می‌دهد و کد برای ۵ دقیقه معتبر می‌ماند تا اپ فرم را نشان دهد
 *    و همان کد را همراه نام و فروشگاه دوباره بفرستد.
 */
export async function verifyOtp({ phone, code, name, shopName, businessType }, userAgent) {
  const ticket = await otp.verifyCode(phone, code);

  let user = await User.findOne({ phone });
  if (user && !user.isActive) throw disabled();

  if (!user && !(name && shopName)) {
    await otp.holdTicket(ticket);
    throw new AppError('برای ساخت حساب، نام و نام فروشگاه را وارد کنید', 422, 'REGISTRATION_REQUIRED');
  }

  await otp.consumeTicket(ticket);

  const isNewUser = !user;
  if (!user) user = await createOwnerAccount({ phone, name, shopName, businessType });

  user.lastLoginAt = new Date();
  await user.save();
  const shop = await Shop.findById(user.shop);
  return { user, shop, isNewUser, tokens: await issueTokens(user, userAgent) };
}

// هر بار که refresh می‌کنید توکن قبلی باطل و یکی جدید صادر می‌شود (rotation)
export async function refresh(refreshToken, userAgent) {
  const doc = await RefreshToken.findOneAndDelete({ tokenHash: sha256(refreshToken), expiresAt: { $gt: new Date() } });
  if (!doc) throw AppError.unauthorized('نشست منقضی شده است. دوباره وارد شوید', 'INVALID_REFRESH_TOKEN');
  const user = await User.findById(doc.user);
  if (!user || !user.isActive) throw AppError.unauthorized('حساب کاربری غیرفعال است', 'ACCOUNT_DISABLED');
  return issueTokens(user, userAgent);
}

export const logout = (refreshToken) => RefreshToken.deleteOne({ tokenHash: sha256(refreshToken) });
