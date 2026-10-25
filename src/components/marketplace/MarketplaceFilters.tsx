import React, { useState } from 'react';
import type { MarketplaceFilterState, ListingType, ListingSortBy } from '../../types/marketplace';
import { useApp } from '../../context/AppContext';
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  Tag,
  ArrowUpDown,
  MapPin,
  CircleDollarSign,
  Loader2,
} from 'lucide-react';

interface MarketplaceFiltersProps {
  filters: MarketplaceFilterState;
  onChange: (updated: MarketplaceFilterState) => void;
  onReset: () => void;
  isSearching?: boolean;
}

export const MarketplaceFilters: React.FC<MarketplaceFiltersProps> = ({
  filters,
  onChange,
  onReset,
  isSearching = false,
}) => {
  const { language } = useApp();
  const isHu = language === 'hu';
  const [showAdvanced, setShowAdvanced] = useState(false);

  const typeOptions: { type: ListingType | 'all'; label: string }[] = [
    { type: 'all', label: isHu ? 'Összes' : 'All' },
    { type: 'sale', label: isHu ? 'Eladó' : 'Sale' },
    { type: 'rent', label: isHu ? 'Kiadó' : 'Rent' },
    { type: 'barter', label: isHu ? 'Csere' : 'Barter' },
    { type: 'share', label: isHu ? 'Megosztás' : 'Share' },
    { type: 'free', label: isHu ? 'Ingyenes' : 'Free' },
  ];

  const categoryOptions = [
    { id: '', label: isHu ? 'Minden kategória' : 'All Categories' },
    { id: 'Elektronika', label: isHu ? 'Elektronika' : 'Electronics' },
    { id: 'Szerszámok', label: isHu ? 'Szerszámok' : 'Tools' },
    { id: 'Otthon & Háztartás', label: isHu ? 'Otthon & Háztartás' : 'Home & Household' },
    { id: 'Kert', label: isHu ? 'Kert' : 'Garden' },
    { id: 'Járművek', label: isHu ? 'Járművek' : 'Vehicles' },
    { id: 'Sport & Szabadidő', label: isHu ? 'Sport & Szabadidő' : 'Sports & Outdoors' },
    { id: 'Könyvek', label: isHu ? 'Könyvek' : 'Books' },
    { id: 'Gyűjtemények', label: isHu ? 'Gyűjtemények' : 'Collectibles' },
    { id: 'Ruházat', label: isHu ? 'Ruházat' : 'Clothing' },
    { id: 'Háztartási gépek', label: isHu ? 'Háztartási gépek' : 'Appliances' },
    { id: 'Egyéb tárgyak', label: isHu ? 'Egyéb' : 'Other' },
  ];

  const conditionOptions = [
    { id: '', label: isHu ? 'Minden állapot' : 'All Conditions' },
    { id: 'New', label: isHu ? 'Új' : 'New' },
    { id: 'Excellent', label: isHu ? 'Kiváló' : 'Excellent' },
    { id: 'Good', label: isHu ? 'Jó' : 'Good' },
    { id: 'Fair', label: isHu ? 'Használt' : 'Fair' },
    { id: 'Poor', label: isHu ? 'Kopott' : 'Poor' },
  ];

  const sortOptions: { id: ListingSortBy; label: string }[] = [
    { id: 'newest', label: isHu ? 'Legújabb elöl' : 'Newest First' },
    { id: 'price_asc', label: isHu ? 'Ár szerint növekvő' : 'Price: Low to High' },
    { id: 'price_desc', label: isHu ? 'Ár szerint csökkenő' : 'Price: High to Low' },
    { id: 'trust_score', label: isHu ? 'Megbízhatóság szerint' : 'Seller Trust Score' },
  ];

  const hasActiveFilters = Boolean(
    filters.query ||
    filters.listing_type ||
    filters.category_id ||
    filters.condition ||
    filters.min_price !== undefined ||
    filters.max_price !== undefined ||
    filters.location_region ||
    (filters.sort_by && filters.sort_by !== 'newest')
  );

  return (
    <div className="flex flex-col gap-3 w-full bg-[var(--card-bg,#3A4551)]/80 p-4 rounded-[14px] border border-[var(--border-color,#56616D)] shadow-sm backdrop-blur-sm">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-2.5">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          {isSearching ? (
            <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-primary-blue,#2563EB)] animate-spin" />
          ) : (
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-sub,#B5BDC6)]" />
          )}
          <input
            type="text"
            value={filters.query || ''}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder={isHu ? 'Keresés címben, leírásban, kulcsszavakban...' : 'Search listings by title, description, keywords...'}
            className="w-full pl-10 pr-9 py-2.5 rounded-[10px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] text-sm focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] focus:ring-1 focus:ring-[var(--color-primary-blue,#2563EB)] transition-all placeholder:text-[var(--text-sub,#B5BDC6)]/60"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, query: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-sub,#B5BDC6)] hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Buttons: Advanced toggle & Reset */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-between md:justify-start">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] border text-xs font-semibold transition-all ${
              showAdvanced || hasActiveFilters
                ? 'bg-[var(--color-primary-blue,#2563EB)]/15 border-[var(--color-primary-blue,#2563EB)] text-blue-400'
                : 'bg-[var(--surface-bg,#465362)] border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]/80'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isHu ? 'Szűrők' : 'Filters'}</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-[10px] bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium hover:bg-rose-500/20 transition-all"
              title={isHu ? 'Szűrők törlése' : 'Reset filters'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isHu ? 'Alaphelyzet' : 'Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Listing Type Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {typeOptions.map((opt) => {
          const isSelected = (!filters.listing_type && opt.type === 'all') || filters.listing_type === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => {
                onChange({
                  ...filters,
                  listing_type: opt.type === 'all' ? undefined : (opt.type as ListingType),
                });
              }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
                  : 'bg-[var(--surface-bg,#465362)]/60 text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]/50'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Collapsible Advanced Filters Drawer */}
      {showAdvanced && (
        <div className="pt-3 border-t border-[var(--border-color,#56616D)]/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Category Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[var(--text-sub,#B5BDC6)] flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {isHu ? 'Kategória' : 'Category'}
            </label>
            <select
              value={filters.category_id || ''}
              onChange={(e) => onChange({ ...filters, category_id: e.target.value || undefined })}
              className="w-full px-2.5 py-2 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
            >
              {categoryOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Condition Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[var(--text-sub,#B5BDC6)]">
              {isHu ? 'Állapot' : 'Condition'}
            </label>
            <select
              value={filters.condition || ''}
              onChange={(e) => onChange({ ...filters, condition: e.target.value || undefined })}
              className="w-full px-2.5 py-2 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
            >
              {conditionOptions.map((cond) => (
                <option key={cond.id} value={cond.id}>
                  {cond.label}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[var(--text-sub,#B5BDC6)] flex items-center gap-1">
              <CircleDollarSign className="w-3 h-3" />
              {isHu ? 'Ár (HUF)' : 'Price (HUF)'}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                step="any"
                placeholder={isHu ? 'Min' : 'Min'}
                value={filters.min_price ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : Number(e.target.value);
                  onChange({ ...filters, min_price: val });
                }}
                className="w-1/2 px-2 py-1.5 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
              />
              <span className="text-[var(--text-sub,#B5BDC6)] text-xs">-</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={isHu ? 'Max' : 'Max'}
                value={filters.max_price ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : Number(e.target.value);
                  onChange({ ...filters, max_price: val });
                }}
                className="w-1/2 px-2 py-1.5 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
              />
            </div>
          </div>

          {/* Location Region & Sort */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[var(--text-sub,#B5BDC6)] flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              {isHu ? 'Rendezés' : 'Sort Order'}
            </label>
            <select
              value={filters.sort_by || 'newest'}
              onChange={(e) => onChange({ ...filters, sort_by: e.target.value as ListingSortBy })}
              className="w-full px-2.5 py-2 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
            >
              {sortOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Region Search Input (Spans across or separate row) */}
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
            <label className="text-[11px] font-medium text-[var(--text-sub,#B5BDC6)] flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {isHu ? 'Település / Régió szűrés' : 'City / Region filter'}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={isHu ? 'Pl.: Budapest, Győr, Debrecen...' : 'e.g.: Budapest, Debrecen...'}
                value={filters.location_region || ''}
                onChange={(e) => onChange({ ...filters, location_region: e.target.value || undefined })}
                className="w-full px-3 py-1.5 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
              />
              {filters.location_region && (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, location_region: undefined })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-sub,#B5BDC6)] hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
