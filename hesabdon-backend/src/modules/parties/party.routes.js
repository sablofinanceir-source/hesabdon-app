import { Router } from 'express';
import { PERMISSIONS as P } from '../../config/permissions.js';
import { idParams } from '../../core/schemas.js';
import { validate } from '../../core/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireAny, requirePermission } from '../../middlewares/permission.js';
import * as c from './party.controller.js';
import { createPartyBody, ledgerQuery, listPartiesQuery, paymentBody, updatePartyBody } from './party.validation.js';

const router = Router();
router.use(authenticate);

const canRead = requireAny(P.PARTIES_READ, P.PARTIES_WRITE, P.SALES_CREATE, P.PURCHASES_CREATE);
const canWrite = requirePermission(P.PARTIES_WRITE);

router.get('/', canRead, validate({ query: listPartiesQuery }), c.list);
router.get('/:id', canRead, validate({ params: idParams }), c.get);
router.get('/:id/ledger', canRead, validate({ params: idParams, query: ledgerQuery }), c.ledger);
router.post('/', canWrite, validate({ body: createPartyBody }), c.create);
router.patch('/:id', canWrite, validate({ params: idParams, body: updatePartyBody }), c.update);
router.post('/:id/payments', canWrite, validate({ params: idParams, body: paymentBody }), c.payment);
router.delete('/:id', canWrite, validate({ params: idParams }), c.archive);

export default router;
