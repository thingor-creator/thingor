import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { LocationItem } from '../types';
import {
  MapPin,
  Trash2,
  ChevronRight,
  X
} from 'lucide-react';

export const LocationsView: React.FC = () => {
  const {
    locations,
    items,
    addLocation,
    deleteLocation,
    isLocationModalOpen,
    setIsLocationModalOpen,
    setCurrentView,
    setFilters,
    getLocationPath,
    language,
    t
  } = useApp();

  const isHu = language === 'hu';

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [deletingLocId, setDeletingLocId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    // Check duplicate location name (case-insensitive)
    const isDuplicate = locations.some(l => l.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      setCreateError(
        isHu
          ? 'Már létezik ilyen nevű helyszín! Kérjük, adj meg más nevet.'
          : 'A location with this name already exists! Please enter a different name.'
      );
      return;
    }

    setCreateError(null);
    await addLocation(trimmed, parentId || null);
    setName('');
    setParentId('');
    setIsLocationModalOpen(false);
  };

  const handleSelectLocationFilter = (locId: string) => {
    setFilters(prev => ({ ...prev, locationId: locId }));
    setCurrentView('items');
  };

  // Group root locations vs children
  const rootLocations = locations.filter(l => !l.parent_id);

  const renderLocationBranch = (loc: LocationItem, depth = 0) => {
    const children = locations.filter(l => l.parent_id === loc.id);
    const locItems = items.filter(i => i.location_id === loc.id);
    const totalItemCount = locItems.length;
    const totalVal = locItems.reduce((s, i) => s + (i.current_value ?? i.purchase_price ?? 0), 0);
    const isDeleting = deletingLocId === loc.id;

    return (
      <div key={loc.id} className="space-y-2">
        <div
          className={`group flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] hover:border-[var(--color-primary-blue,#2563EB)]/60 transition-all ${
            depth > 0 ? 'ml-6 sm:ml-8 border-l-2 border-l-[var(--color-primary-blue,#2563EB)]' : ''
          }`}
        >
          <div
            onClick={() => handleSelectLocationFilter(loc.id)}
            className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 pr-3"
          >
            <div className="p-2 rounded-lg bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] group-hover:bg-[var(--color-primary-blue,#2563EB)] group-hover:text-white transition-colors">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--text-main,#E0E3E6)] group-hover:text-[var(--color-primary-blue,#2563EB)] transition-colors truncate">
                  {loc.name}
                </h3>
                {depth === 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)]">
                    {isHu ? 'Fő Helyszín' : 'Root Area'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] truncate">
                {getLocationPath(loc.id)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-[var(--text-main,#E0E3E6)] block">
                {totalItemCount} {isHu ? 'tárgy' : 'items'}
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">{isHu ? `${totalVal.toLocaleString('hu-HU')} Ft` : `€${totalVal.toLocaleString('en-US')}`}</span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSelectLocationFilter(loc.id);
              }}
              className="p-1.5 rounded-lg bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--color-primary-blue,#2563EB)] transition-colors"
              title={isHu ? 'Tárgyak megtekintése ezen a helyszínen' : 'View items in location'}
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {isDeleting ? (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <span className="text-[11px] text-rose-400 font-semibold">{isHu ? 'Törlöd?' : 'Delete?'}</span>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await deleteLocation(loc.id);
                    setDeletingLocId(null);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors"
                >
                  {isHu ? 'Igen' : 'Yes'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingLocId(null);
                  }}
                  className="px-2 py-1 text-[11px] bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] rounded-lg transition-colors"
                >
                  {isHu ? 'Mégse' : 'No'}
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingLocId(loc.id);
                }}
                className="p-1.5 rounded-lg text-[var(--text-sub,#B5BDC6)] hover:text-rose-400 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                title={isHu ? 'Helyszín törlése' : 'Delete location'}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Render child locations */}
        {children.length > 0 && (
          <div className="space-y-2">
            {children.map(child => renderLocationBranch(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color,#56616D)] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main,#E0E3E6)] tracking-tight">
              {t('locations')}
            </h1>
            <span className="px-3 py-1 rounded-full bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--color-primary-blue,#2563EB)] font-bold text-xs">
              {locations.length} {isHu ? 'tárolási helyszín' : 'storage spots'}
            </span>
          </div>
          <p className="text-sm text-[var(--text-sub,#B5BDC6)] mt-1">
            {isHu
              ? 'Rendszerezd a fizikai tereket több-szintű hierarchiába: Otthon → Garázs → Műhely → Szerszámos szekrény.'
              : 'Organize physical spaces into multi-level hierarchy: Home → Garage → Workshop → Cabinet.'}
          </p>
        </div>

        <button
          onClick={() => setIsLocationModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02]"
        >
          {isHu ? 'Helyszín Hozzáadása' : 'Add Location'}
        </button>
      </div>

      {/* CREATE LOCATION MODAL */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color,#56616D)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[var(--color-primary-blue,#2563EB)]" />
                {isHu ? 'Új Helyszín Hozzáadása' : 'Add New Location Spot'}
              </h3>
              <button onClick={() => setIsLocationModalOpen(false)} className="text-[var(--text-sub,#B5BDC6)] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-4 text-xs">
              {createError && (
                <div className="p-3 rounded-xl border border-rose-800/80 bg-rose-950/60 text-rose-300 text-xs font-semibold">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-[var(--text-sub,#B5BDC6)] font-semibold mb-1">
                  {isHu ? 'Helyszín Neve *' : 'Location Name *'}
                </label>
                <input
                  type="text"
                  placeholder={isHu ? 'pl. Garázs, Műhely, Szerszámos szekrény' : 'e.g. Garage, Workshop, Tool Cabinet'}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (createError) setCreateError(null);
                  }}
                  required
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] text-sm focus:border-[var(--color-primary-blue,#2563EB)] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[var(--text-sub,#B5BDC6)] font-semibold mb-1">
                  {isHu ? 'Szülő Helyszín (Opcionális)' : 'Parent Location (Optional)'}
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] text-sm focus:border-[var(--color-primary-blue,#2563EB)] focus:outline-none transition-colors"
                >
                  <option value="">
                    {isHu
                      ? 'Nincs (Fő helyszín / terület, pl. Otthon, Iroda)'
                      : 'None (Top-level area, e.g. Home, Office)'}
                  </option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {getLocationPath(loc.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="px-3 py-2 text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] font-semibold"
                >
                  {isHu ? 'Mégse' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white rounded-xl shadow-md transition-colors"
                >
                  {isHu ? 'Helyszín Létrehozása' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOCATIONS TREE DISPLAY */}
      <div className="space-y-4">
        {rootLocations.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)]/40 text-[var(--text-sub,#B5BDC6)] text-xs">
            {isHu
              ? 'Még nincsenek létrehozott helyszínek. Kattints a "+ Helyszín Hozzáadása" gombra a helyiségek és szekrények felvételéhez.'
              : 'No locations created yet. Click "Add Location" to start mapping your rooms and cabinets.'}
          </div>
        ) : (
          rootLocations.map(root => renderLocationBranch(root))
        )}
      </div>

    </div>
  );
};
