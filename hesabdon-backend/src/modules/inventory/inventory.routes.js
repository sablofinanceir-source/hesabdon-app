import { Router } from 'express';
import { PERMISSIONS as P } from '../../config/permissions.js';
import { validate } from '../../core/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import * as c from './inventory.controller.js';
import { adjustBody, movementsQuery } from './inventory.validation.js';

const router = Router();
router.use(authenticate, requirePermission(P.INVENTORY_MANAGE));

router.get('/movements', validate({ query: movementsQuery }), c.movements);
router.get('/valuation', c.valuation);
router.post('/adjust', validate({ body: adjustBody }), c.adjust);

export default router;
