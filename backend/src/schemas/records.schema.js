import { z } from 'zod';

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export const recordsQuerySchema = z.object({
  query: z.object({
    shopId: z.string().trim().optional(),
    district: z.string().trim().optional(),
    period: z.string().trim().regex(PERIOD_REGEX, 'period must be in YYYY-MM format').optional(),
    recordType: z
      .enum(['dispatch', 'receipt', 'stock_report', 'discrepancy', 'audit_event', 'all'])
      .default('all'),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  }),
});

export const getRecordByKeySchema = z.object({
  params: z.object({
    key: z.string().trim().min(1, 'Record key or identifier is required'),
  }),
});
