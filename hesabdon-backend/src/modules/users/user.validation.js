import { z } from 'zod';
import { ASSIGNABLE_PERMISSIONS, ROLE_PRESETS } from '../../config/permissions.js';
import { mobileSchema } from '../../core/schemas.js';

const permissionsList = z.array(z.enum(ASSIGNABLE_PERMISSIONS)).max(30);
export const updateMeBody = z.object({ name: z.string().trim().min(1).max(80) });
export const pushTokenBody = z.object({ token: z.string().min(10).max(200) });

export const createStaffBody = z
  .object({
    name: z.string().trim().min(1).max(80),
    phone: mobileSchema,
    preset: z.enum(Object.keys(ROLE_PRESETS)).optional(),
    permissions: permissionsList.optional(),
  })
  .refine((d) => d.preset || d.permissions, { message: 'preset یا permissions الزامی است' });

export const updateStaffBody = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  preset: z.enum(Object.keys(ROLE_PRESETS)).optional(),
  permissions: permissionsList.optional(),
  isActive: z.boolean().optional(),
});
