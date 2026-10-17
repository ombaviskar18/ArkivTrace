import { Router } from 'express';
import { receiptController } from '../controllers/receipt.controller.js';
import { requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createReceiptSchema, queryReceiptSchema } from '../schemas/receipt.schema.js';

const router = Router();

// Confirm grain receipt (operator or admin role required)
router.post(
  '/',
  requireRole(['admin', 'operator']),
  validate(createReceiptSchema),
  receiptController.createReceipt,
);

// List receipt records with optional filters
router.get('/', validate(queryReceiptSchema), receiptController.listReceipts);

// Retrieve receipt record by Arkiv entity key or receiptId
router.get('/:id', receiptController.getReceiptById);

export default router;
