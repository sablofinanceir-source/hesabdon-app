import { asyncHandler } from '../../core/asyncHandler.js';
import { sendOk } from '../../core/response.js';
import * as service from './report.service.js';

export const dashboard = asyncHandler(async (req, res) => sendOk(res, await service.dashboard(req.auth.shopId)));
export const summary = asyncHandler(async (req, res) => sendOk(res, await service.summary(req.auth.shopId, req.valid.query)));
export const salesByPeriod = asyncHandler(async (req, res) => sendOk(res, await service.salesByPeriod(req.auth.shopId, req.valid.query)));
export const topProducts = asyncHandler(async (req, res) => sendOk(res, await service.topProducts(req.auth.shopId, req.valid.query)));
export const lowStock = asyncHandler(async (req, res) => sendOk(res, await service.lowStock(req.auth.shopId)));
export const balances = asyncHandler(async (req, res) => sendOk(res, await service.balances(req.auth.shopId)));
