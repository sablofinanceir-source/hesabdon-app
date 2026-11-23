import { asyncHandler } from '../../core/asyncHandler.js';
import { sendCreated, sendOk } from '../../core/response.js';
import * as service from './cheque.service.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listCheques(req.auth.shopId, req.valid.query);
  sendOk(res, items, meta);
});
export const summary = asyncHandler(async (req, res) => sendOk(res, await service.summary(req.auth.shopId)));
export const get = asyncHandler(async (req, res) => sendOk(res, await service.getCheque(req.auth.shopId, req.valid.params.id)));
export const create = asyncHandler(async (req, res) => sendCreated(res, await service.createCheque(req.auth, req.valid.body)));
export const update = asyncHandler(async (req, res) =>
  sendOk(res, await service.updateCheque(req.auth.shopId, req.valid.params.id, req.valid.body)));
export const changeStatus = asyncHandler(async (req, res) =>
  sendOk(res, await service.changeStatus(req.auth, req.valid.params.id, req.valid.body)));
export const remove = asyncHandler(async (req, res) => sendOk(res, await service.deleteCheque(req.auth.shopId, req.valid.params.id)));
