import { getEffectivePlan } from '../config/plans.js';
import { AppError } from '../core/AppError.js';
import { asyncHandler } from '../core/asyncHandler.js';
import { Shop } from '../modules/shops/shop.model.js';

/** قابلیت‌هایی که فقط در بعضی طرح‌های اشتراک هستند (مثلاً voice, cheques, recipes, staff) */
export const requireFeature = (feature) =>
  asyncHandler(async (req, _res, next) => {
    const shop = await Shop.findById(req.auth.shopId).select('plan planExpiresAt').lean();
    const plan = getEffectivePlan(shop);
    if (!plan.features.includes(feature)) {
      throw new AppError('این قابلیت در طرح فعلی شما فعال نیست. اشتراک خود را ارتقا دهید.', 402, 'FEATURE_NOT_AVAILABLE', {
        feature,
        plan: plan.key,
      });
    }
    next();
  });
