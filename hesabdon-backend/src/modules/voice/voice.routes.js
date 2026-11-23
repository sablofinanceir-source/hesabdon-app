import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { PERMISSIONS as P } from '../../config/permissions.js';
import { validate } from '../../core/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireFeature } from '../../middlewares/feature.js';
import { requirePermission } from '../../middlewares/permission.js';
import { uploadAudio } from '../../middlewares/upload.js';
import * as c from './voice.controller.js';
import { voiceEntryBody } from './voice.validation.js';

const router = Router();
router.use(authenticate, requireFeature('voice'), requirePermission(P.VOICE_USE));
// هزینه هر درخواست هوش مصنوعی دارد؛ محدودیت نرخ
router.use(rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }));

router.post('/transcribe', uploadAudio, c.transcribe);
router.post('/entries', uploadAudio, validate({ body: voiceEntryBody }), c.entry);

export default router;
