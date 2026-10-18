import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Synchronize authenticated user profile and roles against Arkiv
router.get('/sync', requireAuth, authController.syncProfile);
router.post('/sync', requireAuth, authController.syncProfile);

// Get current authenticated user profile
router.get('/me', requireAuth, authController.getMe);

export default router;
