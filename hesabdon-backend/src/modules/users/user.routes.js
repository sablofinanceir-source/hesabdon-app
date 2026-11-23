import { Router } from 'express';
import { PERMISSIONS } from '../../config/permissions.js';
import { idParams } from '../../core/schemas.js';
import { validate } from '../../core/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { requireFeature } from '../../middlewares/feature.js';
import { requirePermission } from '../../middlewares/permission.js';
import * as c from './user.controller.js';
import { createStaffBody, pushTokenBody, updateMeBody, updateStaffBody } from './user.validation.js';

// ---- پروفایل خود کاربر: /users/me ----
export const userRouter = Router();
userRouter.use(authenticate);
userRouter.get('/me', c.me);
userRouter.patch('/me', validate({ body: updateMeBody }), c.updateMe);
userRouter.put('/me/push-token', validate({ body: pushTokenBody }), c.addPushToken);
userRouter.post('/me/push-token/remove', validate({ body: pushTokenBody }), c.removePushToken);

// ---- مدیریت کارکنان: /staff (فقط مالک + طرح حرفه‌ای) ----
export const staffRouter = Router();
staffRouter.use(authenticate, requirePermission(PERMISSIONS.STAFF_MANAGE), requireFeature('staff'));
staffRouter.get('/', c.listStaff);
staffRouter.post('/', validate({ body: createStaffBody }), c.createStaff);
staffRouter.patch('/:id', validate({ params: idParams, body: updateStaffBody }), c.updateStaff);
staffRouter.delete('/:id', validate({ params: idParams }), c.deactivateStaff);
