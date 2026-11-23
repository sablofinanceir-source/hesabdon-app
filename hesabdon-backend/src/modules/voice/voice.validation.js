import { z } from 'zod';
import { boolish } from '../../core/schemas.js';

// فایل صوتی با multipart (فیلد audio) یا متن آماده (فیلد text) ارسال می‌شود
export const voiceEntryBody = z.object({
  text: z.string().trim().min(2).max(1000).optional(),
  dryRun: boolish.default(false), // فقط تحلیل کن، چیزی ثبت نکن
});
