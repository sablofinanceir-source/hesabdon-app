import { asyncHandler } from '../../core/asyncHandler.js';
import { sendOk } from '../../core/response.js';
import * as service from './shop.service.js';

export const get = asyncHandler(async (req, res) => sendOk(res, await service.getShop(req.auth.shopId)));
export const update = asyncHandler(async (req, res) =>
  sendOk(res, await service.updateShop(req.auth.shopId, req.valid.body)));
export const plan = asyncHandler(async (req, res) => sendOk(res, await service.getPlanInfo(req.auth.shopId)));
export const plans = asyncHandler(async (_req, res) => sendOk(res, service.listPlans()));
