import { z } from 'zod';

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const wholeKg = (fieldName) =>
  z
    .number({ required_error: `${fieldName} is required` })
    .int(`${fieldName} must be a whole number (integer kilograms)`)
    .min(0, `${fieldName} cannot be negative`);

export const listDiscrepancyQuerySchema = z.object({
  query: z.object({
    shopId: z.string().trim().optional(),
    period: z.string().trim().regex(PERIOD_REGEX, 'period must be in YYYY-MM format').optional(),
    caseStatus: z.enum(['open', 'under_review', 'resolved', 'rejected']).optional(),
    severity: z.enum(['minor', 'major', 'critical', 'stock_mismatch', 'public_report']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const createPublicDiscrepancySchema = z.object({
  body: z.object({
    shopId: z.string({ required_error: 'shopId is required' }).trim().min(3).max(32),
    period: z.string({ required_error: 'period is required' }).trim().regex(PERIOD_REGEX),
    issueType: z.string({ required_error: 'issueType is required' }).trim().min(3).max(64),
    severity: z.enum(['minor', 'major', 'critical']).default('major'),
    description: z.string({ required_error: 'description is required' }).trim().min(10).max(500),
    evidenceEntityKeys: z.array(z.string().trim().min(3).max(80)).default([]),
    observedDiscrepancyKg: wholeKg('observedDiscrepancyKg').optional(),
    reporterName: z.string().trim().max(64).optional().default('Anonymous'),
    reporterContact: z.string().trim().max(128).optional().default(''),
    reportId: z.string().trim().max(64).optional(),
  }),
});

export const reviewDiscrepancySchema = z.object({
  body: z.object({
    decision: z.enum(['under_review', 'resolved', 'rejected']),
    notes: z.string().trim().max(500).optional().default(''),
    reviewerName: z.string().trim().max(64).optional().default('admin'),
  }),
});
