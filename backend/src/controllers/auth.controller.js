import { getAuth } from '@clerk/express';
import { clerkClient } from '../config/clerk.js';
import { shopService } from '../services/shop.service.js';
import { clearUserMetadataCache } from '../middlewares/auth.middleware.js';

export const authController = {
  /**
   * GET /api/v1/auth/sync
   * Synchronizes authenticated user's Clerk profile against Arkiv on-chain shop assignments.
   * Ensures operators who registered after shop creation or whose session has stale metadata
   * are immediately upgraded to operator role and bound to their shop.
   */
  async syncProfile(req, res, next) {
    try {
      let clerkAuth = null;
      try {
        clerkAuth = getAuth(req);
      } catch {
        // ignore
      }

      const userId = clerkAuth?.userId || req.clerkUserId || req.auth?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required to synchronize user profile.',
        });
      }

      if (!clerkClient) {
        return res.status(200).json({
          success: true,
          data: {
            role: req.userRole || 'public',
            shopId: req.assignedShopId || null,
            assignedShopIds: req.assignedShopIds || [],
            updated: false,
          },
        });
      }

      // Fetch live user from Clerk
      const clerkUser = await clerkClient.users.getUser(userId);
      const emailAddresses = (clerkUser.emailAddresses || []).map((e) => e.emailAddress);
      const primaryEmail =
        clerkUser.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
        emailAddresses[0] ||
        '';

      // Check all verified user emails against Arkiv
      let syncResult = null;
      for (const email of emailAddresses) {
        syncResult = await shopService.syncUserRole(userId, email);
        if (syncResult.role === 'operator' || syncResult.role === 'admin') {
          break;
        }
      }

      if (!syncResult) {
        syncResult = await shopService.syncUserRole(userId, primaryEmail);
      }

      if (syncResult.updated) {
        clearUserMetadataCache(userId);
      }

      return res.status(200).json({
        success: true,
        data: syncResult,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/auth/me
   * Returns current authenticated profile details
   */
  async getMe(req, res, next) {
    try {
      return res.status(200).json({
        success: true,
        data: {
          userId: req.clerkUserId || null,
          role: req.userRole || 'public',
          shopId: req.assignedShopId || null,
          assignedShopIds: req.assignedShopIds || [],
          isAdmin: req.userRole === 'admin',
          isOperator: req.userRole === 'operator',
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
