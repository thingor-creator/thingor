import React from 'react';
import type { MarketplaceListing } from '../../types/marketplace';
import { getConditionDisplayLabel } from '../../lib/marketplace';
import { useApp } from '../../context/AppContext';
import {
  MapPin,
  Tag,
  Heart,
  Repeat,
  Sparkles,
  Layers,
  ShieldCheck,
  User as UserIcon,
  Image as ImageIcon
} from 'lucide-react';

interface ListingCardProps {
  listing: MarketplaceListing;
  onSelect: (listing: MarketplaceListing) => void;
  onToggleBookmark?: (listingId: string, currentSaved: boolean) => void;
  isSaved?: boolean;
  isOwner?: boolean;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onSelect,
  onToggleBookmark,
  isSaved = false,
  isOwner = false,
}) => {
  const { language } = useApp();
  const isHu = language === 'hu';

  const primaryImage = listing.images?.find((img) => img.is_primary)?.image_url ||
    listing.images?.[0]?.image_url;

  const getTypeBadge = () => {
    switch (listing.listing_type) {
      case 'sale':
        return {
          label: isHu ? 'Eladó' : 'For Sale',
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        };
      case 'rent':
        return {
          label: isHu ? 'Kiadó' : 'For Rent',
          bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        };
      case 'barter':
        return {
          label: isHu ? 'Csere' : 'Barter',
          bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        };
      case 'share':
        return {
          label: isHu ? 'Megosztás' : 'Share',
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        };
      case 'free':
        return {
          label: isHu ? 'Ingyen elvihető' : 'Free',
          bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        };
      default:
        return {
          label: listing.listing_type,
          bg: 'bg-slate-700/50 text-slate-300 border-slate-600',
        };
    }
  };

  const getConditionLabel = (condition: string) => {
    return getConditionDisplayLabel(condition, isHu);
  };

  const formatPrice = () => {
    if (listing.listing_type === 'free') {
      return (
        <span className="text-emerald-400 font-bold text-base flex items-center gap-1">
          <Sparkles className="w-4 h-4" />
          {isHu ? 'Ingyenes' : 'Free'}
        </span>
      );
    }

    if (listing.listing_type === 'barter') {
      return (
        <span className="text-purple-400 font-semibold text-sm flex items-center gap-1 line-clamp-1" title={listing.barter_description || ''}>
          <Repeat className="w-4 h-4 shrink-0" />
          {listing.barter_description
            ? (isHu ? `Csere: ${listing.barter_description}` : `Barter: ${listing.barter_description}`)
            : (isHu ? 'Csereajánlatra' : 'For Barter')}
        </span>
      );
    }

    if (listing.price !== null && listing.price !== undefined) {
      const formatted = new Intl.NumberFormat(isHu ? 'hu-HU' : 'en-US').format(listing.price);
      const currency = listing.currency || 'HUF';

      if (listing.listing_type === 'rent') {
        const periodUnit = listing.rental_period_unit === 'month'
          ? (isHu ? 'hó' : 'mo')
          : (isHu ? 'nap' : 'day');
        return (
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-white tracking-tight">
              {formatted} {currency}
            </span>
            <span className="text-xs text-[var(--text-sub,#B5BDC6)]">/{periodUnit}</span>
          </div>
        );
      }

      return (
        <span className="text-lg font-bold text-white tracking-tight">
          {formatted} {currency}
        </span>
      );
    }

    return <span className="text-sm text-[var(--text-sub,#B5BDC6)]">{isHu ? 'Megállapodás szerint' : 'Negotiable'}</span>;
  };

  const typeBadge = getTypeBadge();

  return (
    <div
      onClick={() => onSelect(listing)}
      className="group relative flex flex-col rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] overflow-hidden hover:border-[var(--color-primary-blue,#2563EB)]/70 hover:shadow-xl transition-all duration-200 cursor-pointer isolate"
    >
      {/* Thumbnail Container */}
      <div className="relative h-48 w-full shrink-0 bg-[var(--surface-bg,#465362)]/40 overflow-hidden flex items-center justify-center rounded-t-[14px]">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={listing.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center block group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80';
            }}
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-[var(--text-sub,#B5BDC6)] bg-[var(--surface-bg,#465362)]/30">
            <ImageIcon className="h-10 w-10 mb-1 opacity-50" />
            <span className="text-[11px]">{isHu ? 'Nincs fotó' : 'No photo'}</span>
          </div>
        )}

        {/* Top-Left: Type badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md border shadow-md ${typeBadge.bg}`}>
            <Tag className="w-3 h-3" />
            {typeBadge.label}
          </span>
          {listing.status !== 'active' && (
            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/90 text-black uppercase tracking-wider shadow">
              {listing.status === 'reserved' ? (isHu ? 'Foglalt' : 'Reserved') : listing.status}
            </span>
          )}
        </div>

        {/* Top-Right: Image counter & Bookmark */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {listing.images && listing.images.length > 1 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-black/60 text-white backdrop-blur border border-white/10 shadow">
              <Layers className="w-3 h-3" />
              {listing.images.length}
            </span>
          )}

          {onToggleBookmark && !isOwner && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark(listing.id, isSaved);
              }}
              className={`p-2 rounded-full backdrop-blur-md border transition-all shadow-md ${
                isSaved
                  ? 'bg-rose-500 text-white border-rose-400 scale-105'
                  : 'bg-black/50 text-white/80 hover:text-rose-400 hover:bg-black/70 border-white/15'
              }`}
              title={isSaved ? (isHu ? 'Mentés eltávolítása' : 'Remove bookmark') : (isHu ? 'Mentés' : 'Save')}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          )}

          {isOwner && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-500/80 text-white backdrop-blur shadow">
              {isHu ? 'Saját' : 'Yours'}
            </span>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-1 p-3.5 justify-between gap-3">
        <div>
          {/* Category & Condition tags */}
          <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-sub,#B5BDC6)] mb-1.5">
            <span className="truncate font-medium">{listing.category_id || (isHu ? 'Általános' : 'General')}</span>
            {listing.condition && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] border border-[var(--border-color,#56616D)]">
                {getConditionLabel(listing.condition)}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-sm text-[var(--text-main,#E0E3E6)] line-clamp-2 leading-snug group-hover:text-white transition-colors">
            {listing.title}
          </h3>
        </div>

        {/* Price & Location & Seller Footer */}
        <div className="pt-2 border-t border-[var(--border-color,#56616D)]/50 flex flex-col gap-2">
          {/* Price row */}
          <div className="flex items-center justify-between">
            {formatPrice()}
          </div>

          {/* Location and Seller Trust info */}
          <div className="flex items-center justify-between text-xs text-[var(--text-sub,#B5BDC6)] pt-0.5">
            <span className="flex items-center gap-1 truncate max-w-[55%]" title={listing.location_region || ''}>
              <MapPin className="w-3.5 h-3.5 shrink-0 text-[var(--color-primary-blue,#2563EB)]" />
              <span className="truncate">{listing.location_region || (isHu ? 'Helyszín nincs megadva' : 'Location unset')}</span>
            </span>

            {/* Seller micro-badge */}
            {listing.seller ? (
              <span className="flex items-center gap-1 shrink-0 font-medium text-[var(--text-main,#E0E3E6)]">
                {listing.seller.is_verified && (
                  <span title={isHu ? 'Ellenőrzött eladó' : 'Verified seller'} className="inline-flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                )}
                <span className="truncate max-w-[90px]">{listing.seller.display_name}</span>
                {listing.seller.trust_score !== undefined && listing.seller.trust_score > 0 && (
                  <span className="text-[10px] text-amber-400 font-bold">★{listing.seller.trust_score}</span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1 shrink-0 text-[11px]">
                <UserIcon className="w-3 h-3 opacity-60" />
                <span>{isHu ? 'Közösségi tag' : 'Member'}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
