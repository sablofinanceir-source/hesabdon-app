import { processDueReminders } from '../modules/reminders/reminder.service.js';

/** هر یک دقیقه یادآوری‌های سررسیدشده را اعلان می‌کند. (در چند نمونه سرور، فقط روی یکی اجرا کنید یا از صف استفاده کنید) */
export function startScheduler() {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const n = await processDueReminders();
      if (n) console.log(`🔔 ${n} reminder(s) notified`);
    } catch (err) {
      console.error('reminder job failed:', err);
    } finally {
      running = false;
    }
  }, 60_000);
  return () => clearInterval(timer);
}
