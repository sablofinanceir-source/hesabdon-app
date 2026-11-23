import { asyncHandler } from '../../core/asyncHandler.js';
import { sendCreated, sendOk } from '../../core/response.js';
import * as service from './reminder.service.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listReminders(req.auth.shopId, req.valid.query);
  sendOk(res, items, meta);
});
export const create = asyncHandler(async (req, res) =>
  sendCreated(res, await service.createReminder(req.auth.shopId, req.auth.userId, req.valid.body)));
export const update = asyncHandler(async (req, res) =>
  sendOk(res, await service.updateReminder(req.auth.shopId, req.valid.params.id, req.valid.body)));
export const complete = asyncHandler(async (req, res) =>
  sendOk(res, await service.completeReminder(req.auth.shopId, req.valid.params.id)));
export const remove = asyncHandler(async (req, res) =>
  sendOk(res, await service.deleteReminder(req.auth.shopId, req.valid.params.id)));
