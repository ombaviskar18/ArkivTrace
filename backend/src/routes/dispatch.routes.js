import { Router } from 'express';
import { dispatchController } from '../controllers/dispatch.controller.js';
import { requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createDispatchSchema, queryDispatchSchema } from '../schemas/dispatch.schema.js';

const router = Router();

// Create new grain dispatch (Admin role required)
router.post('/', requireRole(['admin']), validate(createDispatchSchema), dispatchController.createDispatch);

// List dispatch records with optional filters
router.get('/', validate(queryDispatchSchema), dispatchController.listDispatches);

// Retrieve dispatch record by Arkiv entity key or dispatchId
router.get('/:id', dispatchController.getDispatchById);

export default router;
