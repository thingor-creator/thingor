import React, { useEffect, useState } from 'react';
import type { PublicProfile, MarketplaceListing } from '../../types/marketplace';
import { fetchPublicProfile, fetchListings, blockUser } from '../../lib/marketplace';
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
  PackageOpen
} from 'lucide-react';

interface PublicProfileModalProps {
  sellerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectListing: (listing: MarketplaceListing) => void;
  onOpenReport?: (userId: string, name: string) => void;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
  sellerId,
  isOpen,
  onClose,
  onSelectListing,
  onOpenReport,
}) => {
  const { user, isAuthenticated, language } = useApp();
  const isHu = language === 'hu';

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !sellerId) {
      setProfile(null);
      setListings([]);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchPublicProfile(sellerId),
      fetchListings({ seller_id: sellerId, status: 'active', limit: 20 }),
    ])
      .then(([profileRes, listingsRes]) => {
        if (!isMounted) return;
        if (profileRes.success && profileRes.data) {
          setProfile(profileRes.data);
        } else {
          setError(profileRes.error || (isHu ? 'Nem található a profil.' : 'Profile not found.'));
        }

        if (listingsRes.success && listingsRes.data) {
          setListings(listingsRes.data);
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
  }, [isOpen, sellerId, isHu]);

  if (!isOpen) return null;

  const isSelf = user?.id === sellerId;

  const handleBlock = async () => {
    if (!sellerId || !isAuthenticated) return;
    const confirmed = window.confirm(
      isHu ? 'Biztosan le szeretnéd tiltani ezt a felhasználót?' : 'Are you sure you want to block this user?'
    );
    if (!confirmed) return;

    const res = await blockUser(sellerId);
    if (res.success) {
      alert(isHu ? 'Felhasználó sikeresen tiltva.' : 'User blocked.');
      onClose();
    } else {
      alert(res.error || (isHu ? 'Nem sikerült letiltani a felhasználót.' : 'Failed to block user.'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-[16px] bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden text-[var(--text-main,#E0E3E6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)]/60">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-sub,#B5BDC6)]">
            {isHu ? 'Publikus eladói profil' : 'Public Seller Profile'}
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
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="text-xs text-[var(--text-sub,#B5BDC6)]">{isHu ? 'Profil betöltése...' : 'Loading profile...'}</span>
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
              <div className="p-5 rounded-[14px] bg-[var(--surface-bg,#465362)]/40 border border-[var(--border-color,#56616D)] flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-[var(--card-bg,#3A4551)] border-2 border-[var(--border-color,#56616D)] flex items-center justify-center text-[var(--color-primary-blue,#2563EB)] font-bold text-2xl overflow-hidden shrink-0 shadow-inner">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile.display_name?.charAt(0).toUpperCase() || <UserIcon className="w-10 h-10" />
                  )}
                </div>

                {/* Info & Stats */}
                <div className="flex-1 flex flex-col items-center sm:items-start gap-2 text-center sm:text-left">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{profile.display_name}</h2>
                    {profile.is_verified && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {isHu ? 'Ellenőrzött' : 'Verified'}
                      </span>
                    )}
                  </div>

                  {profile.bio && (
                    <p className="text-xs text-[var(--text-sub,#B5BDC6)] max-w-lg leading-relaxed">
                      {profile.bio}
                    </p>
                  )}

                  {/* Badges / Stats row */}
                  <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      ★ {profile.trust_score ?? 100}
                      <span className="text-[var(--text-sub,#B5BDC6)] font-normal text-[11px] ml-1">
                        ({isHu ? 'bizalmi pontszám' : 'trust score'})
                      </span>
                    </span>

                    <span className="flex items-center gap-1 text-[var(--text-sub,#B5BDC6)]">
                      <HandCoins className="w-3.5 h-3.5 text-blue-400" />
                      <strong className="text-white">{profile.successful_deals ?? 0}</strong>
                      <span>{isHu ? 'lezárt ügylet' : 'successful deals'}</span>
                    </span>

                    <span className="flex items-center gap-1 text-[var(--text-sub,#B5BDC6)]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {isHu ? 'Csatlakozott: ' : 'Member since: '}
                        {new Date(profile.created_at).toLocaleDateString(isHu ? 'hu-HU' : 'en-US')}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Actions (Report / Block) */}
                {!isSelf && isAuthenticated && (
                  <div className="flex items-center gap-2 sm:self-start">
                    <button
                      type="button"
                      onClick={() => onOpenReport?.(profile.id, profile.display_name)}
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
                  </div>
                )}
              </div>

              {/* Seller's Active Listings */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <PackageOpen className="w-4 h-4 text-blue-400" />
                    <span>{isHu ? 'Aktív hirdetések tőle' : 'Active listings from this member'}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)]">
                      {listings.length}
                    </span>
                  </h3>
                </div>

                {listings.length === 0 ? (
                  <div className="py-12 p-4 rounded-[12px] bg-[var(--surface-bg,#465362)]/20 border border-[var(--border-color,#56616D)]/50 text-center text-xs text-[var(--text-sub,#B5BDC6)]">
                    {isHu ? 'A tagnak jelenleg nincs más nyilvános hirdetése.' : 'This member currently has no other active listings.'}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
