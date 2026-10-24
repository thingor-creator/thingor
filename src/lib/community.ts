import { supabase, isSupabaseConfigured } from './supabase';
import type { PublicProfile } from '../types/marketplace';
import type { UserFollowStats, PaginatedFollowListResult } from '../types/community';

export interface CommunityApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Retrieves the currently authenticated user's ID from Supabase auth session.
 * Does not trust any client-supplied user ID parameter for permission checks.
 */
async function getCurrentUserId(): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured) return null;
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Follow a user.
 * Self-follow is blocked client-side and strictly enforced by a database CHECK constraint.
 */
export async function followUser(
  targetUserId: string
): Promise<CommunityApiResponse<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return { success: false, error: 'Hitelesítés szükséges a követéshez.' };
    }

    if (currentUserId === targetUserId) {
      return { success: false, error: 'Saját magadat nem követheted.' };
    }

    const { error } = await supabase.from('user_follows').insert({
      follower_id: currentUserId,
      following_id: targetUserId,
    });

    if (error) {
      // Handle unique constraint / already following gracefully
      if (error.code === '23505') {
        return { success: true, data: true };
      }
      throw new Error(error.message);
    }

    return { success: true, data: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Nem sikerült követni a felhasználót.',
    };
  }
}

/**
 * Unfollow a user.
 * RLS enforces that only the follower can delete their own follow row.
 */
export async function unfollowUser(
  targetUserId: string
): Promise<CommunityApiResponse<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return { success: false, error: 'Hitelesítés szükséges a művelethez.' };
    }

    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId);

    if (error) throw new Error(error.message);
    return { success: true, data: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Nem sikerült megszüntetni a követést.',
    };
  }
}

/**
 * Fetch follow statistics (followers count, following count, is_following) for a user.
 * Uses server-side PostgreSQL function when available, with client-side count fallback.
 */
export async function getFollowStats(
  targetUserId: string
): Promise<CommunityApiResponse<UserFollowStats>> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      success: true,
      data: { followers_count: 0, following_count: 0, is_following: false },
    };
  }

  try {
    // 1. Try server-side RPC for exact, atomic counts
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_user_follow_stats',
      { target_user_id: targetUserId }
    );

    if (!rpcError && rpcData) {
      return {
        success: true,
        data: {
          followers_count: Number(rpcData.followers_count || 0),
          following_count: Number(rpcData.following_count || 0),
          is_following: Boolean(rpcData.is_following),
        },
      };
    }

    // 2. Fallback to direct queries if RPC is not yet created
    const currentUserId = await getCurrentUserId();

    const [followersRes, followingRes, isFollowingRes] = await Promise.all([
      supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId),
      supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId),
      currentUserId && currentUserId !== targetUserId
        ? supabase
            .from('user_follows')
            .select('created_at')
            .eq('follower_id', currentUserId)
            .eq('following_id', targetUserId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    return {
      success: true,
      data: {
        followers_count: followersRes.count ?? 0,
        following_count: followingRes.count ?? 0,
        is_following: Boolean(isFollowingRes?.data),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Nem sikerült lekérdezni a követési adatokat.',
      data: { followers_count: 0, following_count: 0, is_following: false },
    };
  }
}

/**
 * Fetch paginated list of followers for a given profile.
 */
export async function fetchFollowers(
  targetUserId: string,
  page = 1,
  pageSize = 20
): Promise<CommunityApiResponse<PaginatedFollowListResult>> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      success: true,
      data: { profiles: [], totalCount: 0, page, pageSize, hasMore: false },
    };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    // 1. Fetch relationships with count
    const { data: rows, count, error } = await supabase
      .from('user_follows')
      .select('follower_id, created_at', { count: 'exact' })
      .eq('following_id', targetUserId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) {
      return {
        success: true,
        data: {
          profiles: [],
          totalCount: count ?? 0,
          page,
          pageSize,
          hasMore: false,
        },
      };
    }

    // 2. Fetch corresponding public profiles
    const followerIds = rows.map((r: any) => r.follower_id);
    const { data: profileRows, error: profileError } = await supabase
      .from('public_profiles')
      .select('user_id, display_name, avatar_url, bio, trust_score, successful_deals, is_verified, created_at')
      .in('user_id', followerIds);

    if (profileError) throw new Error(profileError.message);

    const profileMap = new Map<string, PublicProfile>();
    (profileRows || []).forEach((p: any) => {
      profileMap.set(p.user_id, { ...p, id: p.user_id });
    });

    const orderedProfiles: PublicProfile[] = followerIds
      .map((id: string) => profileMap.get(id))
      .filter((p: PublicProfile | undefined): p is PublicProfile => Boolean(p));

    const totalCount = count ?? orderedProfiles.length;
    const hasMore = from + orderedProfiles.length < totalCount;

    return {
      success: true,
      data: {
        profiles: orderedProfiles,
        totalCount,
        page,
        pageSize,
        hasMore,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Nem sikerült betölteni a követők listáját.',
    };
  }
}

/**
 * Fetch paginated list of users that a given profile is following.
 */
export async function fetchFollowing(
  targetUserId: string,
  page = 1,
  pageSize = 20
): Promise<CommunityApiResponse<PaginatedFollowListResult>> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      success: true,
      data: { profiles: [], totalCount: 0, page, pageSize, hasMore: false },
    };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const { data: rows, count, error } = await supabase
      .from('user_follows')
      .select('following_id, created_at', { count: 'exact' })
      .eq('follower_id', targetUserId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) {
      return {
        success: true,
        data: {
          profiles: [],
          totalCount: count ?? 0,
          page,
          pageSize,
          hasMore: false,
        },
      };
    }

    const followingIds = rows.map((r: any) => r.following_id);
    const { data: profileRows, error: profileError } = await supabase
      .from('public_profiles')
      .select('user_id, display_name, avatar_url, bio, trust_score, successful_deals, is_verified, created_at')
      .in('user_id', followingIds);

    if (profileError) throw new Error(profileError.message);

    const profileMap = new Map<string, PublicProfile>();
    (profileRows || []).forEach((p: any) => {
      profileMap.set(p.user_id, { ...p, id: p.user_id });
    });

    const orderedProfiles: PublicProfile[] = followingIds
      .map((id: string) => profileMap.get(id))
      .filter((p: PublicProfile | undefined): p is PublicProfile => Boolean(p));

    const totalCount = count ?? orderedProfiles.length;
    const hasMore = from + orderedProfiles.length < totalCount;

    return {
      success: true,
      data: {
        profiles: orderedProfiles,
        totalCount,
        page,
        pageSize,
        hasMore,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Nem sikerült betölteni a követett felhasználók listáját.',
    };
  }
}
