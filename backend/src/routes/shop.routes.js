import { Router } from 'express';
import { shopController } from '../controllers/shop.controller.js';
import { requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createShopSchema, queryShopSchema, shopTimelineSchema } from '../schemas/shop.schema.js';

const router = Router();

// Register a new Fair Price Shop (Admin role required)
router.post('/', requireRole(['admin']), validate(createShopSchema), shopController.createShop);

// List shops with optional filters
router.get('/', validate(queryShopSchema), shopController.listShops);

// Combined evidence timeline for a shop
router.get('/:id/timeline', validate(shopTimelineSchema), shopController.getShopTimeline);

// Retrieve shop by Arkiv entity key or shopId
router.get('/:id', shopController.getShopById);

export default router;
