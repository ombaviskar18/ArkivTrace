import { eq } from '@arkiv-network/sdk/query';
import { arkivService } from './arkiv.service.js';
import { clerkClient } from '../config/clerk.js';
import { telegramService } from './telegram.service.js';

/**
 * Shop Management Service
 * Manages ration shop entities stored on the Arkiv Tiramisu Web3 Database.
 */
class ShopService {
  /**
   * Register a new Fair Price Shop on Arkiv Tiramisu and bind/invite operator
   *
   * @param {Object} shopData - Validated shop data
   * @returns {Promise<Object>} Created entity details including on-chain transaction hash
   */
  async createShop(shopData) {
    const operatorEmail = (shopData.operatorEmail || '').toLowerCase().trim();

    // 1. Check if shopId already registered to prevent duplicates
    const existing = await this.getShopById(shopData.shopId);
    if (existing) {
      const error = new Error(`A ration shop with ID '${shopData.shopId}' is already registered on Arkiv.`);
      error.statusCode = 409;
      throw error;
    }

    // 2. Lookup Clerk user by operator email & guard against accidental admin overwrite / duplicate assignment
    let targetUser = null;
    if (clerkClient && operatorEmail) {
      try {
        const users = await clerkClient.users.getUserList({ emailAddress: [operatorEmail] });
        targetUser = users?.data?.[0] || users?.[0] || null;
      } catch (err) {
        console.warn(`[ShopService] Clerk user lookup error for ${operatorEmail}:`, err.message);
      }
    }

    // Accidental Admin overwrite protection
    if (targetUser && (targetUser.publicMetadata?.role === 'admin' || targetUser.publicMetadata?.role === 'ADMIN')) {
      const error = new Error(
        `Account with email '${operatorEmail}' has administrative privileges. Cannot overwrite admin role with shop operator.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Clerk duplicate operator assignment guard
    if (targetUser && targetUser.publicMetadata?.shopId && targetUser.publicMetadata.shopId !== shopData.shopId) {
      const error = new Error(
        `Operator with email '${operatorEmail}' is already assigned to shop '${targetUser.publicMetadata.shopId}'. Cannot assign multiple shops.`
      );
      error.statusCode = 409;
      throw error;
    }

    // Arkiv on-chain duplicate operator assignment guard
    if (operatorEmail) {
      const existingShopsWithEmail = await this.listShopsByOperatorEmail(operatorEmail);
      const conflictShop = existingShopsWithEmail.find(
        (s) => (s.payload?.shopId || s.attributes?.shop_id) !== shopData.shopId
      );
      if (conflictShop) {
        const conflictId = conflictShop.payload?.shopId || conflictShop.attributes?.shop_id;
        const error = new Error(
          `Operator with email '${operatorEmail}' is already assigned to shop '${conflictId}' on Arkiv. Cannot assign multiple shops.`
        );
        error.statusCode = 409;
        throw error;
      }
    }

    // 3. Queryable indexing attributes (Arkiv on-chain indexing uses snake_case lowercase)
    const attributes = {
      project: 'arkivtrace',
      type: 'shop',
      shop_id: shopData.shopId,
      district: shopData.district,
      state: shopData.state,
    };
    if (operatorEmail) {
      attributes.operator_email = operatorEmail;
    }

    // 4. Full record payload (store operator details so dealer and admin can view assigned credentials)
    const payload = {
      ...shopData,
      operatorEmail,
      project: 'arkivtrace',
      entityType: 'shop',
      createdAt: new Date().toISOString(),
    };

    // 5. Submit to Arkiv (stores for 180 days by default)
    const result = await arkivService.createEntity({
      payload,
      attributes,
      expiresDays: 180,
    });

    // 6. Bind operator in Clerk or generate an on-chain invitation
    let operatorAssignment = null;

    if (targetUser) {
      // Operator exists in Clerk -> update publicMetadata
      if (clerkClient) {
        try {
          const newMeta = {
            role: 'operator',
            shopId: shopData.shopId,
            assignedShopIds: [shopData.shopId],
          };
          if (typeof clerkClient.users.updateUserMetadata === 'function') {
            await clerkClient.users.updateUserMetadata(targetUser.id, {
              publicMetadata: newMeta,
            });
          } else {
            const existingMeta = targetUser.publicMetadata || {};
            await clerkClient.users.updateUser(targetUser.id, {
              publicMetadata: {
                ...existingMeta,
                ...newMeta,
              },
            });
          }
        } catch (updateErr) {
          console.warn(`[ShopService] Failed to update Clerk metadata for ${targetUser.id}:`, updateErr.message);
        }
      }

      // Fire optional Telegram notification to operator
      telegramService
        .notifyOperatorAssigned({
          shopId: shopData.shopId,
          operatorEmail,
          operatorName: shopData.operatorName,
          entityKey: result.entityKey,
        })
        .catch(() => {});

      operatorAssignment = {
        status: 'assigned',
        userId: targetUser.id,
        email: operatorEmail,
        shopId: shopData.shopId,
        role: 'operator',
      };
    } else if (operatorEmail) {
      // Operator not yet registered in Clerk -> create on-chain invitation entity
      let invitationResult = null;
      try {
        const invitationAttrs = {
          project: 'arkivtrace',
          type: 'invitation',
          shop_id: shopData.shopId,
          operator_email: operatorEmail,
          status: 'pending',
        };
        const invitationPayload = {
          project: 'arkivtrace',
          entityType: 'invitation',
          shopId: shopData.shopId,
          operatorEmail,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        invitationResult = await arkivService.createEntity({
          payload: invitationPayload,
          attributes: invitationAttrs,
          expiresDays: 180,
        });
      } catch (invChainErr) {
        console.warn('[ShopService] Failed to persist Arkiv invitation entity:', invChainErr.message);
      }

      // Dispatch invitation email via Clerk built-in invitation API
      if (clerkClient?.invitations?.createInvitation) {
        try {
          await clerkClient.invitations.createInvitation({
            emailAddress: operatorEmail,
            publicMetadata: {
              role: 'operator',
              shopId: shopData.shopId,
            },
            redirectUrl: process.env.FRONTEND_URL || 'https://arkivtrace.vercel.app/sign-up',
            ignoreExisting: true,
          });
        } catch (clerkInvErr) {
          console.warn(`[ShopService] Clerk createInvitation note for ${operatorEmail}:`, clerkInvErr.message);
        }
      }

      operatorAssignment = {
        status: 'invitation_created',
        email: operatorEmail,
        shopId: shopData.shopId,
        invitationEntityKey: invitationResult?.entityKey || null,
        message: `Operator account not yet found in Clerk. Pending invitation persisted on Arkiv and email invitation dispatched.`,
      };
    }

    return {
      entityKey: result.entityKey,
      txHash: result.txHash,
      expiresAt: result.expiresAt,
      shopId: shopData.shopId,
      operatorAssignment,
      attributes,
      payload,
      explorerUrl: `https://tiramisu.explorer.arkiv.network/tx/${result.txHash}`,
    };
  }

  /**
   * Retrieve a shop by its 32-byte Arkiv entityKey or its shopId
   *
   * @param {string} identifier - 32-byte hex key or unique shopId
   * @returns {Promise<Object|null>}
   */
  async getShopById(identifier) {
    if (!identifier) return null;

    // Check if identifier is an Arkiv 32-byte hex entity key
    if (/^0x[0-9a-fA-F]{64}$/.test(identifier)) {
      const entity = await arkivService.getEntityByKey(identifier);
      if (entity && entity.attributes?.type === 'shop') {
        return entity;
      }
      return null;
    }

    // Otherwise, query by shop_id attribute
    const result = await arkivService.queryEntities({
      expressions: [
        eq('project', 'arkivtrace'),
        eq('type', 'shop'),
        eq('shop_id', identifier),
      ],
      limit: 1,
    });

    return result.entities.length > 0 ? result.entities[0] : null;
  }

  /**
   * List shops from Arkiv with optional filters
   *
   * @param {Object} filters
   * @param {string} [filters.district]
   * @param {string} [filters.state]
   * @param {string} [filters.shopId]
   * @param {number} [filters.limit=20]
   * @returns {Promise<{ count: number, entities: Array<Object> }>}
   */
  async listShops({ district, state, shopId, limit = 20 } = {}) {
    const expressions = [
      eq('project', 'arkivtrace'),
      eq('type', 'shop'),
    ];

    if (district) {
      expressions.push(eq('district', district));
    }
    if (state) {
      expressions.push(eq('state', state));
    }
    if (shopId) {
      expressions.push(eq('shop_id', shopId));
    }

    const queryLimit = Math.min(100, Math.max(limit * 2, 50));
    const result = await arkivService.queryEntities({
      expressions,
      limit: queryLimit,
    });

    // Deduplicate entities by unique shopId, preserving the newest version (with operator email)
    const seen = new Map();
    for (const entity of (result.entities || [])) {
      const id = String(entity.payload?.shopId || entity.attributes?.shop_id || '').trim().toUpperCase();
      if (!id) continue;

      const existing = seen.get(id);
      if (!existing) {
        seen.set(id, entity);
      } else {
        const existingTime = new Date(existing.payload?.updatedAt || existing.payload?.createdAt || 0).getTime();
        const currentTime = new Date(entity.payload?.updatedAt || entity.payload?.createdAt || 0).getTime();
        const hasEmail = Boolean(entity.payload?.operatorEmail || entity.attributes?.operator_email);
        const existingHasEmail = Boolean(existing.payload?.operatorEmail || existing.attributes?.operator_email);

        if (currentTime > existingTime || (hasEmail && !existingHasEmail)) {
          seen.set(id, entity);
        }
      }
    }

    const deduplicated = Array.from(seen.values()).slice(0, limit);
    return {
      count: deduplicated.length,
      blockNumber: result.blockNumber,
      cursor: result.cursor,
      entities: deduplicated,
    };
  }

  /**
   * Find all shops assigned to a specific operator email on Arkiv
   *
   * @param {string} email - Operator email address
   * @returns {Promise<Array<Object>>}
   */
  async listShopsByOperatorEmail(email) {
    if (!email) return [];
    const normalized = String(email).toLowerCase().trim();
    try {
      const result = await arkivService.queryEntities({
        expressions: [
          eq('project', 'arkivtrace'),
          eq('type', 'shop'),
          eq('operator_email', normalized),
        ],
        limit: 10,
      });
      return result.entities || [];
    } catch (err) {
      console.warn(`[ShopService] listShopsByOperatorEmail error for ${normalized}:`, err.message);
      return [];
    }
  }

  /**
   * Synchronize authenticated Clerk user role and assigned shop against Arkiv on-chain records.
   * Resolves newly registered dealers, pending invitations, and keeps Clerk metadata in sync.
   *
   * @param {string} userId - Clerk user ID
   * @param {string} userEmail - Verified email address of user
   * @returns {Promise<Object>} Updated or current role details
   */
  async syncUserRole(userId, userEmail) {
    if (!userId || !userEmail) {
      return { role: 'public', shopId: null, assignedShopIds: [], isAdmin: false, isOperator: false };
    }

    const email = String(userEmail).toLowerCase().trim();

    // 1. Fetch live user details from Clerk
    let clerkUser = null;
    if (clerkClient) {
      try {
        clerkUser = await clerkClient.users.getUser(userId);
      } catch (err) {
        console.warn(`[ShopService] Failed to fetch Clerk user ${userId} during sync:`, err.message);
      }
    }

    const currentMeta = clerkUser?.publicMetadata || {};
    const currentRole = String(currentMeta.role || '').toLowerCase().trim();

    // 2. Strict protection: NEVER overwrite or downgrade an Admin
    if (currentRole === 'admin') {
      return {
        role: 'admin',
        shopId: null,
        assignedShopIds: [],
        isAdmin: true,
        isOperator: false,
        updated: false,
      };
    }

    // 3. Search Arkiv for any shop assigned to this email
    const assignedShops = await this.listShopsByOperatorEmail(email);
    let targetShopId = null;

    if (assignedShops.length > 0) {
      targetShopId = assignedShops[0].payload?.shopId || assignedShops[0].attributes?.shop_id;
    }

    // 4. Also check for any pending on-chain invitations for this email
    if (!targetShopId) {
      try {
        const invResult = await arkivService.queryEntities({
          expressions: [
            eq('project', 'arkivtrace'),
            eq('type', 'invitation'),
            eq('operator_email', email),
          ],
          limit: 1,
        });
        if (invResult.entities?.length > 0) {
          const inv = invResult.entities[0];
          targetShopId = inv.payload?.shopId || inv.attributes?.shop_id;
        }
      } catch (invErr) {
        console.warn('[ShopService] Invitation lookup error during sync:', invErr.message);
      }
    }

    // 5. If shop found and metadata not yet set to operator -> update Clerk publicMetadata
    let updated = false;
    if (targetShopId) {
      const targetUpper = String(targetShopId).trim().toUpperCase();
      const currentShopUpper = currentMeta.shopId ? String(currentMeta.shopId).trim().toUpperCase() : null;
      const needsUpdate = currentRole !== 'operator' || currentShopUpper !== targetUpper;

      if (needsUpdate && clerkClient) {
        try {
          const updatePayload = {
            publicMetadata: {
              ...currentMeta,
              role: 'operator',
              shopId: targetUpper,
              assignedShopIds: [targetUpper],
            },
          };
          if (typeof clerkClient.users.updateUserMetadata === 'function') {
            await clerkClient.users.updateUserMetadata(userId, updatePayload);
          } else {
            await clerkClient.users.updateUser(userId, updatePayload);
          }
          updated = true;
          console.log(`[ShopService] Automatically synchronized user ${email} to operator of shop ${targetUpper}`);
        } catch (updateErr) {
          console.warn(`[ShopService] Failed to update Clerk metadata during sync for ${userId}:`, updateErr.message);
        }
      }

      return {
        role: 'operator',
        shopId: targetUpper,
        assignedShopIds: [targetUpper],
        isAdmin: false,
        isOperator: true,
        updated,
      };
    }

    // 6. No shop assigned -> return existing public or current role
    return {
      role: currentRole === 'operator' ? 'operator' : 'public',
      shopId: currentMeta.shopId ? String(currentMeta.shopId) : null,
      assignedShopIds: currentMeta.shopId ? [String(currentMeta.shopId)] : [],
      isAdmin: false,
      isOperator: currentRole === 'operator',
      updated: false,
    };
  }

  /**
   * Bind or reassign an operator email to an existing shop on Arkiv (Admin only)
   *
   * @param {string} shopId
   * @param {string} operatorEmail
   * @returns {Promise<Object>}
   */
  async assignOperatorToShop(shopId, operatorEmail) {
    const email = String(operatorEmail || '').toLowerCase().trim();
    if (!email) {
      const error = new Error('A valid operator email address is required.');
      error.statusCode = 400;
      throw error;
    }

    const shop = await this.getShopById(shopId);
    if (!shop) {
      const error = new Error(`Ration shop with ID '${shopId}' was not found on Arkiv.`);
      error.statusCode = 404;
      throw error;
    }

    // Lookup Clerk user
    let targetUser = null;
    if (clerkClient) {
      try {
        const users = await clerkClient.users.getUserList({ emailAddress: [email] });
        targetUser = users?.data?.[0] || users?.[0] || null;
      } catch (err) {
        console.warn(`[ShopService] Clerk lookup error in assignOperatorToShop for ${email}:`, err.message);
      }
    }

    // Guard against admin overwrite
    if (targetUser && (targetUser.publicMetadata?.role === 'admin' || targetUser.publicMetadata?.role === 'ADMIN')) {
      const error = new Error(
        `Account with email '${email}' has administrative privileges. Cannot overwrite admin role.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Guard against duplicate assignment to a different shop
    if (targetUser && targetUser.publicMetadata?.shopId && targetUser.publicMetadata.shopId !== shopId) {
      const error = new Error(
        `Operator with email '${email}' is already assigned to shop '${targetUser.publicMetadata.shopId}'.`
      );
      error.statusCode = 409;
      throw error;
    }

    const existingShopsWithEmail = await this.listShopsByOperatorEmail(email);
    const conflict = existingShopsWithEmail.find(
      (s) => (s.payload?.shopId || s.attributes?.shop_id) !== shopId
    );
    if (conflict) {
      const conflictId = conflict.payload?.shopId || conflict.attributes?.shop_id;
      const error = new Error(
        `Operator with email '${email}' is already assigned to shop '${conflictId}' on Arkiv.`
      );
      error.statusCode = 409;
      throw error;
    }

    // Update Arkiv on-chain entity with new operator email
    const updatedPayload = {
      ...(shop.payload || {}),
      operatorEmail: email,
      updatedAt: new Date().toISOString(),
    };
    const updatedAttributes = {
      ...(shop.attributes || {}),
      operator_email: email,
    };

    const arkivRes = await arkivService.createEntity({
      payload: updatedPayload,
      attributes: updatedAttributes,
      expiresDays: 180,
    });

    // Update Clerk metadata if user exists
    let assignmentStatus = 'pending_invite';
    if (targetUser && clerkClient) {
      try {
        const updatePayload = {
          publicMetadata: {
            ...(targetUser.publicMetadata || {}),
            role: 'operator',
            shopId: shopId,
            assignedShopIds: [shopId],
          },
        };
        if (typeof clerkClient.users.updateUserMetadata === 'function') {
          await clerkClient.users.updateUserMetadata(targetUser.id, updatePayload);
        } else {
          await clerkClient.users.updateUser(targetUser.id, updatePayload);
        }
        assignmentStatus = 'assigned';
      } catch (metaErr) {
        console.warn(`[ShopService] Failed to update Clerk metadata in assignOperatorToShop:`, metaErr.message);
      }
    }

    return {
      success: true,
      shopId,
      operatorEmail: email,
      status: assignmentStatus,
      entityKey: arkivRes.entityKey,
      txHash: arkivRes.txHash,
    };
  }
}

export const shopService = new ShopService();
