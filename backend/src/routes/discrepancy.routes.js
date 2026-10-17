import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { discrepancyController } from '../controllers/discrepancy.controller.js';
import { requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createPublicDiscrepancySchema,
  listDiscrepancyQuerySchema,
  reviewDiscrepancySchema,
} from '../schemas/discrepancy.schema.js';

const router = Router();

const publicReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Please slow down and retry later.',
  },
});

router.get('/', validate(listDiscrepancyQuerySchema), discrepancyController.listDiscrepancies);
router.get('/:id', discrepancyController.getDiscrepancyById);
router.post('/', publicReportLimiter, validate(createPublicDiscrepancySchema), discrepancyController.createPublicDiscrepancy);
router.post('/:id/review', requireRole(['admin']), validate(reviewDiscrepancySchema), discrepancyController.reviewDiscrepancy);

export default router;
