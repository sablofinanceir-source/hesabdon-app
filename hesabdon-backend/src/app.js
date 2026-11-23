import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { startScheduler } from './jobs/scheduler.js';

async function main() {
  await connectDB();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`🚀 Hesabdoon API on http://localhost:${env.port}/api/v1`);
  });

  // روی Vercel تابع‌ها دائمی نیستند، پس scheduler فقط روی سرور واقعی/لوکال اجرا شود
  const stopScheduler = process.env.VERCEL ? () => {} : startScheduler();

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down...`);

    stopScheduler();

    // اگر بسته شدن بیش از ۱۰ ثانیه طول کشید، اجباری خارج شو
    setTimeout(() => process.exit(1), 10_000).unref();

    server.close(async () => {
      try {
        await disconnectDB();
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
