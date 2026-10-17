import { Router } from 'express';
import { recordsController } from '../controllers/records.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { recordsQuerySchema, getRecordByKeySchema } from '../schemas/records.schema.js';

const router = Router();

router.get('/', validate(recordsQuerySchema), recordsController.listRecords);
router.get('/:key', validate(getRecordByKeySchema), recordsController.getRecordByIdentifier);

export default router;
