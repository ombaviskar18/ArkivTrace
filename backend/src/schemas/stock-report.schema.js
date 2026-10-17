import { z } from 'zod';

/**
 * Accepted grain types across ArkivTrace.
 * Kept in sync with dispatch.schema.js to ensure consistent attribute indexing.
 */
const GRAIN_TYPES = ['wheat', 'rice', 'coarse_grains', 'sugar'];

/**
 * Period format: YYYY-MM  (e.g. "2026-10")
 * Used as a queryable Arkiv attribute for filtering reports by calendar month.
 */
const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Non-negative whole-kilogram validator.
 * Quantities must be integers ≥ 0 (partial kilograms are not tracked).
 */
const wholeKg = (fieldName) =>
  z
    .number({ required_error: `${fieldName} is required` })
    .int(`${fieldName} must be a whole number (integer kilograms)`)
    .min(0, `${fieldName} cannot be negative`);

/**
 * Zod schema for creating a monthly stock and distribution report.
 *
 * Business rules encoded here:
 *  - closingStockKg can be less than expectedClosing (that triggers a mismatch flag).
 *  - distributedKg exceeding openingStockKg alone is allowed — received stock in-period
 *    may cover it — so we do NOT validate cross-field here; the service does the math.
 */
export const createStockReportSchema = z.object({
  body: z.object({
    reportId: z
      .string({ required_error: 'reportId is required' })
      .trim()
      .min(3, 'reportId must be at least 3 characters')
      .max(32, 'reportId must not exceed 32 characters')
      .regex(
        /^[A-Za-z0-9-_]+$/,
        'reportId can only contain letters, numbers, hyphens, and underscores',
      ),

    shopId: z
      .string({ required_error: 'shopId is required' })
      .trim()
      .min(3)
      .max(32),

    grainType: z.enum(GRAIN_TYPES, {
      required_error: `grainType must be one of: ${GRAIN_TYPES.join(', ')}`,
    }),

    /**
     * Reporting period as YYYY-MM.
     * This is used as a queryable Arkiv attribute so admins can pull all reports
     * for a given month across shops.
     */
    period: z
      .string({ required_error: 'period is required (format: YYYY-MM)' })
      .trim()
      .regex(PERIOD_REGEX, 'period must be in YYYY-MM format (e.g. "2026-10")'),

    /** Stock at the start of the reporting period (carried forward from previous month). */
    openingStockKg: wholeKg('openingStockKg'),

    /** Total grain distributed to beneficiaries during the period. */
    distributedKg: wholeKg('distributedKg'),

    /**
     * Physical closing stock measured at the end of the period.
     * Compared against the calculated expectedClosingKg to detect mismatches.
     */
    closingStockKg: wholeKg('closingStockKg'),

    /** Free-text note from the operator. */
    remarks: z.string().trim().max(256).optional().default(''),
  }),
});

/**
 * Zod schema for querying/filtering stock reports.
 */
export const queryStockReportSchema = z.object({
  query: z.object({
    shopId: z.string().trim().optional(),
    period: z
      .string()
      .trim()
      .regex(PERIOD_REGEX, 'period must be in YYYY-MM format')
      .optional(),
    grainType: z.enum(GRAIN_TYPES).optional(),
    stockStatus: z.enum(['MATCH', 'MISMATCH', 'INSUFFICIENT_DATA']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
