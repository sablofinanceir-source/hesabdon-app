import multer from 'multer';
import { AppError } from '../core/AppError.js';

// فایل صوتی فقط در حافظه نگه داشته می‌شود و مستقیم به سرویس تبدیل گفتار به متن می‌رود
export const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream' || file.mimetype === 'video/mp4';
    cb(ok ? null : AppError.badRequest('فقط فایل صوتی مجاز است', 'INVALID_FILE_TYPE'), ok);
  },
}).single('audio');
