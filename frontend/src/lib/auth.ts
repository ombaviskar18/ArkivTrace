'use client';

import { useUser } from '@clerk/nextjs';

export type UserRole = 'admin' | 'operator' | 'public';

export interface UserRoleInfo {
  isLoaded: boolean;
  isSignedIn: boolean;
  role: UserRole;
  shopId: string | null;
  isAdmin: boolean;
  isOperator: boolean;
  isPublic: boolean;
  userName: string | null;
  userEmail: string | null;
}

/**
 * Normalized extraction of trusted role and assigned shop scope
 * from Clerk publicMetadata. Never relies on editable client state.
 */
export function useUserRole(): UserRoleInfo {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return {
      isLoaded: false,
      isSignedIn: false,
      role: 'public',
      shopId: null,
      isAdmin: false,
      isOperator: false,
      isPublic: true,
      userName: null,
      userEmail: null,
    };
  }

  if (!isSignedIn || !user) {
    return {
      isLoaded: true,
      isSignedIn: false,
      role: 'public',
      shopId: null,
      isAdmin: false,
      isOperator: false,
      isPublic: true,
      userName: null,
      userEmail: null,
    };
  }

  // Extract from trusted Clerk metadata
  const metadata = (user.publicMetadata || {}) as Record<string, unknown>;
  const rawRole = String(metadata.role || 'public').toLowerCase().trim();
  
  let role: UserRole = 'public';
  if (rawRole === 'admin') role = 'admin';
  else if (rawRole === 'operator') role = 'operator';
  else role = 'public';

  const rawShopId = metadata.shopId ? String(metadata.shopId).trim().toUpperCase() : null;

  const email = user.primaryEmailAddress?.emailAddress || null;
  const name = user.fullName || user.username || email?.split('@')[0] || 'User';

  return {
    isLoaded: true,
    isSignedIn: true,
    role,
    shopId: rawShopId,
    isAdmin: role === 'admin',
    isOperator: role === 'operator',
    isPublic: role === 'public',
    userName: name,
    userEmail: email,
  };
}
