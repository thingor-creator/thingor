import type { UserProfile, Item, ItemShare } from '../types';

/**
 * Centralized Permission Layer for Thingor Platform
 */

/** Check if a profile has admin privileges */
export function isAdmin(user?: UserProfile | null): boolean {
  if (!user) return false;
  return user.role === 'admin' || Boolean(user.is_admin);
}

/** Check if user is a normal active user */
export function isUser(user?: UserProfile | null): boolean {
  if (!user) return false;
  return user.status === 'active';
}

/** Check if user account is suspended */
export function isSuspended(user?: UserProfile | null): boolean {
  if (!user) return false;
  return user.status === 'suspended';
}

/** Permission check for platform administration (system settings, user status, registration toggle) */
export function canManagePlatform(user?: UserProfile | null): boolean {
  return isAdmin(user);
}

/** Permission check for managing an item (owner isolated) */
export function canManageItem(user: UserProfile | null, item: Item): boolean {
  if (!user || !user.id || isSuspended(user)) return false;
  if (!item.user_id) return true; // Local item fallback
  return item.user_id === user.id;
}

/** Permission check for creating a share link on an item */
export function canShareItem(user: UserProfile | null, item: Item): boolean {
  return canManageItem(user, item);
}

/** Check if a share token is active and valid (not expired, not revoked) */
export function isShareValid(share?: ItemShare | null): boolean {
  if (!share) return false;
  if (share.revoked_at) return false;
  if (share.expires_at) {
    const expiry = new Date(share.expires_at).getTime();
    if (Date.now() > expiry) return false;
  }
  return true;
}
