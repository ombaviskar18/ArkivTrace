import 'dotenv/config';
import { createClerkClient } from '@clerk/express';

/**
 * Shared Clerk Backend Client instance
 * Initialized with CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY
 */
export const clerkClient = process.env.CLERK_SECRET_KEY
  ? createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    })
  : null;
