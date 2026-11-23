import { asyncHandler } from '../../core/asyncHandler.js';
import { sendOk } from '../../core/response.js';
import * as service from './auth.service.js';

const ua = (req) => req.headers['user-agent'];

export const requestOtp = asyncHandler(async (req, res) => sendOk(res, await service.requestOtp(req.valid.body)));
export const verifyOtp = asyncHandler(async (req, res) => sendOk(res, await service.verifyOtp(req.valid.body, ua(req))));
export const refresh = asyncHandler(async (req, res) =>
  sendOk(res, await service.refresh(req.valid.body.refreshToken, ua(req))));
export const logout = asyncHandler(async (req, res) => {
  await service.logout(req.valid.body.refreshToken);
  sendOk(res, { loggedOut: true });
});
