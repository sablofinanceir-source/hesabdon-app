import { PLANS, getEffectivePlan } from '../../config/plans.js';
import { AppError } from '../../core/AppError.js';
import { Shop } from './shop.model.js';

export const getShop = (shopId) => Shop.findById(shopId).lean();

export async function getShopPlan(shopId) {
  const shop = await Shop.findById(shopId).select('plan planExpiresAt').lean();
  return getEffectivePlan(shop);
}

export const describePlan = (plan, shop) => ({
  key: plan.key,
  title: plan.title,
  features: plan.features,
  limits: { maxProducts: plan.maxProducts, maxStaff: plan.maxStaff },
  expiresAt: plan.key === 'pro' ? shop?.planExpiresAt ?? null : null,
});

export async function getPlanInfo(shopId) {
  const shop = await Shop.findById(shopId).select('plan planExpiresAt').lean();
  return describePlan(getEffectivePlan(shop), shop);
}

export const listPlans = () => Object.values(PLANS).map((p) => describePlan(p));

export async function updateShop(shopId, data) {
  const { settings, ...rest } = data;
  const $set = { ...rest };
  for (const [k, v] of Object.entries(settings ?? {})) $set[`settings.${k}`] = v;
  const shop = await Shop.findByIdAndUpdate(shopId, { $set }, { new: true, runValidators: true }).lean();
  if (!shop) throw AppError.notFound('فروشگاه پیدا نشد');
  return shop;
}
