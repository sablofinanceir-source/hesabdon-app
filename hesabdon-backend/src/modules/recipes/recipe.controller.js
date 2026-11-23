import { asyncHandler } from '../../core/asyncHandler.js';
import { sendCreated, sendOk } from '../../core/response.js';
import * as service from './recipe.service.js';

export const list = asyncHandler(async (req, res) => sendOk(res, await service.listRecipes(req.auth.shopId)));
export const get = asyncHandler(async (req, res) => sendOk(res, await service.getRecipe(req.auth.shopId, req.valid.params.id)));
export const create = asyncHandler(async (req, res) => sendCreated(res, await service.createRecipe(req.auth.shopId, req.valid.body)));
export const update = asyncHandler(async (req, res) =>
  sendOk(res, await service.updateRecipe(req.auth.shopId, req.valid.params.id, req.valid.body)));
export const remove = asyncHandler(async (req, res) => sendOk(res, await service.deleteRecipe(req.auth.shopId, req.valid.params.id)));
