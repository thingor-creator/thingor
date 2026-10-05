import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { LocationItem } from '../types';
import {
  MapPin,
  Plus,
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

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await addLocation(name, parentId || null);
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

    return (
      <div key={loc.id} className="space-y-2">
        <div
          className={`group flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-900/90 hover:border-slate-700 transition-all ${
            depth > 0 ? 'ml-6 sm:ml-8 border-l-2 border-l-emerald-500/60' : ''
          }`}
        >
          <div
            onClick={() => handleSelectLocationFilter(loc.id)}
            className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 pr-3"
          >
            <div className="p-2 rounded-lg bg-slate-950 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                  {loc.name}
                </h3>
                {depth === 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {isHu ? 'Fő Helyszín' : 'Root Area'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {getLocationPath(loc.id)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-white block">
                {totalItemCount} {isHu ? 'tárgy' : 'items'}
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">€{totalVal}</span>
            </div>

            <button
              onClick={() => handleSelectLocationFilter(loc.id)}
              className="p-1.5 rounded-lg bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800"
              title={isHu ? 'Tárgyak megtekintése ezen a helyszínen' : 'View items in location'}
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => deleteLocation(loc.id)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
              title={isHu ? 'Helyszín törlése' : 'Delete location'}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t('locations')}
            </h1>
            <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-emerald-400 font-bold text-xs">
              {locations.length} {isHu ? 'tárolási helyszín' : 'storage spots'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {isHu
              ? 'Rendszerezd a fizikai tereket több-szintű hierarchiába: Otthon → Garázs → Műhely → Szerszámos szekrény.'
              : 'Organize physical spaces into multi-level hierarchy: Home → Garage → Workshop → Cabinet.'}
          </p>
        </div>

        <button
          onClick={() => setIsLocationModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md shadow-emerald-950/40 transition-all hover:scale-[1.02]"
        >
          {isHu ? 'Helyszín Hozzáadása' : 'Add Location'}
        </button>
      </div>

      {/* CREATE LOCATION MODAL */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-400" />
                {isHu ? 'Új Helyszín Hozzáadása' : 'Add New Location Spot'}
              </h3>
              <button onClick={() => setIsLocationModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {isHu ? 'Helyszín Neve *' : 'Location Name *'}
                </label>
                <input
                  type="text"
                  placeholder={isHu ? 'pl. Garázs, Műhely, Szerszámos szekrény' : 'e.g. Garage, Workshop, Tool Cabinet'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 text-sm focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {isHu ? 'Szülő Helyszín (Opcionális)' : 'Parent Location (Optional)'}
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-sm focus:border-emerald-500"
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
                  className="px-3 py-2 text-slate-400 hover:text-white font-semibold"
                >
                  {isHu ? 'Mégse' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-emerald-500 text-slate-950 rounded-xl"
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
          <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-400 text-xs">
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
