import type { PublicProfile } from './marketplace';

export interface UserFollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

export interface UserFollowRecord {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface PaginatedFollowListResult {
  profiles: PublicProfile[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
