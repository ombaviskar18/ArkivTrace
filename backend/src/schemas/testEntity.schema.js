import { z } from 'zod';

/**
 * Zod validation schema for creating a test entity
 */
export const createTestEntitySchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(64, 'Name must not exceed 64 characters'),
    description: z.string().trim().max(256).optional(),
    category: z.string().trim().max(32).default('test'),
    sampleData: z.record(z.any()).optional().default({}),
    expiresDays: z
      .number({ invalid_type_error: 'expiresDays must be a number' })
      .int('expiresDays must be an integer')
      .min(1, 'Minimum expiration is 1 day')
      .max(365, 'Maximum expiration is 365 days')
      .optional()
      .default(30),
  }),
});

/**
 * Zod validation schema for retrieving an entity by 32-byte hex key
 */
export const getEntityByKeySchema = z.object({
  params: z.object({
    key: z
      .string({ required_error: 'Entity key is required' })
      .trim()
      .regex(
        /^0x[0-9a-fA-F]{64}$/,
        'Entity key must be a valid 32-byte hex string (66 characters with 0x prefix)'
      ),
  }),
});

/**
 * Zod validation schema for querying test entities
 */
export const queryTestEntitiesSchema = z.object({
  query: z.object({
    limit: z.coerce
      .number()
      .int()
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .optional()
      .default(10),
  }),
});
