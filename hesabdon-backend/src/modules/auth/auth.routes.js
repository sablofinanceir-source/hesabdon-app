import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../core/validate.js';
import * as c from './auth.controller.js';
import { refreshBody, requestOtpBody, verifyOtpBody } from './auth.validation.js';

const router = Router();

// محدودیت بر اساس IP (محدودیت‌های دقیق‌تر هر شماره داخل otp.service است)
const limiter = (limit) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'تلاش‌های زیاد. کمی بعد دوباره امتحان کنید' } },
  });

router.post('/otp/request', limiter(20), validate({ body: requestOtpBody }), c.requestOtp);
router.post('/otp/verify', limiter(40), validate({ body: verifyOtpBody }), c.verifyOtp);
router.post('/refresh', validate({ body: refreshBody }), c.refresh);
router.post('/logout', validate({ body: refreshBody }), c.logout);

export default router;
