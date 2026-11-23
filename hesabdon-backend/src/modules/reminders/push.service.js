import { User } from '../users/user.model.js';

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';
const isExpoToken = (t) => /^(Exponent|Expo)PushToken\[.+\]$/.test(t);

/** ارسال اعلان به دستگاه‌ها از طریق Expo Push. توکن‌های نامعتبر خودکار پاک می‌شوند. */
export async function sendPush(tokens, { title, body, data }) {
  const valid = [...new Set(tokens)].filter(isExpoToken);
  for (let i = 0; i < valid.length; i += 100) {
    const chunk = valid.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk.map((to) => ({ to, title, body, data, sound: 'default', channelId: 'reminders' }))),
      });
      const json = await res.json();
      const dead = [];
      (json.data ?? []).forEach((ticket, idx) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') dead.push(chunk[idx]);
      });
      if (dead.length) await User.updateMany({ pushTokens: { $in: dead } }, { $pull: { pushTokens: { $in: dead } } });
    } catch (err) {
      console.error('Expo push failed:', err.message);
    }
  }
}

/** توکن‌های کاربرانی از یک فروشگاه که باید یادآوری‌ها را بگیرند */
export async function getShopPushTokens(shopId) {
  const users = await User.find({ shop: shopId, isActive: true, 'pushTokens.0': { $exists: true } })
    .select('role permissions pushTokens').lean();
  return users
    .filter((u) => u.role === 'owner' || u.permissions.includes('reminders.manage'))
    .flatMap((u) => u.pushTokens);
}
