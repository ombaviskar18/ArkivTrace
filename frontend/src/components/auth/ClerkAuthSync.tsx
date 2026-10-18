'use client';

import { useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { setAuthTokenGetter, api } from '@/lib/api';

/**
 * Headless sync component mounted inside ClerkProvider.
 * Bridges Clerk's active JWT session token to the API client without
 * requiring React hooks inside pure asynchronous API functions.
 * Also synchronizes on-chain Arkiv operator assignments into the Clerk session.
 */
export function ClerkAuthSync() {
  const { getToken, isSignedIn } = useAuth();
  const { user, isLoaded } = useUser();
  const hasSyncedRef = useRef<string | null>(null);

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

  // Synchronize on-chain operator assignment with live Clerk session
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const syncKey = `${user.id}:${user.updatedAt || ''}`;
    if (hasSyncedRef.current === syncKey) return;
    hasSyncedRef.current = syncKey;

    let isMounted = true;

    async function runSync() {
      try {
        const currentUser = user;
        if (!currentUser || !isMounted) return;

        const syncResult = await api.syncAuthProfile();
        if (!isMounted || !syncResult) return;

        const currentRole = ((currentUser.publicMetadata?.role as string) || '').toLowerCase().trim();
        const currentShopId = currentUser.publicMetadata?.shopId as string | undefined;

        const shouldReload =
          syncResult.updated ||
          (syncResult.role === 'operator' && currentRole !== 'operator') ||
          (syncResult.shopId && currentShopId !== syncResult.shopId);

        if (shouldReload) {
          console.log('[ClerkAuthSync] Reloading Clerk session to apply operator role/shopId...');
          await currentUser.reload();
        }
      } catch (err) {
        console.warn('[ClerkAuthSync] Background profile sync note:', err);
      }
    }

    // Delay slightly to ensure token getter is registered
    const timer = setTimeout(runSync, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isLoaded, isSignedIn, user]);

  return null;
}

