import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { summaryQuerySchema } from '../schemas/dashboard.schema.js';

const router = Router();

router.get('/summary', validate(summaryQuerySchema), dashboardController.getSummary);

export default router;
