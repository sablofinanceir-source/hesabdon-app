import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { startScheduler } from './jobs/scheduler.js';

async function main() {
  await connectDB();
  const app = createApp();
  const server = app.listen(env.port, () => console.log(`🚀 myAnbari API on http://localhost:${env.port}/api/v1`));
  const stopScheduler = startScheduler();


  
  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down...`);
    stopScheduler();
    server.close(async () => { await disconnectDB(); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
