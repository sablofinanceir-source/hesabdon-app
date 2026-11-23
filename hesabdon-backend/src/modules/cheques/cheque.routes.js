import { Router } from 'express';
import { PERMISSIONS as P } from '../../config/permissions.js';
import { idParams } from '../../core/schemas.js';
import { validate } from '../../core/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireFeature } from '../../middlewares/feature.js';
import { requirePermission } from '../../middlewares/permission.js';
import * as c from './cheque.controller.js';
import { changeStatusBody, createChequeBody, listChequesQuery, updateChequeBody } from './cheque.validation.js';

const router = Router();
router.use(authenticate, requireFeature('cheques'), requirePermission(P.CHEQUES_MANAGE));

router.get('/', validate({ query: listChequesQuery }), c.list);
router.get('/summary', c.summary);
router.post('/', validate({ body: createChequeBody }), c.create);
router.get('/:id', validate({ params: idParams }), c.get);
router.patch('/:id', validate({ params: idParams, body: updateChequeBody }), c.update);
router.post('/:id/status', validate({ params: idParams, body: changeStatusBody }), c.changeStatus);
router.delete('/:id', validate({ params: idParams }), c.remove);

export default router;
