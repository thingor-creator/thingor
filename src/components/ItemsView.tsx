import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { ItemCard } from './ItemCard';
import { InsuranceInventoryModal } from './InsuranceInventoryModal';
import { CSVModal } from './CSVModal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Item, SortField } from '../types';
import {
  Search,
  Plus,
  ArrowUpDown,
  Boxes,
  X,
  RotateCcw,
  FileText,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

// Local search normalization helper for offline/guest fallback
const normalizeSearchText = (text: string | null | undefined): string => {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const PAGE_SIZE_OPTIONS = [24, 48, 96];

export const ItemsView: React.FC = () => {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);

  const {
    items: localItems,
    itemsVersion,
    categories,
    locations,
    household,
    householdMembers,
    filters,
    setFilters,
    resetFilters,
    setIsAddEditItemModalOpen,
    setEditingItem,
    getLocationPath,
    getCategoryName,
    t,
    language,
    user,
    isVaultUnlocked,
    dashboardMetrics,
  } = useApp();

  const currentUserMember = householdMembers?.find(m => m.user_id === user?.id);

  // Server-side pagination and data state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [paginatedItems, setPaginatedItems] = useState<Item[]>([]);
  const [totalMatchingCount, setTotalMatchingCount] = useState<number>(0);
  const [totalInventoryCount, setTotalInventoryCount] = useState<number>(() => dashboardMetrics?.total_items ?? 0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Synchronize total inventory count directly with central dashboard metrics
  useEffect(() => {
    if (dashboardMetrics?.total_items !== undefined && dashboardMetrics.total_items !== null) {
      setTotalInventoryCount(dashboardMetrics.total_items);
    }
  }, [dashboardMetrics?.total_items]);

  // Local debounced search input state for smooth 60fps typing
  const [searchInput, setSearchInput] = useState(filters.search);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize local search input when filters.search is reset or modified externally
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // Handle debounced search typing
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value }));
      setCurrentPage(1);
    }, 300);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    setFilters(prev => ({ ...prev, search: '' }));
    setCurrentPage(1);
  };

  // Reset page to 1 whenever dropdown filters or sorting change
  const handleFilterChange = useCallback((updater: (prev: typeof filters) => typeof filters) => {
    setFilters(prev => {
      const next = updater(prev);
      return next;
    });
    setCurrentPage(1);
  }, [setFilters]);

  // Main Data Query: Server-side pagination via Supabase (or in-memory client fallback)
  useEffect(() => {
    let isCancelled = false;

    const fetchPageData = async () => {
      // 1. Authenticated Server-Side Pagination using Supabase
      if (isSupabaseConfigured && supabase && user?.id) {
        setIsLoading(true);
        setFetchError(null);

        try {
          const isFiltering = Boolean(filters.search.trim()) ||
            (filters.categoryId && filters.categoryId !== 'all') ||
            (filters.locationId && filters.locationId !== 'all') ||
            (filters.condition && filters.condition !== 'all');

          let query = supabase
            .from('items')
            .select('*', { count: 'exact' });

          // Scope query: global admins scope to their own items/household so unrelated system items aren't pulled in.
          // Non-admin users rely on Supabase RLS (items_select_policy) which securely scopes to user, household, and shared items/locations/categories.
          if (user?.id && (user.role === 'admin' || user.is_admin)) {
            if (household?.id) {
              query = query.or(`user_id.eq.${user.id},household_id.eq.${household.id}`);
            } else {
              query = query.eq('user_id', user.id);
            }
          }

          // Exclude vault-protected items when vault is locked
          if (!isVaultUnlocked) {
            query = query.eq('is_vault_protected', false);
          }

          // 1.1 Text search across name, description, notes
          const searchTokens = filters.search.trim()
            ? filters.search.trim().split(/\s+/).filter(Boolean)
            : [];

          for (const token of searchTokens) {
            const sanitized = token.replace(/[%_,()]/g, '').trim();
            if (sanitized) {
              query = query.or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%,notes.ilike.%${sanitized}%`);
            }
          }

          // 1.2 Category Filter
          if (filters.categoryId && filters.categoryId !== 'all') {
            query = query.eq('category_id', filters.categoryId);
          }

          // 1.3 Location Filter
          if (filters.locationId && filters.locationId !== 'all') {
            query = query.eq('location_id', filters.locationId);
          }

          // 1.4 Condition Filter
          if (filters.condition && filters.condition !== 'all') {
            query = query.eq('condition', filters.condition);
          }

          // 1.5 Sorting
          let sortCol = 'created_at';
          if (filters.sortBy === 'name') sortCol = 'name';
          else if (filters.sortBy === 'purchase_date') sortCol = 'purchase_date';
          else if (filters.sortBy === 'current_value') sortCol = 'current_value';
          else if (filters.sortBy === 'category') sortCol = 'category_id';
          else if (filters.sortBy === 'location') sortCol = 'location_id';

          query = query.order(sortCol, {
            ascending: filters.sortOrder === 'asc',
            nullsFirst: false,
          });

          // 1.6 Pagination range: [from, to] (0-indexed inclusive)
          const from = (currentPage - 1) * pageSize;
          const to = from + pageSize - 1;
          query = query.range(from, to);

          const { data, count, error } = await query;

          if (isCancelled) return;

          if (error) {
            if (error.message?.includes('Requested range not satisfiable') || (error as any).code === 'PGRST103') {
              if (currentPage > 1) {
                setCurrentPage(1);
                return;
              }
              setPaginatedItems([]);
              setTotalMatchingCount(0);
              if (!isFiltering) {
                setTotalInventoryCount(0);
              }
            } else {
              console.error('Supabase paginated items query error:', error.message);
              setFetchError(error.message);
              // Fallback to client data if network/table error
              runClientSidePagination();
              return;
            }
          } else {
            setPaginatedItems(data as Item[]);
            setTotalMatchingCount(count ?? 0);
            if (!isFiltering && !dashboardMetrics) {
              setTotalInventoryCount(count ?? 0);
            }
          }

          // Ensure total unfiltered inventory count matches dashboardMetrics (or runs identical scope HEAD query)
          if (dashboardMetrics?.total_items !== undefined && dashboardMetrics.total_items !== null) {
            setTotalInventoryCount(dashboardMetrics.total_items);
          } else if (!error) {
            try {
              let totalQuery = supabase
                .from('items')
                .select('*', { count: 'exact', head: true });

              if (user?.id && (user.role === 'admin' || user.is_admin)) {
                if (household?.id) {
                  totalQuery = totalQuery.or(`user_id.eq.${user.id},household_id.eq.${household.id}`);
                } else {
                  totalQuery = totalQuery.eq('user_id', user.id);
                }
              }

              const { count: totalCount, error: totalErr } = await totalQuery;
              if (!isCancelled && !totalErr && totalCount !== null && totalCount !== undefined) {
                setTotalInventoryCount(totalCount);
              }
            } catch (totalErr) {
              console.warn('Failed to fetch total inventory count:', totalErr);
            }
          }
        } catch (err: any) {
          if (!isCancelled) {
            setFetchError(err.message || 'Error loading items');
            runClientSidePagination();
          }
        } finally {
          if (!isCancelled) {
            setIsLoading(false);
          }
        }
        return;
      }

      // 2. Offline / Guest Client-Side Fallback
      runClientSidePagination();
    };

    const runClientSidePagination = () => {
      const searchTokens = filters.search.trim()
        ? filters.search.trim().split(/\s+/).map(normalizeSearchText).filter(Boolean)
        : [];

      const filtered = localItems.filter(item => {
        // Exclude vault-protected items when vault is locked
        if (!isVaultUnlocked && item.is_vault_protected) return false;

        // Enforce member inventory module and excluded items permissions for household items not owned by current user
        if (currentUserMember && item.user_id !== user?.id) {
          if (currentUserMember.allowed_modules?.inventory === false) return false;
          if (currentUserMember.excluded_item_ids?.includes(item.id)) return false;
        }

        if (searchTokens.length > 0) {
          const normName = normalizeSearchText(item.name);
          const normDesc = normalizeSearchText(item.description);
          const normNotes = normalizeSearchText(item.notes);
          const normCat = normalizeSearchText(item.category_id ? getCategoryName(item.category_id) : '');
          const normLoc = normalizeSearchText(item.location_id ? getLocationPath(item.location_id) : '');

          const isMatch = searchTokens.every(token =>
            normName.includes(token) ||
            normDesc.includes(token) ||
            normNotes.includes(token) ||
            normCat.includes(token) ||
            normLoc.includes(token)
          );
          if (!isMatch) return false;
        }

        if (filters.categoryId !== 'all' && item.category_id !== filters.categoryId) return false;
        if (filters.locationId !== 'all' && item.location_id !== filters.locationId) return false;
        if (filters.condition !== 'all' && item.condition !== filters.condition) return false;

        return true;
      });

      const sorted = [...filtered].sort((a, b) => {
        let comp = 0;
        switch (filters.sortBy) {
          case 'name':
            comp = a.name.localeCompare(b.name);
            break;
          case 'purchase_date':
            comp = (a.purchase_date || '').localeCompare(b.purchase_date || '');
            break;
          case 'current_value':
            comp = (a.current_value ?? a.purchase_price ?? 0) - (b.current_value ?? b.purchase_price ?? 0);
            break;
          case 'category':
            comp = getCategoryName(a.category_id).localeCompare(getCategoryName(b.category_id));
            break;
          case 'location':
            comp = getLocationPath(a.location_id).localeCompare(getLocationPath(b.location_id));
            break;
          case 'created_at':
          default:
            comp = a.created_at.localeCompare(b.created_at);
            break;
        }
        return filters.sortOrder === 'asc' ? comp : -comp;
      });

      const from = (currentPage - 1) * pageSize;
      const slice = sorted.slice(from, from + pageSize);

      const baseInventoryCount = dashboardMetrics?.total_items ?? localItems.length;
      setTotalInventoryCount(baseInventoryCount);
      setTotalMatchingCount(sorted.length);
      setPaginatedItems(slice);
      setIsLoading(false);
    };

    fetchPageData();

    return () => {
      isCancelled = true;
    };
  }, [
    user?.id,
    household?.id,
    dashboardMetrics?.total_items,
    isVaultUnlocked,
    filters.search,
    filters.categoryId,
    filters.locationId,
    filters.condition,
    filters.sortBy,
    filters.sortOrder,
    currentPage,
    pageSize,
    itemsVersion,
    localItems,
    getCategoryName,
    getLocationPath,
  ]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsAddEditItemModalOpen(true);
  };

  const hasActiveFilters =
    Boolean(filters.search.trim()) ||
    filters.categoryId !== 'all' ||
    filters.locationId !== 'all' ||
    filters.condition !== 'all';

  const totalPages = Math.max(1, Math.ceil(totalMatchingCount / pageSize));
  const fromRecord = totalMatchingCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toRecord = Math.min(currentPage * pageSize, totalMatchingCount);

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color,#56616D)] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main,#E0E3E6)] tracking-tight">
              {t('my_things')}
            </h1>
            <span
              className="px-3 py-1 rounded-full bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--color-primary-blue,#2563EB)] font-bold text-xs"
              title={language === 'hu' ? 'Összes nyilvántartott tárgy' : 'Total inventory items'}
            >
              {totalInventoryCount} {language === 'hu' ? 'tárgy' : 'items'}
            </span>
            {isLoading && (
              <Loader2 className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] animate-spin" />
            )}
          </div>
          <p className="text-sm text-[var(--text-sub,#B5BDC6)] mt-1">
            {language === 'hu'
              ? 'Keresd, szűrd és kezeld a fizikai tárgynyilvántartásodat optimális teljesítménnyel.'
              : 'Search, filter, and manage your inventory with high performance.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:flex sm:items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] font-bold text-xs shadow-sm transition-all w-full sm:w-auto"
            title={language === 'hu' ? 'Biztosítási leltár PDF exportálása' : 'Export insurance inventory PDF'}
          >
            <FileText className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
            <span>{language === 'hu' ? 'Biztosítási Leltár (PDF)' : 'Insurance PDF'}</span>
          </button>

          <button
            onClick={() => setIsCSVModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] font-bold text-xs shadow-sm transition-all w-full sm:w-auto"
            title={language === 'hu' ? 'CSV Import és Export kezelése' : 'CSV Import and Export'}
          >
            <FileSpreadsheet className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
            <span>{language === 'hu' ? 'CSV Import / Export' : 'CSV Import / Export'}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02] w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 stroke-[2.5] shrink-0" />
            <span>{t('add_thing')}</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="p-4 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] space-y-4 shadow-sm">
        
        {/* Search Input with Debounce */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-sub,#B5BDC6)]" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] text-sm focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] transition-colors"
          />
          {searchInput && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-sub,#B5BDC6)] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns & Sorting */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          
          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-sub,#B5BDC6)] mb-1">{t('category')}</label>
            <select
              value={filters.categoryId}
              onChange={(e) => handleFilterChange(prev => ({ ...prev, categoryId: e.target.value }))}
              className="w-full p-2 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] focus:border-[var(--color-primary-blue,#2563EB)] focus:outline-none transition-colors"
            >
              <option value="all">{t('all_categories')}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{getCategoryName(cat.id)}</option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-sub,#B5BDC6)] mb-1">{t('location')}</label>
            <select
              value={filters.locationId}
              onChange={(e) => handleFilterChange(prev => ({ ...prev, locationId: e.target.value }))}
              className="w-full p-2 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] focus:border-[var(--color-primary-blue,#2563EB)] focus:outline-none transition-colors"
            >
              <option value="all">{t('all_locations')}</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {getLocationPath(loc.id)}
                </option>
              ))}
            </select>
          </div>

          {/* Condition Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-sub,#B5BDC6)] mb-1">{t('condition')}</label>
            <select
              value={filters.condition}
              onChange={(e) => handleFilterChange(prev => ({ ...prev, condition: e.target.value }))}
              className="w-full p-2 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] focus:border-[var(--color-primary-blue,#2563EB)] focus:outline-none transition-colors"
            >
              <option value="all">{t('all_conditions')}</option>
              <option value="New">{t('cond_new')}</option>
              <option value="Excellent">{t('cond_excellent')}</option>
              <option value="Good">{t('cond_good')}</option>
              <option value="Fair">{t('cond_fair')}</option>
              <option value="Poor">{t('cond_poor')}</option>
              <option value="Broken">{t('cond_broken')}</option>
            </select>
          </div>

          {/* Sort By & Direction */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-sub,#B5BDC6)] mb-1">{t('sort_by')}</label>
            <div className="flex gap-1">
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange(prev => ({ ...prev, sortBy: e.target.value as SortField }))}
                className="w-full p-2 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] focus:border-[var(--color-primary-blue,#2563EB)] focus:outline-none transition-colors"
              >
                <option value="created_at">{language === 'hu' ? 'Hozzáadás dátuma' : 'Date Added'}</option>
                <option value="name">{language === 'hu' ? 'Név' : 'Name'}</option>
                <option value="current_value">{language === 'hu' ? 'Érték (Ft)' : 'Value (€)'}</option>
                <option value="purchase_date">{language === 'hu' ? 'Vásárlás dátuma' : 'Purchase Date'}</option>
                <option value="category">{t('category')}</option>
                <option value="location">{t('location')}</option>
              </select>

              <button
                onClick={() => handleFilterChange(prev => ({ ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }))}
                className="p-2 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white hover:border-[var(--color-primary-blue,#2563EB)] transition-colors"
                title="Rendezési irány"
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Clear Filters & Active Filter Count Indicator */}
        {hasActiveFilters && (
          <div className="pt-2 flex items-center justify-between border-t border-[var(--border-color,#56616D)]/60 text-xs">
            <span className="text-[var(--text-sub,#B5BDC6)] font-semibold">
              {language === 'hu'
                ? `Találatok a szűrés alapján: ${totalMatchingCount} / ${totalInventoryCount} tárgy`
                : `Filter results: ${totalMatchingCount} of ${totalInventoryCount} items`}
            </span>
            <button
              onClick={() => {
                resetFilters();
                setCurrentPage(1);
              }}
              className="text-[var(--color-primary-blue,#2563EB)] hover:underline flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {t('clear_filters')}
            </button>
          </div>
        )}
      </div>

      {fetchError && (
        <div className="p-3 rounded-xl border border-rose-800/60 bg-rose-950/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{fetchError}</span>
        </div>
      )}

      {/* ITEMS GRID OR EMPTY STATE */}
      {paginatedItems.length === 0 && !isLoading ? (
        <div className="p-12 sm:p-16 text-center rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] my-8 shadow-sm">
          <Boxes className="h-16 w-16 text-[var(--text-sub,#B5BDC6)]/40 mx-auto mb-4" />
          
          {hasActiveFilters ? (
            <>
              <h2 className="text-xl font-bold text-[var(--text-main,#E0E3E6)]">{t('no_items_found')}</h2>
              <p className="text-sm text-[var(--text-sub,#B5BDC6)] mt-2">
                {language === 'hu' ? 'Próbáld meg módosítani a keresési feltételeket vagy a szűrőket.' : 'Try adjusting your search keywords, category filters, or location parameters.'}
              </p>
              <button
                onClick={() => {
                  resetFilters();
                  setCurrentPage(1);
                }}
                className="mt-6 px-4 py-2.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] font-semibold text-xs inline-flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="h-4 w-4" /> {t('clear_filters')}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-[var(--text-main,#E0E3E6)]">{t('no_items_yet')}</h2>
              <p className="text-sm text-[var(--text-sub,#B5BDC6)] mt-2 max-w-md mx-auto">
                {language === 'hu' ? 'Kezdd el felépíteni a saját tárgynyilvántartásodat egy helyen.' : 'Start building your personal inventory. Keep track of your tools, electronics, books, and valuables in one place.'}
              </p>
              <button
                onClick={handleOpenAdd}
                className="mt-6 px-6 py-3 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-sm inline-flex items-center gap-2 shadow-lg transition-colors"
              >
                <Plus className="h-5 w-5 stroke-[2.5]" /> {t('add_first_thing')}
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Main Grid */}
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 bg-[var(--app-bg,#2D3845)]/40 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-[14px]">
                <div className="p-3 rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] flex items-center gap-2 text-sm text-[var(--text-main,#E0E3E6)] shadow-lg">
                  <Loader2 className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)] animate-spin" />
                  <span>{language === 'hu' ? 'Tárgyak betöltése...' : 'Loading items...'}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {paginatedItems.map(item => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* PAGINATION TOOLBAR */}
          <div className="mt-8 p-4 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-sm">
            {/* Record range indicator */}
            <div className="text-[var(--text-sub,#B5BDC6)] font-medium">
              {language === 'hu'
                ? `Megjelenítve: ${fromRecord}–${toRecord} / ${totalMatchingCount} tárgy`
                : `Showing ${fromRecord}–${toRecord} of ${totalMatchingCount} items`}
            </div>

            {/* Page Navigation & Page Size */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Page Size Selector */}
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-[var(--text-sub,#B5BDC6)] text-[11px] font-semibold">
                  {language === 'hu' ? 'Oldalanként:' : 'Per page:'}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] text-xs font-semibold focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                >
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              {/* Prev Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage <= 1 || isLoading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-bg,#465362)]/80 transition-colors"
                title="Előző oldal"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{language === 'hu' ? 'Előző' : 'Prev'}</span>
              </button>

              {/* Page Number Pills */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = idx + 1;
                  } else if (currentPage <= 3) {
                    pageNum = idx + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + idx;
                  } else {
                    pageNum = currentPage - 2 + idx;
                  }

                  const isActive = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={isLoading}
                      className={`min-w-[32px] h-8 px-2 rounded-lg font-bold text-xs transition-colors ${
                        isActive
                          ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
                          : 'border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]/80'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages || isLoading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-bg,#465362)]/80 transition-colors"
                title="Következő oldal"
              >
                <span className="hidden sm:inline">{language === 'hu' ? 'Következő' : 'Next'}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

      <InsuranceInventoryModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      <CSVModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
      />
    </div>
  );
};
