import React from 'react';
import { useApp } from '../context/AppContext';
import { ItemCard } from './ItemCard';
import type { SortField } from '../types';
import {
  Search,
  Plus,
  ArrowUpDown,
  Boxes,
  X,
  RotateCcw
} from 'lucide-react';

export const ItemsView: React.FC = () => {
  const {
    items,
    categories,
    locations,
    filters,
    setFilters,
    resetFilters,
    setIsAddEditItemModalOpen,
    setEditingItem,
    getLocationPath,
    getCategoryName,
    t,
    language,
  } = useApp();

  // Search & Filter Logic across name, description, category, location
  const filteredItems = items.filter(item => {
    // 1. Search term match
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      const nameMatch = item.name.toLowerCase().includes(q);
      const descMatch = item.description?.toLowerCase().includes(q) || false;
      const catMatch = getCategoryName(item.category_id).toLowerCase().includes(q);
      const locMatch = getLocationPath(item.location_id).toLowerCase().includes(q);
      
      if (!nameMatch && !descMatch && !catMatch && !locMatch) {
        return false;
      }
    }

    // 2. Category filter
    if (filters.categoryId !== 'all' && item.category_id !== filters.categoryId) {
      return false;
    }

    // 3. Location filter
    if (filters.locationId !== 'all' && item.location_id !== filters.locationId) {
      return false;
    }

    // 4. Condition filter
    if (filters.condition !== 'all' && item.condition !== filters.condition) {
      return false;
    }

    return true;
  });

  // Sorting logic
  const sortedItems = [...filteredItems].sort((a, b) => {
    let comparison = 0;

    switch (filters.sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'purchase_date':
        comparison = (a.purchase_date || '').localeCompare(b.purchase_date || '');
        break;
      case 'current_value':
        const valA = a.current_value ?? a.purchase_price ?? 0;
        const valB = b.current_value ?? b.purchase_price ?? 0;
        comparison = valA - valB;
        break;
      case 'category':
        comparison = getCategoryName(a.category_id).localeCompare(getCategoryName(b.category_id));
        break;
      case 'location':
        comparison = getLocationPath(a.location_id).localeCompare(getLocationPath(b.location_id));
        break;
      case 'created_at':
      default:
        comparison = a.created_at.localeCompare(b.created_at);
        break;
    }

    return filters.sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsAddEditItemModalOpen(true);
  };

  const hasActiveFilters =
    filters.search ||
    filters.categoryId !== 'all' ||
    filters.locationId !== 'all' ||
    filters.condition !== 'all';

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t('my_things')}
            </h1>
            <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-emerald-400 font-bold text-xs">
              {items.length} {language === 'hu' ? 'tárgy' : 'items'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {language === 'hu'
              ? 'Keresd, szűrd és kezeld a teljes fizikai tárgynyilvántartásodat.'
              : 'Search, filter, and manage your complete physical object inventory.'}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md shadow-emerald-950/40 transition-all hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          {t('add_thing')}
        </button>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-4">
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns & Sorting */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          
          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">{t('category')}</label>
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
              className="w-full p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">{t('all_categories')}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{getCategoryName(cat.id)}</option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">{t('location')}</label>
            <select
              value={filters.locationId}
              onChange={(e) => setFilters(prev => ({ ...prev, locationId: e.target.value }))}
              className="w-full p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:border-emerald-500 focus:outline-none"
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
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">{t('condition')}</label>
            <select
              value={filters.condition}
              onChange={(e) => setFilters(prev => ({ ...prev, condition: e.target.value }))}
              className="w-full p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:border-emerald-500 focus:outline-none"
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

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">{t('sort_by')}</label>
            <div className="flex gap-1">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as SortField }))}
                className="w-full p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="created_at">{language === 'hu' ? 'Hozzáadás dátuma' : 'Date Added'}</option>
                <option value="name">{language === 'hu' ? 'Név' : 'Name'}</option>
                <option value="current_value">{language === 'hu' ? 'Érték (€)' : 'Value (€)'}</option>
                <option value="purchase_date">{language === 'hu' ? 'Vásárlás dátuma' : 'Purchase Date'}</option>
                <option value="category">{t('category')}</option>
                <option value="location">{t('location')}</option>
              </select>

              <button
                onClick={() => setFilters(prev => ({ ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }))}
                className="p-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700"
                title="Rendezési irány"
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-xs">
            <span className="text-slate-400">
              {language === 'hu' ? `Megjelenítve: ${sortedItems.length} / ${items.length} tárgy` : `Showing ${sortedItems.length} of ${items.length} items`}
            </span>
            <button
              onClick={resetFilters}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {t('clear_filters')}
            </button>
          </div>
        )}
      </div>

      {/* ITEMS GRID OR EMPTY STATE */}
      {sortedItems.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border border-slate-800 bg-slate-900/40 my-8">
          <Boxes className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          
          {hasActiveFilters ? (
            <>
              <h2 className="text-xl font-bold text-white">{t('no_items_found')}</h2>
              <p className="text-sm text-slate-400 mt-2">
                {language === 'hu' ? 'Próbáld meg módosítani a keresési feltételeket vagy a szűrőket.' : 'Try adjusting your search keywords, category filters, or location parameters.'}
              </p>
              <button
                onClick={resetFilters}
                className="mt-6 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 font-semibold text-xs inline-flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" /> {t('clear_filters')}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white">{t('no_items_yet')}</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                {language === 'hu' ? 'Kezdd el felépíteni a saját tárgynyilvántartásodat egy helyen.' : 'Start building your personal inventory. Keep track of your tools, electronics, books, and valuables in one place.'}
              </p>
              <button
                onClick={handleOpenAdd}
                className="mt-6 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm inline-flex items-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                <Plus className="h-5 w-5 stroke-[2.5]" /> {t('add_first_thing')}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sortedItems.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

    </div>
  );
};
