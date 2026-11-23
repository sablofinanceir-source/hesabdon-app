// امکانات هر طرح اشتراک. null یعنی نامحدود.
export const PLANS = {
  free: {
    key: 'free',
    title: 'رایگان',
    maxProducts: 50,
    maxStaff: 0,
    features: ['sales', 'inventory', 'parties', 'reports', 'reminders'],
  },
  pro: {
    key: 'pro',
    title: 'حرفه‌ای',
    maxProducts: null,
    maxStaff: 5,
    features: ['sales', 'inventory', 'parties', 'reports', 'reminders', 'voice', 'cheques', 'recipes', 'staff'],
  },
};

// اگر اشتراک حرفه‌ای منقضی شده باشد، فروشگاه روی طرح رایگان می‌افتد
export function getEffectivePlan(shop) {
  const active = shop?.plan === 'pro' && shop.planExpiresAt && new Date(shop.planExpiresAt) > new Date();
  return active ? PLANS.pro : PLANS.free;
}
