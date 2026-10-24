import React, { useEffect, useState, useCallback } from 'react';
import type { PublicProfile, MarketplaceListing } from '../../types/marketplace';
import type { UserFollowStats } from '../../types/community';
import { fetchPublicProfile, fetchListings, blockUser } from '../../lib/marketplace';
import {
  followUser,
  unfollowUser,
  getFollowStats,
  fetchFollowers,
  fetchFollowing,
} from '../../lib/community';
import { ListingCard } from './ListingCard';
import { useApp } from '../../context/AppContext';
import {
  X,
  ShieldCheck,
  User as UserIcon,
  Calendar,
  HandCoins,
  ShieldAlert,
  Ban,
  Loader2,
  AlertTriangle,
  PackageOpen,
  UserPlus,
  UserCheck,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface PublicProfileModalProps {
  sellerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectListing: (listing: MarketplaceListing) => void;
  onOpenReport?: (userId: string, name: string) => void;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
  sellerId: initialSellerId,
  isOpen,
  onClose,
  onSelectListing,
  onOpenReport,
}) => {
  const { user, isAuthenticated, language } = useApp();
  const isHu = language === 'hu';

  const [currentSellerId, setCurrentSellerId] = useState<string | null>(initialSellerId);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [followStats, setFollowStats] = useState<UserFollowStats>({
    followers_count: 0,
    following_count: 0,
    is_following: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  // Tab state: 'listings' | 'followers' | 'following'
  const [activeTab, setActiveTab] = useState<'listings' | 'followers' | 'following'>('listings');

  // Follower/Following list pagination state
  const [listProfiles, setListProfiles] = useState<PublicProfile[]>([]);
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const pageSize = 12;

  // Sync initial sellerId on modal open
  useEffect(() => {
    setCurrentSellerId(initialSellerId);
    setActiveTab('listings');
  }, [initialSellerId, isOpen]);

  // Load profile, listings, and follow stats
  useEffect(() => {
    if (!isOpen || !currentSellerId) {
      setProfile(null);
      setListings([]);
      setFollowStats({ followers_count: 0, following_count: 0, is_following: false });
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchPublicProfile(currentSellerId),
      fetchListings({ seller_id: currentSellerId, status: 'active', limit: 20 }),
      getFollowStats(currentSellerId),
    ])
      .then(([profileRes, listingsRes, statsRes]) => {
        if (!isMounted) return;
        if (profileRes.success && profileRes.data) {
          setProfile(profileRes.data);
        } else {
          setError(profileRes.error || (isHu ? 'Nem található a profil.' : 'Profile not found.'));
        }

        if (listingsRes.success && listingsRes.data) {
          setListings(listingsRes.data);
        }

        if (statsRes.success && statsRes.data) {
          setFollowStats(statsRes.data);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.message || (isHu ? 'Hiba történt a profil betöltésekor' : 'Error loading profile'));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentSellerId, isHu]);

  // Fetch paginated followers / following lists when tab changes
  const loadTabList = useCallback(
    async (tab: 'followers' | 'following', page: number) => {
      if (!currentSellerId) return;
      setListLoading(true);
      setListError(null);

      try {
        const res =
          tab === 'followers'
            ? await fetchFollowers(currentSellerId, page, pageSize)
            : await fetchFollowing(currentSellerId, page, pageSize);

        if (res.success && res.data) {
          setListProfiles(res.data.profiles);
          setListTotal(res.data.totalCount);
        } else {
          setListError(res.error || (isHu ? 'Nem sikerült betölteni a listát.' : 'Failed to load list.'));
        }
      } catch (err: any) {
        setListError(err?.message || (isHu ? 'Hiba történt a lista betöltésekor.' : 'Error loading list.'));
      } finally {
        setListLoading(false);
      }
    },
    [currentSellerId, isHu]
  );

  useEffect(() => {
    if (activeTab === 'followers' || activeTab === 'following') {
      setListPage(1);
      loadTabList(activeTab, 1);
    }
  }, [activeTab, loadTabList]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    setListPage(newPage);
    if (activeTab === 'followers' || activeTab === 'following') {
      loadTabList(activeTab, newPage);
    }
  };

  if (!isOpen) return null;

  const isSelf = user?.id === currentSellerId;

  // Toggle follow action
  const handleToggleFollow = async () => {
    if (!currentSellerId) return;

    if (!isAuthenticated) {
      alert(isHu ? 'A követéshez bejelentkezés szükséges.' : 'Sign in required to follow this member.');
      return;
    }

    if (isSelf) return;

    setFollowLoading(true);

    try {
      if (followStats.is_following) {
        const res = await unfollowUser(currentSellerId);
        if (res.success) {
          setFollowStats((prev) => ({
            ...prev,
            is_following: false,
            followers_count: Math.max(0, prev.followers_count - 1),
          }));
        } else {
          alert(res.error || (isHu ? 'Nem sikerült megszüntetni a követést.' : 'Failed to unfollow user.'));
        }
      } else {
        const res = await followUser(currentSellerId);
        if (res.success) {
          setFollowStats((prev) => ({
            ...prev,
            is_following: true,
            followers_count: prev.followers_count + 1,
          }));
        } else {
          alert(res.error || (isHu ? 'Nem sikerült követni a felhasználót.' : 'Failed to follow user.'));
        }
      }
    } catch (err: any) {
      alert(err?.message || (isHu ? 'Hiba történt a követési művelet során.' : 'Error during follow operation.'));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!currentSellerId || !isAuthenticated) return;
    const confirmed = window.confirm(
      isHu ? 'Biztosan le szeretnéd tiltani ezt a felhasználót?' : 'Are you sure you want to block this user?'
    );
    if (!confirmed) return;

    const res = await blockUser(currentSellerId);
    if (res.success) {
      alert(isHu ? 'Felhasználó sikeresen tiltva.' : 'User blocked.');
      onClose();
    } else {
      alert(res.error || (isHu ? 'Nem sikerült letiltani a felhasználót.' : 'Failed to block user.'));
    }
  };

  const totalPages = Math.ceil(listTotal / pageSize);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-[16px] bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden text-[var(--text-main,#E0E3E6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)]/60">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-sub,#B5BDC6)]">
            {isHu ? 'Közösségi és eladói profil' : 'Community & Seller Profile'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="text-xs text-[var(--text-sub,#B5BDC6)]">
                {isHu ? 'Profil betöltése...' : 'Loading profile...'}
              </span>
            </div>
          ) : error || !profile ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
              <AlertTriangle className="w-10 h-10 text-rose-400" />
              <h3 className="text-base font-bold text-white">{isHu ? 'Profil nem elérhető' : 'Profile unavailable'}</h3>
              <p className="text-xs text-[var(--text-sub,#B5BDC6)]">{error}</p>
            </div>
          ) : (
            <>
              {/* Profile Header Box */}
              <div className="p-4 sm:p-5 rounded-[14px] bg-[var(--surface-bg,#465362)]/40 border border-[var(--border-color,#56616D)] flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-[var(--card-bg,#3A4551)] border-2 border-[var(--border-color,#56616D)] flex items-center justify-center text-[var(--color-primary-blue,#2563EB)] font-bold text-2xl overflow-hidden shrink-0 shadow-inner">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile.display_name?.charAt(0).toUpperCase() || <UserIcon className="w-10 h-10" />
                  )}
                </div>

                {/* Info & Stats */}
                <div className="flex-1 flex flex-col items-center sm:items-start gap-2 text-center sm:text-left min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h2 className="text-lg font-bold text-white truncate max-w-xs">{profile.display_name}</h2>
                    {profile.is_verified && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {isHu ? 'Ellenőrzött' : 'Verified'}
                      </span>
                    )}
                  </div>

                  {profile.bio && (
                    <p className="text-xs text-[var(--text-sub,#B5BDC6)] max-w-lg leading-relaxed line-clamp-3">
                      {profile.bio}
                    </p>
                  )}

                  {/* Badges / Stats row */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs pt-1">
                    {/* Followers count badge (clickable to switch tab) */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('followers')}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-[6px] transition-colors ${
                        activeTab === 'followers'
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                          : 'bg-[var(--surface-bg,#465362)]/60 text-[var(--text-sub,#B5BDC6)] hover:text-white'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <strong className="text-white">{followStats.followers_count}</strong>
                      <span>{isHu ? 'követő' : 'followers'}</span>
                    </button>

                    {/* Following count badge (clickable to switch tab) */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('following')}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-[6px] transition-colors ${
                        activeTab === 'following'
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                          : 'bg-[var(--surface-bg,#465362)]/60 text-[var(--text-sub,#B5BDC6)] hover:text-white'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <strong className="text-white">{followStats.following_count}</strong>
                      <span>{isHu ? 'követett' : 'following'}</span>
                    </button>

                    {/* Trust score */}
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      ★ {profile.trust_score ?? 100}
                      <span className="text-[var(--text-sub,#B5BDC6)] font-normal text-[11px] ml-1">
                        ({isHu ? 'bizalom' : 'trust'})
                      </span>
                    </span>

                    {/* Successful deals */}
                    <span className="flex items-center gap-1 text-[var(--text-sub,#B5BDC6)]">
                      <HandCoins className="w-3.5 h-3.5 text-blue-400" />
                      <strong className="text-white">{profile.successful_deals ?? 0}</strong>
                      <span>{isHu ? 'ügylet' : 'deals'}</span>
                    </span>

                    {/* Member since */}
                    <span className="flex items-center gap-1 text-[var(--text-sub,#B5BDC6)]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(profile.created_at).toLocaleDateString(isHu ? 'hu-HU' : 'en-US')}</span>
                    </span>
                  </div>
                </div>

                {/* Header Action Buttons: Follow, Report, Block */}
                <div className="flex items-center gap-2 sm:self-start w-full sm:w-auto justify-center sm:justify-end">
                  {/* Follow / Unfollow Button (hidden on self profile) */}
                  {!isSelf && (
                    <button
                      type="button"
                      onClick={handleToggleFollow}
                      disabled={followLoading}
                      className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[8px] text-xs font-semibold transition-all shadow-sm ${
                        followStats.is_following
                          ? 'bg-emerald-600/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40 group'
                          : 'bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white'
                      } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {followLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : followStats.is_following ? (
                        <>
                          <UserCheck className="w-4 h-4 group-hover:hidden" />
                          <span className="group-hover:hidden">{isHu ? 'Követed' : 'Following'}</span>
                          <span className="hidden group-hover:inline">{isHu ? 'Követés törlése' : 'Unfollow'}</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>{isHu ? 'Követés' : 'Follow'}</span>
                        </>
                      )}
                    </button>
                  )}

                  {!isSelf && isAuthenticated && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenReport?.(profile.id || currentSellerId!, profile.display_name)}
                        className="p-2 rounded-[8px] bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-rose-400 hover:bg-rose-500/10 border border-[var(--border-color,#56616D)] transition-colors"
                        title={isHu ? 'Felhasználó jelentése' : 'Report user'}
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleBlock}
                        className="p-2 rounded-[8px] bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-rose-400 hover:bg-rose-500/10 border border-[var(--border-color,#56616D)] transition-colors"
                        title={isHu ? 'Felhasználó tiltása' : 'Block user'}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Navigation Tabs: Listings / Followers / Following */}
              <div className="flex items-center gap-2 border-b border-[var(--border-color,#56616D)] pb-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('listings')}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all whitespace-nowrap ${
                    activeTab === 'listings'
                      ? 'bg-[var(--surface-bg,#465362)] text-white shadow-sm border border-[var(--border-color,#56616D)]'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:text-white'
                  }`}
                >
                  <PackageOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>{isHu ? 'Aktív hirdetések' : 'Active listings'}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-[var(--text-sub,#B5BDC6)]">
                    {listings.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('followers')}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all whitespace-nowrap ${
                    activeTab === 'followers'
                      ? 'bg-[var(--surface-bg,#465362)] text-white shadow-sm border border-[var(--border-color,#56616D)]'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>{isHu ? 'Követők' : 'Followers'}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-[var(--text-sub,#B5BDC6)]">
                    {followStats.followers_count}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('following')}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all whitespace-nowrap ${
                    activeTab === 'following'
                      ? 'bg-[var(--surface-bg,#465362)] text-white shadow-sm border border-[var(--border-color,#56616D)]'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isHu ? 'Követett tagok' : 'Following'}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-[var(--text-sub,#B5BDC6)]">
                    {followStats.following_count}
                  </span>
                </button>
              </div>

              {/* Tab 1: Listings View */}
              {activeTab === 'listings' && (
                <div className="flex flex-col gap-3">
                  {listings.length === 0 ? (
                    <div className="py-12 p-4 rounded-[12px] bg-[var(--surface-bg,#465362)]/20 border border-[var(--border-color,#56616D)]/50 text-center text-xs text-[var(--text-sub,#B5BDC6)]">
                      {isHu
                        ? 'A tagnak jelenleg nincs más nyilvános hirdetése.'
                        : 'This member currently has no other active listings.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {listings.map((item) => (
                        <ListingCard
                          key={item.id}
                          listing={item}
                          onSelect={(sel) => {
                            onClose();
                            onSelectListing(sel);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2 & 3: Followers & Following Lists View */}
              {(activeTab === 'followers' || activeTab === 'following') && (
                <div className="flex flex-col gap-4">
                  {listLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                      <span className="text-xs text-[var(--text-sub,#B5BDC6)]">
                        {isHu ? 'Lista betöltése...' : 'Loading list...'}
                      </span>
                    </div>
                  ) : listError ? (
                    <div className="py-10 p-4 rounded-[12px] bg-rose-500/10 border border-rose-500/30 text-center text-xs text-rose-300">
                      {listError}
                    </div>
                  ) : listProfiles.length === 0 ? (
                    <div className="py-12 p-4 rounded-[12px] bg-[var(--surface-bg,#465362)]/20 border border-[var(--border-color,#56616D)]/50 text-center text-xs text-[var(--text-sub,#B5BDC6)]">
                      {activeTab === 'followers'
                        ? isHu
                          ? 'Még nincsenek követői.'
                          : 'No followers yet.'
                        : isHu
                        ? 'Még nem követ senkit.'
                        : 'Not following anyone yet.'}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {listProfiles.map((p) => (
                          <div
                            key={p.user_id}
                            className="p-3 rounded-[10px] bg-[var(--surface-bg,#465362)]/40 border border-[var(--border-color,#56616D)] flex items-center justify-between gap-3 hover:border-blue-500/40 transition-colors"
                          >
                            <div
                              className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                              onClick={() => {
                                setCurrentSellerId(p.user_id);
                                setActiveTab('listings');
                              }}
                            >
                              <div className="w-9 h-9 rounded-full bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] flex items-center justify-center font-bold text-xs text-blue-400 overflow-hidden shrink-0">
                                {p.avatar_url ? (
                                  <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  p.display_name?.charAt(0).toUpperCase() || <UserIcon className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-bold text-white truncate max-w-[140px]">
                                    {p.display_name}
                                  </span>
                                  {p.is_verified && (
                                    <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                                  )}
                                </div>
                                <span className="text-[10px] text-amber-400 font-medium">
                                  ★ {p.trust_score ?? 100}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setCurrentSellerId(p.user_id);
                                setActiveTab('listings');
                              }}
                              className="px-2.5 py-1 text-[11px] rounded-[6px] bg-[var(--surface-bg,#465362)] hover:bg-blue-600 hover:text-white text-[var(--text-sub,#B5BDC6)] border border-[var(--border-color,#56616D)] transition-colors shrink-0"
                            >
                              {isHu ? 'Profil' : 'Profile'}
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2 text-xs text-[var(--text-sub,#B5BDC6)]">
                          <span>
                            {isHu ? 'Oldal: ' : 'Page: '}
                            <strong className="text-white">{listPage}</strong> / {totalPages} (
                            {listTotal} {isHu ? 'tag' : 'members'})
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={listPage <= 1}
                              onClick={() => handlePageChange(listPage - 1)}
                              className="p-1 rounded-[6px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] disabled:opacity-30 disabled:cursor-not-allowed hover:text-white"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={listPage >= totalPages}
                              onClick={() => handlePageChange(listPage + 1)}
                              className="p-1 rounded-[6px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] disabled:opacity-30 disabled:cursor-not-allowed hover:text-white"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
