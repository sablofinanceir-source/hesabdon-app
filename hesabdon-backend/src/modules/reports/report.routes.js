import { Router } from 'express';
import { PERMISSIONS as P } from '../../config/permissions.js';
import { validate } from '../../core/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import * as c from './report.controller.js';
import { rangeQuery, salesByPeriodQuery, topProductsQuery } from './report.validation.js';

const router = Router();
router.use(authenticate, requirePermission(P.REPORTS_VIEW));

router.get('/dashboard', c.dashboard);
router.get('/summary', validate({ query: rangeQuery }), c.summary);
router.get('/sales-by-period', validate({ query: salesByPeriodQuery }), c.salesByPeriod);
router.get('/top-products', validate({ query: topProductsQuery }), c.topProducts);
router.get('/low-stock', c.lowStock);
router.get('/balances', c.balances);

export default router;
