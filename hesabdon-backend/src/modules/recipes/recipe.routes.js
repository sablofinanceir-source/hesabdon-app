import { Router } from 'express';
import { PERMISSIONS as P } from '../../config/permissions.js';
import { idParams } from '../../core/schemas.js';
import { validate } from '../../core/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireFeature } from '../../middlewares/feature.js';
import { requirePermission } from '../../middlewares/permission.js';
import * as c from './recipe.controller.js';
import { createRecipeBody, updateRecipeBody } from './recipe.validation.js';

const router = Router();
router.use(authenticate, requireFeature('recipes'), requirePermission(P.RECIPES_MANAGE));

router.get('/', c.list);
router.get('/:id', validate({ params: idParams }), c.get);
router.post('/', validate({ body: createRecipeBody }), c.create);
router.patch('/:id', validate({ params: idParams, body: updateRecipeBody }), c.update);
router.delete('/:id', validate({ params: idParams }), c.remove);

export default router;
