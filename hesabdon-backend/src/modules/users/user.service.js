import { ROLE_PRESETS } from '../../config/permissions.js';
import { AppError } from '../../core/AppError.js';
import { RefreshToken } from '../auth/refreshToken.model.js';
import { getShopPlan } from '../shops/shop.service.js';
import { User } from './user.model.js';

export async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound('کاربر پیدا نشد');
  return user;
}

export const updateMe = (userId, data) => User.findByIdAndUpdate(userId, data, { new: true });

export const addPushToken = (userId, token) => User.updateOne({ _id: userId }, { $addToSet: { pushTokens: token } });
export const removePushToken = (userId, token) => User.updateOne({ _id: userId }, { $pull: { pushTokens: token } });

// ---------- کارکنان (فقط مالک) ----------
export const listStaff = (shopId) => User.find({ shop: shopId, role: 'staff' }).sort({ createdAt: -1 });

export async function createStaff(shopId, data) {
  const plan = await getShopPlan(shopId);
  const count = await User.countDocuments({ shop: shopId, role: 'staff', isActive: true });
  if (count >= plan.maxStaff) {
    throw new AppError(`در طرح فعلی حداکثر ${plan.maxStaff} کارمند مجاز است`, 402, 'STAFF_LIMIT_REACHED');
  }
  if (await User.exists({ phone: data.phone })) throw AppError.conflict('این شماره قبلاً ثبت شده است', 'PHONE_TAKEN');

  return User.create({
    shop: shopId,
    name: data.name,
    phone: data.phone, // کارمند با همین شماره و کد پیامکی وارد می‌شود
    role: 'staff',
    permissions: data.permissions ?? ROLE_PRESETS[data.preset],
  });
}

export async function updateStaff(shopId, id, data) {
  const staff = await User.findOne({ _id: id, shop: shopId, role: 'staff' });
  if (!staff) throw AppError.notFound('کارمند پیدا نشد');

  if (data.name !== undefined) staff.name = data.name;
  if (data.isActive !== undefined) staff.isActive = data.isActive;
  if (data.permissions || data.preset) staff.permissions = data.permissions ?? ROLE_PRESETS[data.preset];
  await staff.save();
  return staff;
}

export async function deactivateStaff(shopId, id) {
  const staff = await updateStaff(shopId, id, { isActive: false });
  await RefreshToken.deleteMany({ user: staff._id });
  return staff;
}
