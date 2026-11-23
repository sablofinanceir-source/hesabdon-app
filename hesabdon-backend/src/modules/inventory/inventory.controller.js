import { asyncHandler } from '../../core/asyncHandler.js';
import { sendOk } from '../../core/response.js';
import * as service from './inventory.service.js';

export const adjust = asyncHandler(async (req, res) => sendOk(res, await service.adjustStock(req.auth, req.valid.body)));
export const movements = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listMovements(req.auth.shopId, req.valid.query);
  sendOk(res, items, meta);
});
export const valuation = asyncHandler(async (req, res) => sendOk(res, await service.valuation(req.auth.shopId)));
