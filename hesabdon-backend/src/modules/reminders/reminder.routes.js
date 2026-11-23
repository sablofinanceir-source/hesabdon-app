import { Router } from 'express';
import { PERMISSIONS as P } from '../../config/permissions.js';
import { idParams } from '../../core/schemas.js';
import { validate } from '../../core/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import * as c from './reminder.controller.js';
import { createReminderBody, listRemindersQuery, updateReminderBody } from './reminder.validation.js';

const router = Router();
router.use(authenticate, requirePermission(P.REMINDERS_MANAGE));

router.get('/', validate({ query: listRemindersQuery }), c.list);
router.post('/', validate({ body: createReminderBody }), c.create);
router.patch('/:id', validate({ params: idParams, body: updateReminderBody }), c.update);
router.post('/:id/complete', validate({ params: idParams }), c.complete);
router.delete('/:id', validate({ params: idParams }), c.remove);

export default router;
