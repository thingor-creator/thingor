import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { LocationItem } from '../types';
import { uploadFileToStorage, deleteFileFromStorage } from '../lib/storage';
import {
  MapPin,
  Trash2,
  ChevronRight,
  X,
  Upload,
  Loader2,
  Pencil,
  Image as ImageIcon,
  AlertCircle,
  Maximize2,
} from 'lucide-react';

export const LocationsView: React.FC = () => {
  const {
    locations,
    items,
    user,
    isVaultUnlocked,
    addLocation,
    updateLocation,
    deleteLocation,
    isLocationModalOpen,
    setIsLocationModalOpen,
    setCurrentView,
    setFilters,
    getLocationPath,
    openImageViewer,
    language,
    t,
  } = useApp();

  const isHu = language === 'hu';

  // Create location modal state
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [createPhotoFile, setCreatePhotoFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit location & photo modal state
  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editParentId, setEditParentId] = useState<string>('');
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete location confirmation state
  const [deletingLocId, setDeletingLocId] = useState<string | null>(null);

  const createPreviewUrl = useMemo(() => {
    if (!createPhotoFile) return null;
    return URL.createObjectURL(createPhotoFile);
  }, [createPhotoFile]);

  const editPreviewUrl = useMemo(() => {
    if (!editPhotoFile) return null;
    return URL.createObjectURL(editPhotoFile);
  }, [editPhotoFile]);

  const resetCreateModal = () => {
    setName('');
    setParentId('');
    setCreatePhotoFile(null);
    setCreateError(null);
    setIsCreating(false);
  };

  const handleCloseCreateModal = () => {
    if (isCreating) return;
    resetCreateModal();
    setIsLocationModalOpen(false);
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isCreating) return;

    // Check duplicate location name (case-insensitive)
    const isDuplicate = locations.some(
      (l) => l.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setCreateError(
        isHu
          ? 'Már lézezik ilyen nevű helyszín! Kérjük, adj meg más nevet.'
          : 'A location with this name already exists! Please enter a different name.'
      );
      return;
    }

    setCreateError(null);
    setIsCreating(true);

    try {
      let uploadedPhotoUrl: string | null = null;

      if (createPhotoFile) {
        const res = await uploadFileToStorage(
          createPhotoFile,
          'photos',
          user?.id || 'anonymous'
        );
        if (res.error || (!res.signedUrl && !res.path)) {
          setCreateError(
            res.error ||
              (isHu
                ? 'A helyszínkép feltöltése sikertelen volt. Kérjük, próbáld újra.'
                : 'Location image upload failed. Please try again.')
          );
          setIsCreating(false);
          return;
        }
        uploadedPhotoUrl = res.signedUrl || res.path || null;
      }

      await addLocation(trimmed, parentId || null, uploadedPhotoUrl);
      resetCreateModal();
      setIsLocationModalOpen(false);
    } catch (err: any) {
      setCreateError(
        err?.message ||
          (isHu
            ? 'Váratlan hiba történt a helyszín létrehozásakor.'
            : 'Unexpected error while creating location.')
      );
      setIsCreating(false);
    }
  };

  const handleOpenEditLocation = (loc: LocationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLocation(loc);
    setEditName(loc.name);
    setEditParentId(loc.parent_id || '');
    setEditPhotoFile(null);
    setEditError(null);
    setIsSavingEdit(false);
    setIsDeletingPhoto(false);
  };

  const handleCloseEditModal = () => {
    if (isSavingEdit || isDeletingPhoto) return;
    setEditingLocation(null);
    setEditPhotoFile(null);
    setEditError(null);
  };

  // Prevent circular parent assignment when editing location hierarchy
  const getDescendantIds = (rootId: string): Set<string> => {
    const descendants = new Set<string>();
    const queue = [rootId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      descendants.add(current);
      locations
        .filter((l) => l.parent_id === current)
        .forEach((child) => {
          if (!descendants.has(child.id)) {
            queue.push(child.id);
          }
        });
    }
    return descendants;
  };

  const handleSaveEditLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation || isSavingEdit || isDeletingPhoto) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError(
        isHu ? 'A helyszín neve nem lehet üres.' : 'Location name cannot be empty.'
      );
      return;
    }

    const isDuplicate = locations.some(
      (l) =>
        l.id !== editingLocation.id &&
        l.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setEditError(
        isHu
          ? 'Már létezik ilyen nevű helyszín! Kérjük, adj meg más nevet.'
          : 'A location with this name already exists! Please enter a different name.'
      );
      return;
    }

    setEditError(null);
    setIsSavingEdit(true);

    const oldPhotoUrl = editingLocation.photo_url || null;
    let nextPhotoUrl: string | null = oldPhotoUrl;
    let newlyUploadedUrl: string | null = null;

    try {
      // 1. Upload new photo to R2 first before modifying DB or deleting old photo
      if (editPhotoFile) {
        const res = await uploadFileToStorage(
          editPhotoFile,
          'photos',
          user?.id || 'anonymous'
        );
        if (res.error || (!res.signedUrl && !res.path)) {
          setEditError(
            res.error ||
              (isHu
                ? 'Az új kép feltöltése sikertelen volt. A korábbi kép megmaradt.'
                : 'Failed to upload new image. Previous image was preserved.')
          );
          setIsSavingEdit(false);
          return;
        }
        newlyUploadedUrl = res.signedUrl || res.path || null;
        nextPhotoUrl = newlyUploadedUrl;
      }

      // 2. Save updated location to DB
      const ok = await updateLocation(editingLocation.id, {
        name: trimmedName,
        parent_id: editParentId || null,
        photo_url: nextPhotoUrl,
      });

      if (!ok) {
        if (newlyUploadedUrl) {
          deleteFileFromStorage(newlyUploadedUrl).catch(() => {});
        }
        setEditError(
          isHu
            ? 'A módosítások mentése sikertelen volt. A korábbi adatok megmaradtak.'
            : 'Failed to save changes. Previous data was preserved.'
        );
        setIsSavingEdit(false);
        return;
      }

      // 3. Only after new upload AND DB save succeeded, remove replaced old R2 file
      if (newlyUploadedUrl && oldPhotoUrl && oldPhotoUrl !== newlyUploadedUrl) {
        deleteFileFromStorage(oldPhotoUrl).catch(() => {});
      }

      setIsSavingEdit(false);
      setEditingLocation(null);
      setEditPhotoFile(null);
    } catch (err: any) {
      setEditError(
        err?.message ||
          (isHu ? 'Hiba történt a mentés során.' : 'An error occurred while saving.')
      );
      setIsSavingEdit(false);
    }
  };

  const handleRemoveLocationPhotoOnly = async () => {
    if (!editingLocation || !editingLocation.photo_url || isDeletingPhoto || isSavingEdit) {
      return;
    }

    setEditError(null);
    setIsDeletingPhoto(true);
    const oldPhotoUrl = editingLocation.photo_url;

    try {
      const ok = await updateLocation(editingLocation.id, { photo_url: null });
      if (!ok) {
        setEditError(
          isHu
            ? 'A kép eltávolítása sikertelen volt.'
            : 'Failed to remove location image.'
        );
        setIsDeletingPhoto(false);
        return;
      }

      if (oldPhotoUrl) {
        deleteFileFromStorage(oldPhotoUrl).catch(() => {});
      }

      setEditingLocation((prev) => (prev ? { ...prev, photo_url: null } : null));
      setEditPhotoFile(null);
      setIsDeletingPhoto(false);
    } catch (err: any) {
      setEditError(
        err?.message ||
          (isHu ? 'Hiba történt a kép törlésekor.' : 'Error while removing image.')
      );
      setIsDeletingPhoto(false);
    }
  };

  const handleSelectLocationFilter = (locId: string) => {
    setFilters((prev) => ({ ...prev, locationId: locId }));
    setCurrentView('items');
  };

  // Group root locations vs children
  const rootLocations = locations.filter((l) => !l.parent_id);

  const renderLocationBranch = (loc: LocationItem, depth = 0) => {
    const children = locations.filter((l) => l.parent_id === loc.id);
    const locItems = items.filter(
      (i) => i.location_id === loc.id && (isVaultUnlocked || !i.is_vault_protected)
    );
    const totalItemCount = locItems.length;
    const totalVal = locItems.reduce(
      (s, i) => s + (i.current_value ?? i.purchase_price ?? 0),
      0
    );
    const isDeleting = deletingLocId === loc.id;

    return (
      <div key={loc.id} className="space-y-2">
        <div
          className={`group flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] hover:border-[var(--color-primary-blue,#2563EB)]/60 transition-all ${
            depth > 0
              ? 'ml-6 sm:ml-8 border-l-2 border-l-[var(--color-primary-blue,#2563EB)]'
              : ''
          }`}
        >
          <div
            onClick={() => handleSelectLocationFilter(loc.id)}
            className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 pr-3"
          >
            {loc.photo_url ? (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  openImageViewer({
                    urls: [loc.photo_url!],
                    title: loc.name,
                  });
                }}
                title={isHu ? 'Helyszínkép nagyítása' : 'View larger location image'}
                className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] shrink-0 group/img"
              >
                <img
                  src={loc.photo_url}
                  alt={loc.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            ) : (
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] group-hover:bg-[var(--color-primary-blue,#2563EB)] group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--text-main,#E0E3E6)] group-hover:text-[var(--color-primary-blue,#2563EB)] transition-colors truncate">
                  {loc.name}
                </h3>
                {depth === 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] shrink-0">
                    {isHu ? 'Fő Helyszín' : 'Root Area'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] truncate">
                {getLocationPath(loc.id)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="text-right">
              <span className="text-xs font-bold text-[var(--text-main,#E0E3E6)] block">
                {totalItemCount} {isHu ? 'tárgy' : 'items'}
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">
                {isHu
                  ? `${totalVal.toLocaleString('hu-HU')} Ft`
                  : `€${totalVal.toLocaleString('en-US')}`}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => handleOpenEditLocation(loc, e)}
              className="p-1.5 rounded-lg bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--color-primary-blue,#2563EB)] transition-colors cursor-pointer"
              title={
                isHu
                  ? 'Helyszín képe és szerkesztése'
                  : 'Edit location & image'
              }
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectLocationFilter(loc.id);
              }}
              className="p-1.5 rounded-lg bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--color-primary-blue,#2563EB)] transition-colors cursor-pointer"
              title={
                isHu
                  ? 'Tárgyak megtekintése ezen a helyszínen'
                  : 'View items in location'
              }
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {isDeleting ? (
              <div
                className="flex items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[11px] text-rose-400 font-semibold">
                  {isHu ? 'Törlöd?' : 'Delete?'}
                </span>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await deleteLocation(loc.id);
                    setDeletingLocId(null);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer"
                >
                  {isHu ? 'Igen' : 'Yes'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingLocId(null);
                  }}
                  className="px-2 py-1 text-[11px] bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] rounded-lg transition-colors cursor-pointer"
                >
                  {isHu ? 'Mégse' : 'No'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingLocId(loc.id);
                }}
                className="p-1.5 rounded-lg text-[var(--text-sub,#B5BDC6)] hover:text-rose-400 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
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
            {children.map((child) => renderLocationBranch(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const forbiddenParentIds = editingLocation
    ? getDescendantIds(editingLocation.id)
    : new Set<string>();

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
              ? 'Rendszerezd a fizikai tereket hierarchiába (Otthon → Garázs → Műhely), és adj hozzájuk helyszínfotókat a gyors tájékozódáshoz.'
              : 'Organize physical spaces into a multi-level hierarchy and attach location photos for visual orientation.'}
          </p>
        </div>

        <button
          onClick={() => {
            resetCreateModal();
            setIsLocationModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02] cursor-pointer"
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
              <button
                type="button"
                onClick={handleCloseCreateModal}
                className="text-[var(--text-sub,#B5BDC6)] hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-4 text-xs">
              {createError && (
                <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/60 text-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-[var(--text-sub,#B5BDC6)] font-semibold mb-1">
                  {isHu ? 'Helyszín Neve *' : 'Location Name *'}
                </label>
                <input
                  type="text"
                  placeholder={
                    isHu
                      ? 'pl. Garázs, Műhely, Raktár, Pince, Padlás, Iroda'
                      : 'e.g. Garage, Workshop, Storage, Basement, Office'
                  }
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
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {getLocationPath(loc.id)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Image Upload (Optional) */}
              <div className="space-y-2">
                <label className="block text-[var(--text-sub,#B5BDC6)] font-semibold">
                  {isHu ? 'Helyszín képe (opcionális)' : 'Location Photo (optional)'}
                </label>

                <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)]/60">
                  <div className="w-14 h-14 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] flex items-center justify-center overflow-hidden shrink-0">
                    {createPreviewUrl ? (
                      <img
                        src={createPreviewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-[var(--text-sub,#B5BDC6)]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold text-xs cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {createPhotoFile
                            ? isHu
                              ? 'Másik kép választása'
                              : 'Change Image'
                            : isHu
                            ? 'Kép kiválasztása'
                            : 'Select Image'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            if (f) {
                              setCreatePhotoFile(f);
                              setCreateError(null);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>

                      {createPhotoFile && (
                        <button
                          type="button"
                          onClick={() => setCreatePhotoFile(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold text-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isHu ? 'Eltávolítás' : 'Remove'}</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] truncate">
                      {createPhotoFile
                        ? createPhotoFile.name
                        : isHu
                        ? 'Fotó a helyiségről vagy szekrényről (automatikus WebP)'
                        : 'Photo of the room or cabinet (automatic WebP)'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={handleCloseCreateModal}
                  className="px-3 py-2 text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isHu ? 'Mégse' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 font-bold bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {isCreating
                      ? isHu
                        ? 'Feltöltés és mentés...'
                        : 'Uploading & saving...'
                      : isHu
                      ? 'Helyszín Létrehozása'
                      : 'Create Location'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LOCATION & PHOTO MODAL */}
      {editingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color,#56616D)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                <Pencil className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)]" />
                {isHu ? 'Helyszín és kép szerkesztése' : 'Edit Location & Photo'}
              </h3>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="text-[var(--text-sub,#B5BDC6)] hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLocation} className="space-y-4 text-xs">
              {editError && (
                <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/60 text-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-[var(--text-sub,#B5BDC6)] font-semibold mb-1">
                  {isHu ? 'Helyszín Neve *' : 'Location Name *'}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    if (editError) setEditError(null);
                  }}
                  required
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] text-sm focus:border-[var(--color-primary-blue,#2563EB)] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[var(--text-sub,#B5BDC6)] font-semibold mb-1">
                  {isHu ? 'Szülő Helyszín (Opcionális)' : 'Parent Location (Optional)'}
                </label>
                <select
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] text-sm focus:border-[var(--color-primary-blue,#2563EB)] focus:outline-none transition-colors"
                >
                  <option value="">
                    {isHu
                      ? 'Nincs (Fő helyszín / terület)'
                      : 'None (Top-level area)'}
                  </option>
                  {locations
                    .filter((loc) => !forbiddenParentIds.has(loc.id))
                    .map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {getLocationPath(loc.id)}
                      </option>
                    ))}
                </select>
              </div>

              {/* Location Photo Management */}
              <div className="space-y-2">
                <label className="block text-[var(--text-sub,#B5BDC6)] font-semibold">
                  {isHu ? 'Helyszín képe' : 'Location Photo'}
                </label>

                <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)]/60">
                  <div className="w-16 h-16 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] flex items-center justify-center overflow-hidden shrink-0">
                    {editPreviewUrl || editingLocation.photo_url ? (
                      <img
                        src={editPreviewUrl || editingLocation.photo_url || ''}
                        alt={editName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <MapPin className="w-6 h-6 text-[var(--color-primary-blue,#2563EB)]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold text-xs cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {editingLocation.photo_url || editPhotoFile
                            ? isHu
                              ? 'Kép cseréje'
                              : 'Replace Image'
                            : isHu
                            ? 'Kép feltöltése'
                            : 'Upload Image'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            if (f) {
                              setEditPhotoFile(f);
                              setEditError(null);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>

                      {editPhotoFile && (
                        <button
                          type="button"
                          onClick={() => setEditPhotoFile(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--card-bg,#3A4551)] hover:bg-[var(--card-bg,#3A4551)]/80 text-[var(--text-sub,#B5BDC6)] border border-[var(--border-color,#56616D)] font-semibold text-xs cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{isHu ? 'Új kép elvetése' : 'Discard new'}</span>
                        </button>
                      )}

                      {editingLocation.photo_url && !editPhotoFile && (
                        <button
                          type="button"
                          disabled={isDeletingPhoto || isSavingEdit}
                          onClick={handleRemoveLocationPhotoOnly}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold text-xs cursor-pointer disabled:opacity-50"
                        >
                          {isDeletingPhoto ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>{isHu ? 'Kép törlése' : 'Delete Image'}</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] truncate">
                      {editPhotoFile
                        ? `${isHu ? 'Kiválasztva:' : 'Selected:'} ${editPhotoFile.name}`
                        : editingLocation.photo_url
                        ? isHu
                          ? 'Jelenleg egyedi helyszínkép van beállítva.'
                          : 'A custom location image is currently assigned.'
                        : isHu
                        ? 'Nincs feltöltött kép (alapértelmezett ikon jelenik meg).'
                        : 'No uploaded image (default icon is shown).'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isSavingEdit || isDeletingPhoto}
                  onClick={handleCloseEditModal}
                  className="px-3 py-2 text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isHu ? 'Mégse' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || isDeletingPhoto}
                  className="px-5 py-2 font-bold bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSavingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {isSavingEdit
                      ? isHu
                        ? 'Mentés folyamatban...'
                        : 'Saving...'
                      : isHu
                      ? 'Módosítások mentése'
                      : 'Save Changes'}
                  </span>
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
          rootLocations.map((root) => renderLocationBranch(root))
        )}
      </div>
    </div>
  );
};
