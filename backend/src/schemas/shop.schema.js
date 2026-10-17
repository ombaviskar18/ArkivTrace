import { z } from 'zod';

/**
 * Zod validation schema for creating a new Fair Price Shop
 */
export const createShopSchema = z.object({
  body: z.object({
    shopId: z
      .string({ required_error: 'shopId is required' })
      .trim()
      .min(3, 'shopId must be at least 3 characters')
      .max(32, 'shopId must not exceed 32 characters')
      .regex(/^[A-Za-z0-9-_]+$/, 'shopId can only contain letters, numbers, hyphens, and underscores'),
    name: z
      .string({ required_error: 'Shop name is required' })
      .trim()
      .min(3, 'Shop name must be at least 3 characters')
      .max(64, 'Shop name must not exceed 64 characters'),
    operatorName: z
      .string({ required_error: 'Operator name is required' })
      .trim()
      .min(2, 'Operator name must be at least 2 characters')
      .max(64, 'Operator name must not exceed 64 characters'),
    operatorAddress: z
      .string()
      .trim()
      .max(64)
      .optional()
      .default('N/A'),
    district: z
      .string({ required_error: 'District is required' })
      .trim()
      .min(2, 'District must be at least 2 characters')
      .max(64, 'District must not exceed 64 characters'),
    state: z
      .string({ required_error: 'State is required' })
      .trim()
      .min(2, 'State must be at least 2 characters')
      .max(64, 'State must not exceed 64 characters'),
    address: z
      .string({ required_error: 'Address is required' })
      .trim()
      .min(5, 'Address must be at least 5 characters')
      .max(128, 'Address must not exceed 128 characters'),
    allocatedBeneficiaries: z
      .number({ required_error: 'allocatedBeneficiaries is required' })
      .int('allocatedBeneficiaries must be an integer')
      .min(1, 'Shop must have at least 1 beneficiary'),
    monthlyQuotaKg: z
      .object({
        wheat: z.number().min(0, 'Wheat quota cannot be negative').default(0),
        rice: z.number().min(0, 'Rice quota cannot be negative').default(0),
        coarseGrains: z.number().min(0, 'Coarse grains quota cannot be negative').optional().default(0),
      })
      .default({ wheat: 0, rice: 0, coarseGrains: 0 }),
    status: z.enum(['active', 'suspended', 'inactive']).default('active'),
  }),
});

/**
 * Zod validation schema for querying shops
 */
export const queryShopSchema = z.object({
  query: z.object({
    district: z.string().trim().optional(),
    state: z.string().trim().optional(),
    shopId: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const shopTimelineSchema = z.object({
  params: z.object({
    id: z.string().trim().min(3, 'Shop identifier is required').max(64),
  }),
  query: z.object({
    period: z
      .string()
      .trim()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'period must be in YYYY-MM format')
      .optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
});
