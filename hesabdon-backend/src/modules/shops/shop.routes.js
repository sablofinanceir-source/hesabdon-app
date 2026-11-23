import { Router } from 'express';
import { PERMISSIONS } from '../../config/permissions.js';
import { validate } from '../../core/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import * as c from './shop.controller.js';
import { updateShopBody } from './shop.validation.js';

const router = Router();
router.use(authenticate);

router.get('/', c.get);
router.get('/plan', c.plan);
router.patch('/', requirePermission(PERMISSIONS.SETTINGS_MANAGE), validate({ body: updateShopBody }), c.update);

export default router;
