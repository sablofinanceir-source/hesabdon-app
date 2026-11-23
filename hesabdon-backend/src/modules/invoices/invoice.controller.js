import { asyncHandler } from '../../core/asyncHandler.js';
import { sendCreated, sendOk } from '../../core/response.js';
import * as service from './invoice.service.js';
import { renderReceiptHtml } from './invoice.receipt.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listInvoices(req.auth, req.valid.query);
  sendOk(res, items, meta);
});
export const get = asyncHandler(async (req, res) => sendOk(res, await service.getInvoice(req.auth, req.valid.params.id)));
export const create = asyncHandler(async (req, res) => sendCreated(res, await service.createInvoice(req.auth, req.valid.body)));
export const update = asyncHandler(async (req, res) =>
  sendOk(res, await service.updateInvoice(req.auth, req.valid.params.id, req.valid.body)));
export const finalize = asyncHandler(async (req, res) =>
  sendOk(res, await service.finalizeInvoice(req.auth, req.valid.params.id, req.valid.body)));
export const voidInvoice = asyncHandler(async (req, res) =>
  sendOk(res, await service.voidInvoice(req.auth, req.valid.params.id, req.valid.body.reason)));
export const remove = asyncHandler(async (req, res) => sendOk(res, await service.deleteOpenInvoice(req.auth, req.valid.params.id)));

export const addItem = asyncHandler(async (req, res) =>
  sendOk(res, await service.addItem(req.auth, req.valid.params.id, req.valid.body)));
export const updateItem = asyncHandler(async (req, res) =>
  sendOk(res, await service.updateItem(req.auth, req.valid.params.id, req.valid.params.itemId, req.valid.body)));
export const removeItem = asyncHandler(async (req, res) =>
  sendOk(res, await service.removeItem(req.auth, req.valid.params.id, req.valid.params.itemId)));

export const receipt = asyncHandler(async (req, res) => {
  const data = await service.buildReceipt(req.auth, req.valid.params.id);
  if (req.valid.query.format === 'html') return res.type('html').send(renderReceiptHtml(data));
  sendOk(res, data);
});
