import { asyncHandler } from '../../core/asyncHandler.js';
import { sendOk } from '../../core/response.js';
import { AppError } from '../../core/AppError.js';
import * as service from './voice.service.js';

export const transcribe = asyncHandler(async (req, res) => sendOk(res, { text: await service.transcribe(req.file) }));

export const entry = asyncHandler(async (req, res) => {
  const { text, dryRun } = req.valid.body;
  if (!text && !req.file) throw AppError.badRequest('فایل صوتی (audio) یا متن (text) را ارسال کنید', 'INPUT_REQUIRED');
  sendOk(res, await service.processEntry(req.auth, { text, file: req.file, dryRun }));
});
