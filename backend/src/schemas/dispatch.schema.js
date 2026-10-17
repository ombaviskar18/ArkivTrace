import { z } from 'zod';

/**
 * Zod validation schema for creating a grain dispatch record
 */
export const createDispatchSchema = z.object({
  body: z.object({
    dispatchId: z
      .string({ required_error: 'dispatchId is required' })
      .trim()
      .min(3, 'dispatchId must be at least 3 characters')
      .max(32, 'dispatchId must not exceed 32 characters')
      .regex(/^[A-Za-z0-9-_]+$/, 'dispatchId can only contain letters, numbers, hyphens, and underscores'),
    shopId: z
      .string({ required_error: 'shopId is required' })
      .trim()
      .min(3, 'shopId must be at least 3 characters')
      .max(32, 'shopId must not exceed 32 characters'),
    sourceDepot: z
      .string({ required_error: 'sourceDepot is required' })
      .trim()
      .min(3, 'sourceDepot must be at least 3 characters')
      .max(64, 'sourceDepot must not exceed 64 characters'),
    grainType: z.enum(['wheat', 'rice', 'coarse_grains', 'sugar'], {
      required_error: 'grainType must be one of: wheat, rice, coarse_grains, sugar',
    }),
    dispatchedQuantityKg: z
      .number({ required_error: 'dispatchedQuantityKg is required' })
      .positive('dispatchedQuantityKg must be greater than 0'),
    truckNumber: z
      .string({ required_error: 'truckNumber is required' })
      .trim()
      .min(3, 'truckNumber must be at least 3 characters')
      .max(32, 'truckNumber must not exceed 32 characters'),
    driverName: z
      .string({ required_error: 'driverName is required' })
      .trim()
      .min(2, 'driverName must be at least 2 characters')
      .max(64, 'driverName must not exceed 64 characters'),
    driverPhone: z.string().trim().max(20).optional().default('N/A'),
    dispatchDate: z
      .string({ required_error: 'dispatchDate is required' })
      .trim()
      .default(() => new Date().toISOString()),
    expectedDeliveryDate: z.string().trim().optional(),
    remarks: z.string().trim().max(256).optional().default(''),
  }),
});

/**
 * Zod validation schema for querying dispatch records
 */
export const queryDispatchSchema = z.object({
  query: z.object({
    shopId: z.string().trim().optional(),
    status: z.string().trim().optional(),
    grainType: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
