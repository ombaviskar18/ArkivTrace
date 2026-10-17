import { z } from 'zod';

/**
 * Zod validation schema for confirming a shop receipt
 * Called by a ration-shop operator after grain arrives.
 */
export const createReceiptSchema = z.object({
  body: z.object({
    receiptId: z
      .string({ required_error: 'receiptId is required' })
      .trim()
      .min(3, 'receiptId must be at least 3 characters')
      .max(32, 'receiptId must not exceed 32 characters')
      .regex(
        /^[A-Za-z0-9-_]+$/,
        'receiptId can only contain letters, numbers, hyphens, and underscores',
      ),

    dispatchId: z
      .string({ required_error: 'dispatchId is required' })
      .trim()
      .min(3, 'dispatchId must be at least 3 characters')
      .max(32, 'dispatchId must not exceed 32 characters'),

    shopId: z
      .string({ required_error: 'shopId is required' })
      .trim()
      .min(3, 'shopId must be at least 3 characters')
      .max(32, 'shopId must not exceed 32 characters'),

    receivedQuantityKg: z
      .number({ required_error: 'receivedQuantityKg is required' })
      .positive('receivedQuantityKg must be greater than 0'),

    receivedDate: z
      .string()
      .trim()
      .default(() => new Date().toISOString()),

    receiverName: z
      .string({ required_error: 'receiverName is required' })
      .trim()
      .min(2, 'receiverName must be at least 2 characters')
      .max(64, 'receiverName must not exceed 64 characters'),

    /** Optional free-text note from the shop operator */
    remarks: z.string().trim().max(256).optional().default(''),
  }),
});

/**
 * Zod validation schema for querying receipt records
 */
export const queryReceiptSchema = z.object({
  query: z.object({
    shopId: z.string().trim().optional(),
    dispatchId: z.string().trim().optional(),
    status: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
