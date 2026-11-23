import { Router } from 'express';
import { asyncHandler } from '../core/asyncHandler.js';
import { sendOk } from '../core/response.js';
import authRoutes from './auth/auth.routes.js';
import chequeRoutes from './cheques/cheque.routes.js';
import inventoryRoutes from './inventory/inventory.routes.js';
import invoiceRoutes from './invoices/invoice.routes.js';
import partyRoutes from './parties/party.routes.js';
import productRoutes from './products/product.routes.js';
import recipeRoutes from './recipes/recipe.routes.js';
import reminderRoutes from './reminders/reminder.routes.js';
import reportRoutes from './reports/report.routes.js';
import shopRoutes from './shops/shop.routes.js';
import { listPlans } from './shops/shop.service.js';
import { staffRouter, userRouter } from './users/user.routes.js';
import voiceRoutes from './voice/voice.routes.js';

const router = Router();

router.get('/health', (_req, res) => sendOk(res, { status: 'ok', time: new Date().toISOString() }));
router.get('/plans', asyncHandler(async (_req, res) => sendOk(res, listPlans()))); // عمومی: صفحه قیمت‌ها

router.use('/auth', authRoutes);
router.use('/users', userRouter);
router.use('/staff', staffRouter);
router.use('/shop', shopRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/parties', partyRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/cheques', chequeRoutes);
router.use('/recipes', recipeRoutes);
router.use('/reminders', reminderRoutes);
router.use('/reports', reportRoutes);
router.use('/voice', voiceRoutes);

export default router;
