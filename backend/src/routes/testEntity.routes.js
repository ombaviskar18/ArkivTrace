import { Router } from 'express';
import { testEntityController } from '../controllers/testEntity.controller.js';
import { requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createTestEntitySchema,
  getEntityByKeySchema,
  queryTestEntitiesSchema,
} from '../schemas/testEntity.schema.js';

const router = Router();

// Network and wallet status
router.get('/health', testEntityController.getHealth);

// Create test entity on Arkiv
const testCreateMiddleware =
  process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_WRITES !== 'true'
    ? [requireRole(['admin'])]
    : [];

router.post(
  '/create',
  ...testCreateMiddleware,
  validate(createTestEntitySchema),
  testEntityController.createTestEntity,
);

// Retrieve entity by Arkiv 32-byte key
router.get('/entity/:key', validate(getEntityByKeySchema), testEntityController.getEntity);

// Query test entities from Arkiv
router.get('/list', validate(queryTestEntitiesSchema), testEntityController.listTestEntities);

export default router;
