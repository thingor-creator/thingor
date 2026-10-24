import React, { useEffect, useState } from 'react';
import type { MarketplaceListing } from '../../types/marketplace';
import { fetchListingById, toggleSavedListing, updateListingStatus, deleteListing, blockUser } from '../../lib/marketplace';
import { useApp } from '../../context/AppContext';
import {
  X,
  MapPin,
  Tag,
  ShieldCheck,
  User as UserIcon,
  MessageSquare,
  HandCoins,
  Heart,
  Share2,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileCheck,
  ShieldAlert,
  Edit3,
  Archive,
  Trash2,
  Ban,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Sparkles,
  Repeat
} from 'lucide-react';

interface ListingDetailModalProps {
  listingId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenChat?: (sellerId: string, listingId: string) => void;
  onOpenOffer?: (listing: MarketplaceListing) => void;
  onOpenSellerProfile?: (sellerId: string) => void;
  onOpenReport?: (listingId: string, title: string) => void;
  onEditListing?: (listing: MarketplaceListing) => void;
  onListingUpdated?: () => void;
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  listingId,
  isOpen,
  onClose,
  onOpenChat,
  onOpenOffer,
  onOpenSellerProfile,
  onOpenReport,
  onEditListing,
  onListingUpdated,
}) => {
  const { user, isAuthenticated, setIsAuthModalOpen, openImageViewer, language } = useApp();
  const isHu = language === 'hu';

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !listingId) {
      setListing(null);
      setActiveImageIndex(0);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchListingById(listingId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setListing(res.data);
          setIsSaved(Boolean(res.data.is_saved));
        } else {
          setError(res.error || (isHu ? 'A hirdetés nem található vagy nincs jogosultsága megtekinteni.' : 'Listing not found or access denied.'));
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.message || (isHu ? 'Hiba történt a hirdetés betöltésekor' : 'Error loading listing'));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, listingId, isHu]);

  if (!isOpen) return null;

  const isOwner = Boolean(user && listing && user.id === listing.seller_id);
  const images = listing?.images || [];
  const currentImageUrl = images[activeImageIndex]?.image_url || '';

  const handleToggleBookmark = async () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!listing) return;

    const nextState = !isSaved;
    setIsSaved(nextState);

    const res = await toggleSavedListing(listing.id, isSaved);
    if (!res.success) {
      setIsSaved(!nextState); // Rollback
    }
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#marketplace/listing/${listing?.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  const handleStatusChange = async (newStatus: 'active' | 'reserved' | 'archived') => {
    if (!listing) return;
    setActionLoading(true);
    const res = await updateListingStatus(listing.id, newStatus);
    setActionLoading(false);
    if (res.success && res.data) {
      setListing({ ...listing, status: newStatus });
      onListingUpdated?.();
    } else {
      alert(res.error || (isHu ? 'Nem sikerült módosítani a státuszt' : 'Failed to update status'));
    }
  };

  const handleDeleteListing = async () => {
    if (!listing) return;
    const confirmed = window.confirm(
      isHu ? 'Biztosan törölni szeretnéd ezt a hirdetést? Ez a művelet nem vonható vissza.' : 'Are you sure you want to delete this listing? This action cannot be undone.'
    );
    if (!confirmed) return;

    setActionLoading(true);
    const res = await deleteListing(listing.id);
    setActionLoading(false);
    if (res.success) {
      onListingUpdated?.();
      onClose();
    } else {
      alert(res.error || (isHu ? 'Hiba történt a törléskor' : 'Failed to delete listing'));
    }
  };

  const handleBlockSeller = async () => {
    if (!listing || !isAuthenticated) return;
    const confirmed = window.confirm(
      isHu ? 'Biztosan le szeretnéd tiltani ezt a felhasználót? Nem látod többé a hirdetéseit és üzeneteit.' : 'Are you sure you want to block this user?'
    );
    if (!confirmed) return;

    setActionLoading(true);
    const res = await blockUser(listing.seller_id, 'Listing view block');
    setActionLoading(false);
    if (res.success) {
      alert(isHu ? 'Felhasználó letiltva.' : 'User blocked.');
      onListingUpdated?.();
      onClose();
    } else {
      alert(res.error || (isHu ? 'Nem sikerült letiltani a felhasználót' : 'Failed to block user'));
    }
  };

  const formatPrice = () => {
    if (!listing) return null;
    if (listing.listing_type === 'free') {
      return (
        <span className="text-xl font-bold text-emerald-400 flex items-center gap-1.5">
          <Sparkles className="w-5 h-5" />
          {isHu ? 'Ingyenesen elvihető' : 'Free to take'}
        </span>
      );
    }
    if (listing.listing_type === 'barter') {
      return (
        <span className="text-lg font-bold text-purple-400 flex items-center gap-1.5">
          <Repeat className="w-5 h-5" />
          {isHu ? 'Tárgycsere' : 'Item Barter'}
        </span>
      );
    }
    if (listing.price !== null && listing.price !== undefined) {
      const formatted = new Intl.NumberFormat(isHu ? 'hu-HU' : 'en-US').format(listing.price);
      const currency = listing.currency || 'HUF';
      const period = listing.rental_period_unit === 'month' ? (isHu ? '/hó' : '/mo') : (isHu ? '/nap' : '/day');
      return (
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-white tracking-tight">
            {formatted} {currency}
          </span>
          {listing.listing_type === 'rent' && (
            <span className="text-sm text-[var(--text-sub,#B5BDC6)] font-medium">{period}</span>
          )}
        </div>
      );
    }
    return <span className="text-lg font-semibold text-[var(--text-sub,#B5BDC6)]">{isHu ? 'Egyedi megbeszélés szerint' : 'Negotiable'}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-[16px] bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden text-[var(--text-main,#E0E3E6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)]/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)] flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {listing?.category_id || (isHu ? 'Piactér' : 'Marketplace')}
            </span>
            {listing?.status && listing.status !== 'active' && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/80 text-black uppercase tracking-wider">
                {listing.status === 'reserved' ? (isHu ? 'Foglalt' : 'Reserved') : listing.status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="p-2 rounded-full text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] transition-colors relative"
              title={isHu ? 'Megosztási hivatkozás másolása' : 'Copy link'}
            >
              {shareCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {!isOwner && (
              <button
                type="button"
                onClick={handleToggleBookmark}
                className={`p-2 rounded-full transition-colors ${
                  isSaved ? 'text-rose-400 bg-rose-500/10' : 'text-[var(--text-sub,#B5BDC6)] hover:text-rose-400 hover:bg-[var(--surface-bg,#465362)]'
                }`}
                title={isSaved ? (isHu ? 'Mentés törlése' : 'Remove saved') : (isHu ? 'Mentés' : 'Save')}
              >
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="text-xs text-[var(--text-sub,#B5BDC6)]">{isHu ? 'Hirdetés betöltése...' : 'Loading listing...'}</span>
            </div>
          ) : error || !listing ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
              <AlertTriangle className="w-10 h-10 text-rose-400" />
              <h3 className="text-base font-bold text-white">{isHu ? 'Nem sikerült betölteni' : 'Failed to load'}</h3>
              <p className="text-xs text-[var(--text-sub,#B5BDC6)] max-w-sm">{error}</p>
            </div>
          ) : (
            <>
              {/* Media Gallery Section */}
              <div className="flex flex-col gap-3">
                <div className="relative w-full h-72 sm:h-96 rounded-[12px] bg-[var(--surface-bg,#465362)]/50 border border-[var(--border-color,#56616D)] overflow-hidden flex items-center justify-center group">
                  {currentImageUrl ? (
                    <>
                      <img
                        src={currentImageUrl}
                        alt={listing.title}
                        className="w-full h-full object-contain cursor-pointer"
                        onClick={() => {
                          const urls = images.map((i) => i.image_url);
                          openImageViewer(urls, {
                            title: listing.title,
                            subtitle: listing.category_id,
                            activeIndex: activeImageIndex,
                          });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const urls = images.map((i) => i.image_url);
                          openImageViewer(urls, {
                            title: listing.title,
                            subtitle: listing.category_id,
                            activeIndex: activeImageIndex,
                          });
                        }}
                        className="absolute bottom-3 right-3 p-2 rounded-full bg-black/60 text-white backdrop-blur border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={isHu ? 'Kép nagyítása' : 'Zoom image'}
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="text-xs text-[var(--text-sub,#B5BDC6)]">{isHu ? 'Nincs csatolt fotó' : 'No photo available'}</div>
                  )}

                  {/* Previous / Next Image Nav Buttons */}
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white backdrop-blur border border-white/20 hover:bg-black/80 transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white backdrop-blur border border-white/20 hover:bg-black/80 transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails strip */}
                {images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {images.map((img, idx) => (
                      <button
                        key={img.id || idx}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative w-16 h-16 rounded-[8px] overflow-hidden shrink-0 border-2 transition-all ${
                          activeImageIndex === idx
                            ? 'border-[var(--color-primary-blue,#2563EB)] scale-105'
                            : 'border-[var(--border-color,#56616D)]/60 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Title, Pricing & Details Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Column (2 spans) */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-2">
                      {listing.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-sub,#B5BDC6)]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        {listing.location_region || (isHu ? 'Nincs régió megadva' : 'Location unset')}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(listing.created_at).toLocaleDateString(isHu ? 'hu-HU' : 'en-US')}
                      </span>
                      {listing.condition && (
                        <>
                          <span>•</span>
                          <span className="px-2 py-0.5 rounded bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] border border-[var(--border-color,#56616D)] font-medium">
                            {listing.condition}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Price Banner */}
                  <div className="p-4 rounded-[12px] bg-[var(--surface-bg,#465362)]/40 border border-[var(--border-color,#56616D)] flex flex-wrap items-center justify-between gap-3">
                    {formatPrice()}

                    {listing.listing_type === 'rent' && listing.rental_deposit && (
                      <div className="text-xs text-[var(--text-sub,#B5BDC6)]">
                        <span className="font-semibold">{isHu ? 'Kaució: ' : 'Deposit: '}</span>
                        {new Intl.NumberFormat(isHu ? 'hu-HU' : 'en-US').format(listing.rental_deposit)} {listing.currency}
                      </div>
                    )}
                  </div>

                  {/* Barter wishes callout */}
                  {listing.listing_type === 'barter' && listing.barter_description && (
                    <div className="p-3.5 rounded-[12px] bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs flex flex-col gap-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <Repeat className="w-4 h-4" />
                        {isHu ? 'Eladó csereigénye:' : 'Seller exchange wish:'}
                      </span>
                      <p className="text-slate-200">{listing.barter_description}</p>
                    </div>
                  )}

                  {/* Description */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-sub,#B5BDC6)]">
                      {isHu ? 'Leírás' : 'Description'}
                    </h4>
                    <div className="p-4 rounded-[12px] bg-[var(--surface-bg,#465362)]/30 border border-[var(--border-color,#56616D)]/70 text-xs sm:text-sm text-[var(--text-main,#E0E3E6)] whitespace-pre-wrap leading-relaxed">
                      {listing.description || (isHu ? 'Nincs részletes leírás.' : 'No description provided.')}
                    </div>
                  </div>

                  {/* Highlights (Warranty, Invoice) */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {listing.has_warranty && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isHu ? 'Garanciális termék' : 'Warranty included'}
                      </span>
                    )}
                    {listing.has_invoice && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 border border-blue-500/30 text-blue-400">
                        <FileCheck className="w-3.5 h-3.5" />
                        {isHu ? 'Számla rendelkezésre áll' : 'Invoice available'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Sidebar Column (1 span) - Seller & Actions */}
                <div className="flex flex-col gap-4">
                  {/* Seller Card */}
                  <div className="p-4 rounded-[14px] bg-[var(--surface-bg,#465362)]/50 border border-[var(--border-color,#56616D)] flex flex-col gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-sub,#B5BDC6)]">
                      {isHu ? 'Hirdető adatai' : 'Seller Profile'}
                    </span>

                    <div
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => onOpenSellerProfile?.(listing.seller_id)}
                    >
                      <div className="w-12 h-12 rounded-full bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] flex items-center justify-center text-[var(--color-primary-blue,#2563EB)] font-bold text-lg overflow-hidden shrink-0">
                        {listing.seller?.avatar_url ? (
                          <img src={listing.seller.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          listing.seller?.display_name?.charAt(0).toUpperCase() || <UserIcon className="w-6 h-6" />
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1 truncate">
                          {listing.seller?.display_name || (isHu ? 'Közösségi tag' : 'Member')}
                          {listing.seller?.is_verified && (
                            <span title={isHu ? 'Ellenőrzött profil' : 'Verified'} className="inline-flex items-center">
                              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-[var(--text-sub,#B5BDC6)]">
                          {isHu ? 'Közösségi bizalom: ' : 'Trust score: '}
                          <strong className="text-amber-400">★ {listing.seller?.trust_score ?? 100}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-color,#56616D)]/50 grid grid-cols-2 gap-2 text-center text-[11px]">
                      <div className="p-2 rounded bg-[var(--surface-bg,#465362)]/60">
                        <span className="block text-[var(--text-sub,#B5BDC6)]">{isHu ? 'Sikeres ügyletek' : 'Deals'}</span>
                        <strong className="text-white text-xs">{listing.seller?.successful_deals ?? 0}</strong>
                      </div>
                      <div className="p-2 rounded bg-[var(--surface-bg,#465362)]/60">
                        <span className="block text-[var(--text-sub,#B5BDC6)]">{isHu ? 'Tagság kezdete' : 'Member since'}</span>
                        <strong className="text-white text-xs">
                          {listing.seller?.created_at ? new Date(listing.seller.created_at).getFullYear() : '—'}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenSellerProfile?.(listing.seller_id)}
                      className="w-full py-1.5 rounded-[8px] bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-xs font-semibold text-[var(--text-main,#E0E3E6)] transition-colors border border-[var(--border-color,#56616D)]"
                    >
                      {isHu ? 'Teljes profil & további hirdetések' : 'View profile & all listings'}
                    </button>
                  </div>

                  {/* Context Actions */}
                  <div className="flex flex-col gap-2.5">
                    {isOwner ? (
                      /* Owner actions */
                      <div className="p-3.5 rounded-[14px] bg-blue-500/10 border border-blue-500/30 flex flex-col gap-2">
                        <span className="text-xs font-bold text-blue-400">{isHu ? 'Saját hirdetés kezelése' : 'Manage your listing'}</span>

                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => onEditListing?.(listing)}
                          className="w-full py-2 px-3 rounded-[10px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isHu ? 'Hirdetés szerkesztése' : 'Edit Listing'}</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {listing.status === 'active' ? (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleStatusChange('reserved')}
                              className="py-1.5 px-2 rounded-[8px] bg-[var(--surface-bg,#465362)] hover:bg-amber-600/30 text-amber-300 text-xs font-medium border border-amber-500/30 transition-colors"
                            >
                              {isHu ? 'Foglaltra állítás' : 'Mark Reserved'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleStatusChange('active')}
                              className="py-1.5 px-2 rounded-[8px] bg-[var(--surface-bg,#465362)] hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium border border-emerald-500/30 transition-colors"
                            >
                              {isHu ? 'Újraaktiválás' : 'Reactivate'}
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleStatusChange('archived')}
                            className="py-1.5 px-2 rounded-[8px] bg-[var(--surface-bg,#465362)] hover:bg-slate-600 text-[var(--text-sub,#B5BDC6)] text-xs font-medium border border-[var(--border-color,#56616D)] transition-colors"
                          >
                            <Archive className="w-3 h-3 inline mr-1" />
                            {isHu ? 'Archiválás' : 'Archive'}
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={handleDeleteListing}
                          className="w-full py-1.5 rounded-[8px] text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isHu ? 'Hirdetés végleges törlése' : 'Delete listing'}</span>
                        </button>
                      </div>
                    ) : (
                      /* Buyer / Visitor actions */
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isAuthenticated) {
                              setIsAuthModalOpen(true);
                              return;
                            }
                            onOpenChat?.(listing.seller_id, listing.id);
                          }}
                          className="w-full py-2.5 px-4 rounded-[10px] bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>{isHu ? 'Kapcsolatfelvétel & Üzenet' : 'Contact & Message'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!isAuthenticated) {
                              setIsAuthModalOpen(true);
                              return;
                            }
                            onOpenOffer?.(listing);
                          }}
                          className="w-full py-2.5 px-4 rounded-[10px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                        >
                          <HandCoins className="w-4 h-4" />
                          <span>
                            {listing.listing_type === 'rent'
                              ? (isHu ? 'Bérleti ajánlat küldése' : 'Make Rent Offer')
                              : listing.listing_type === 'barter'
                              ? (isHu ? 'Csereajánlat küldése' : 'Make Barter Offer')
                              : (isHu ? 'Vételi ajánlat küldése' : 'Make Offer')}
                          </span>
                        </button>

                        {/* Safety & Moderation links */}
                        <div className="pt-2 flex items-center justify-between text-[11px] text-[var(--text-sub,#B5BDC6)]">
                          <button
                            type="button"
                            onClick={() => onOpenReport?.(listing.id, listing.title)}
                            className="hover:text-rose-400 transition-colors flex items-center gap-1"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>{isHu ? 'Hirdetés jelentése' : 'Report'}</span>
                          </button>

                          {isAuthenticated && (
                            <button
                              type="button"
                              onClick={handleBlockSeller}
                              className="hover:text-rose-400 transition-colors flex items-center gap-1"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>{isHu ? 'Eladó tiltása' : 'Block seller'}</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
