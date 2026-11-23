import { Router } from 'express';
import { PERMISSIONS as P } from '../../config/permissions.js';
import { idParams } from '../../core/schemas.js';
import { validate } from '../../core/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireAny, requirePermission } from '../../middlewares/permission.js';
import * as c from './product.controller.js';
import { barcodeParams, createProductBody, listProductsQuery, updateProductBody } from './product.validation.js';

const router = Router();
router.use(authenticate);

// فروشنده‌ها هم برای ساخت فاکتور باید کالا را ببینند
const canRead = requireAny(P.PRODUCTS_READ, P.PRODUCTS_WRITE, P.SALES_CREATE, P.PURCHASES_CREATE);
const canWrite = requirePermission(P.PRODUCTS_WRITE);

router.get('/', canRead, validate({ query: listProductsQuery }), c.list);
router.get('/categories', canRead, c.categories);
router.get('/barcode/:code', canRead, validate({ params: barcodeParams }), c.byBarcode);
router.get('/:id', canRead, validate({ params: idParams }), c.get);
router.post('/', canWrite, validate({ body: createProductBody }), c.create);
router.patch('/:id', canWrite, validate({ params: idParams, body: updateProductBody }), c.update);
router.delete('/:id', canWrite, validate({ params: idParams }), c.archive);

export default router;
