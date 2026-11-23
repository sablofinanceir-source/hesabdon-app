import { asyncHandler } from '../../core/asyncHandler.js';
import { sendCreated, sendOk } from '../../core/response.js';
import * as service from './user.service.js';

export const me = asyncHandler(async (req, res) => sendOk(res, await service.getMe(req.auth.userId)));
export const updateMe = asyncHandler(async (req, res) =>
  sendOk(res, await service.updateMe(req.auth.userId, req.valid.body)));
export const addPushToken = asyncHandler(async (req, res) => {
  await service.addPushToken(req.auth.userId, req.valid.body.token);
  sendOk(res, { registered: true });
});
export const removePushToken = asyncHandler(async (req, res) => {
  await service.removePushToken(req.auth.userId, req.valid.body.token);
  sendOk(res, { removed: true });
});

export const listStaff = asyncHandler(async (req, res) => sendOk(res, await service.listStaff(req.auth.shopId)));
export const createStaff = asyncHandler(async (req, res) =>
  sendCreated(res, await service.createStaff(req.auth.shopId, req.valid.body)));
export const updateStaff = asyncHandler(async (req, res) =>
  sendOk(res, await service.updateStaff(req.auth.shopId, req.valid.params.id, req.valid.body)));
export const deactivateStaff = asyncHandler(async (req, res) =>
  sendOk(res, await service.deactivateStaff(req.auth.shopId, req.valid.params.id)));
