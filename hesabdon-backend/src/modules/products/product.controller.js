import { asyncHandler } from '../../core/asyncHandler.js';
import { sendCreated, sendOk } from '../../core/response.js';
import * as service from './product.service.js';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listProducts(req.auth.shopId, req.valid.query);
  sendOk(res, items, meta);
});
export const categories = asyncHandler(async (req, res) => sendOk(res, await service.listCategories(req.auth.shopId)));
export const byBarcode = asyncHandler(async (req, res) =>
  sendOk(res, await service.getByBarcode(req.auth.shopId, req.valid.params.code)));
export const get = asyncHandler(async (req, res) => sendOk(res, await service.getProduct(req.auth.shopId, req.valid.params.id)));
export const create = asyncHandler(async (req, res) => sendCreated(res, await service.createProduct(req.auth, req.valid.body)));
export const update = asyncHandler(async (req, res) =>
  sendOk(res, await service.updateProduct(req.auth.shopId, req.valid.params.id, req.valid.body)));
export const archive = asyncHandler(async (req, res) => sendOk(res, await service.archiveProduct(req.auth.shopId, req.valid.params.id)));
