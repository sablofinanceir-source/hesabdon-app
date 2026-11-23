import { connectDB } from '../src/config/db.js';
import { createApp } from '../src/app.js';

let app;
let dbReady;

export default async function handler(req, res) {
  try {
    dbReady ??= connectDB();
    await dbReady;
    app ??= createApp();
    return app(req, res);
  } catch (err) {
    dbReady = undefined; // درخواست بعدی دوباره تلاش کند
    console.error('Startup error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Server error' }));
  }
}
