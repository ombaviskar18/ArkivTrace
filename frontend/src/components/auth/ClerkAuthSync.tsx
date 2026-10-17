'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setAuthTokenGetter } from '@/lib/api';

/**
 * Headless sync component mounted inside ClerkProvider.
 * Bridges Clerk's active JWT session token to the API client without
 * requiring React hooks inside pure asynchronous API functions.
 */
export function ClerkAuthSync() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(async () => {
      try {
        if (!isSignedIn) return null;
        return await getToken();
      } catch (err) {
        console.warn('Unable to get fresh Clerk session token:', err);
        return null;
      }
    });
  }, [getToken, isSignedIn]);

  return null;
}
