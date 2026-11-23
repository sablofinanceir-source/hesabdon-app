import { Router } from 'express';
import { PERMISSIONS as P } from '../../config/permissions.js';
import { idParams } from '../../core/schemas.js';
import { validate } from '../../core/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireAny } from '../../middlewares/permission.js';
import * as c from './invoice.controller.js';
import {
  addItemBody, createInvoiceBody, finalizeBody, itemParams, listInvoicesQuery,
  receiptQuery, updateInvoiceBody, updateItemBody, voidBody,
} from './invoice.validation.js';

const router = Router();
// مجوز دقیق‌تر (فروش یا خرید) در لایه سرویس بر اساس نوع فاکتور بررسی می‌شود
router.use(authenticate, requireAny(P.SALES_CREATE, P.PURCHASES_CREATE));

router.get('/', validate({ query: listInvoicesQuery }), c.list);
router.post('/', validate({ body: createInvoiceBody }), c.create);
router.get('/:id', validate({ params: idParams }), c.get);
router.put('/:id', validate({ params: idParams, body: updateInvoiceBody }), c.update);
router.delete('/:id', validate({ params: idParams }), c.remove);

router.post('/:id/finalize', validate({ params: idParams, body: finalizeBody }), c.finalize);
router.post('/:id/void', validate({ params: idParams, body: voidBody }), c.voidInvoice);
router.get('/:id/receipt', validate({ params: idParams, query: receiptQuery }), c.receipt);

router.post('/:id/items', validate({ params: idParams, body: addItemBody }), c.addItem);
router.patch('/:id/items/:itemId', validate({ params: itemParams, body: updateItemBody }), c.updateItem);
router.delete('/:id/items/:itemId', validate({ params: itemParams }), c.removeItem);

export default router;
