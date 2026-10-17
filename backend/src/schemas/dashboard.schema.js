import { z } from 'zod';

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export const summaryQuerySchema = z.object({
  query: z.object({
    district: z.string().trim().optional(),
    period: z.string().trim().regex(PERIOD_REGEX, 'period must be in YYYY-MM format').optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const timelineQuerySchema = z.object({
  params: z.object({
    id: z.string().trim().min(3, 'Shop identifier is required').max(64),
  }),
  query: z.object({
    period: z.string().trim().regex(PERIOD_REGEX, 'period must be in YYYY-MM format').optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
});
