import { Router } from 'express';
import { stockReportController } from '../controllers/stock-report.controller.js';
import { requireRole, requireShopScope } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createStockReportSchema,
  queryStockReportSchema,
} from '../schemas/stock-report.schema.js';

const router = Router();

// Submit a monthly stock and distribution report (admin or operator role required)
router.post(
  '/',
  requireRole(['admin', 'operator']),
  requireShopScope((req) => req.body?.shopId),
  validate(createStockReportSchema),
  stockReportController.createStockReport,
);

// List stock reports with optional filters (public read)
router.get('/', validate(queryStockReportSchema), stockReportController.listStockReports);

// Retrieve a specific report by reportId or Arkiv entity key (public read)
router.get('/:id', stockReportController.getStockReportById);

export default router;
