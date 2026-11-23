import { asyncHandler } from '../../core/asyncHandler.js';
import { sendCreated, sendOk } from '../../core/response.js';
import * as service from './party.service.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listParties(req.auth.shopId, req.valid.query);
  sendOk(res, items, meta);
});
export const get = asyncHandler(async (req, res) => sendOk(res, await service.getParty(req.auth.shopId, req.valid.params.id)));
export const create = asyncHandler(async (req, res) => sendCreated(res, await service.createParty(req.auth.shopId, req.valid.body)));
export const update = asyncHandler(async (req, res) =>
  sendOk(res, await service.updateParty(req.auth.shopId, req.valid.params.id, req.valid.body)));
export const archive = asyncHandler(async (req, res) => sendOk(res, await service.archiveParty(req.auth.shopId, req.valid.params.id)));
export const ledger = asyncHandler(async (req, res) => {
  const { party, items, meta } = await service.getLedger(req.auth.shopId, req.valid.params.id, req.valid.query);
  sendOk(res, { party, entries: items }, meta);
});
export const payment = asyncHandler(async (req, res) =>
  sendCreated(res, await service.recordPayment(req.auth, req.valid.params.id, req.valid.body)));
