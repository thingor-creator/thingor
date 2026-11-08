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
  Plus,
  CornerDownRight,
  Layers,
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
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({});

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

      // 2. Validate hierarchy and save updated location to DB
      if (editParentId) {
        if (editParentId === editingLocation.id || getDescendantIds(editingLocation.id).has(editParentId)) {
          setEditError(
            isHu
              ? 'Körkörös hierarchia nem hozható létre! A helyszín nem lehet saját maga vagy saját leszármazottja szülője.'
              : 'Circular hierarchy cannot be created! A location cannot be a child of itself or its descendants.'
          );
          setIsSavingEdit(false);
          return;
        }
      }

      const updatesPayload: { name: string; parent_id: string | null; photo_url?: string | null } = {
        name: trimmedName,
        parent_id: editParentId && editParentId !== '' ? editParentId : null,
      };
      if (editPhotoFile || nextPhotoUrl !== oldPhotoUrl) {
        updatesPayload.photo_url = nextPhotoUrl;
      }

      const ok = await updateLocation(editingLocation.id, updatesPayload);

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

      setFailedImageIds((prev) => {
        if (!prev[editingLocation.id]) return prev;
        const next = { ...prev };
        delete next[editingLocation.id];
        return next;
      });
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

  const handleOpenAddSubLocation = (parentLocId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    resetCreateModal();
    setParentId(parentLocId);
    setIsLocationModalOpen(true);
  };

  // Group root locations vs children
  const rootLocations = locations.filter((l) => !l.parent_id);

  const renderLocationCard = (loc: LocationItem, depth = 0, childCount = 0) => {
    const parentLoc = loc.parent_id
      ? locations.find((l) => l.id === loc.parent_id) || null
      : null;
    const locItems = items.filter(
      (i) => i.location_id === loc.id && (isVaultUnlocked || !i.is_vault_protected)
    );
    const totalItemCount = locItems.length;
    const isDeleting = deletingLocId === loc.id;
    const isRoot = depth === 0;

    const imageHeightClass = isRoot
      ? 'h-48 sm:h-52'
      : depth === 1
      ? 'h-36 sm:h-40'
      : 'h-32 sm:h-36';

    const hasValidPhoto = Boolean(
      loc.photo_url && loc.photo_url.trim() !== '' && !failedImageIds[loc.id]
    );

    const levelBadgeLabel = isRoot
      ? isHu
        ? 'Fő helyszín'
        : 'Main Location'
      : depth === 1
      ? isHu
        ? 'Alhelyszín'
        : 'Sub-location'
      : isHu
      ? `${depth}. szintű alhelyszín`
      : `Level ${depth} Sub-location`;

    return (
      <div
        onClick={() => handleSelectLocationFilter(loc.id)}
        data-location-id={loc.id}
        data-depth={depth}
        className={`group location-card relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 cursor-pointer ${
          isRoot
            ? 'bg-[var(--card-bg,#3A4551)] border-[var(--border-color,#56616D)] hover:border-[var(--color-primary-blue,#2563EB)] shadow-lg hover:shadow-xl'
            : 'bg-[var(--card-bg,#3A4551)]/90 border-[var(--border-color,#56616D)]/80 hover:border-[var(--color-primary-blue,#2563EB)]/80 shadow-md hover:shadow-lg'
        }`}
      >
        {/* Prominent Image Header */}
        <div className={`relative w-full ${imageHeightClass} overflow-hidden bg-[var(--surface-bg,#465362)] shrink-0`}>
          {hasValidPhoto ? (
            <>
              <img
                src={loc.photo_url!}
                alt={loc.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onError={() => {
                  setFailedImageIds((prev) => ({ ...prev, [loc.id]: true }));
                }}
              />
              <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950/75 to-transparent pointer-events-none" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openImageViewer({
                    urls: [loc.photo_url!],
                    title: loc.name,
                  });
                }}
                title={isHu ? 'Helyszínkép nagyítása' : 'View larger location image'}
                className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg bg-slate-900/70 hover:bg-[var(--color-primary-blue,#2563EB)] text-white/90 hover:text-white border border-white/15 backdrop-blur-sm transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-br from-[#465362] via-[#3A4551] to-[#2B333C] overflow-hidden">
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.35) 1px, transparent 0)',
                  backgroundSize: '18px 18px',
                }}
              />
              <div
                className={`${
                  isRoot ? 'w-14 h-14 rounded-2xl' : 'w-11 h-11 rounded-xl'
                } bg-[var(--card-bg,#3A4551)]/90 border border-[var(--border-color,#56616D)] text-[var(--color-primary-blue,#2563EB)] group-hover:bg-[var(--color-primary-blue,#2563EB)] group-hover:text-white group-hover:border-blue-400/50 transition-all duration-200 flex items-center justify-center shadow-inner`}
              >
                <MapPin className={isRoot ? 'w-6 h-6' : 'w-5 h-5'} />
              </div>
              <span className="mt-2 text-[11px] font-medium text-[var(--text-sub,#B5BDC6)]/80">
                {isHu ? 'Nincs feltöltött helyszínkép' : 'No location photo'}
              </span>
            </div>
          )}

          {/* Top-left hierarchy badge */}
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 flex-wrap pr-10">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg backdrop-blur-md border shadow-sm ${
                isRoot
                  ? 'bg-[var(--color-primary-blue,#2563EB)]/90 text-white border-blue-400/40'
                  : 'bg-slate-900/80 text-[var(--text-main,#E0E3E6)] border-white/15'
              }`}
            >
              {isRoot ? (
                <MapPin className="w-3 h-3 shrink-0" />
              ) : (
                <CornerDownRight className="w-3 h-3 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
              )}
              <span>{levelBadgeLabel}</span>
            </span>
          </div>

          {/* Bottom-left secondary badges over image */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between gap-2 pointer-events-none">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-900/75 text-[11px] font-semibold text-[var(--text-main,#E0E3E6)] border border-white/10 backdrop-blur-sm">
              {totalItemCount} {isHu ? 'tárgy' : 'items'}
            </span>

            {childCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-900/75 text-[11px] font-semibold text-blue-300 border border-blue-400/20 backdrop-blur-sm">
                <Layers className="w-3 h-3" />
                <span>
                  {childCount} {isHu ? 'alhelyszín' : 'sub-spots'}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Card Content & Actions */}
        <div className="flex-1 flex flex-col justify-between p-3.5 sm:p-4 gap-3">
          <div className="min-w-0 space-y-1">
            <h3
              className={`${
                isRoot ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
              } font-extrabold text-[var(--text-main,#E0E3E6)] group-hover:text-[var(--color-primary-blue,#2563EB)] transition-colors truncate`}
            >
              {loc.name}
            </h3>

            {parentLoc ? (
              <div className="space-y-0.5">
                <p className="text-xs text-[var(--text-sub,#B5BDC6)] flex items-center gap-1.5 truncate">
                  <span className="text-[var(--text-sub,#B5BDC6)]/75">
                    {isHu ? 'Szülőhelyszín:' : 'Parent:'}
                  </span>
                  <span className="font-semibold text-[var(--text-main,#E0E3E6)] truncate">
                    {parentLoc.name}
                  </span>
                </p>
                {depth >= 2 && (
                  <p className="text-[11px] text-[var(--text-sub,#B5BDC6)]/75 truncate">
                    {getLocationPath(loc.id)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-sub,#B5BDC6)] truncate">
                {childCount > 0
                  ? isHu
                    ? `Fő terület • ${childCount} közvetlen alhelyszín`
                    : `Primary area • ${childCount} direct sub-locations`
                  : isHu
                  ? 'Önálló fő helyszín'
                  : 'Standalone main location'}
              </p>
            )}
          </div>

          {/* Card Footer Action Bar */}
          <div
            className="pt-2.5 border-t border-[var(--border-color,#56616D)]/60 flex items-center justify-between gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {isDeleting ? (
              <div className="flex items-center justify-between w-full gap-1.5">
                <span className="text-[11px] text-rose-400 font-semibold truncate">
                  {isHu ? 'Biztosan törlöd?' : 'Delete location?'}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
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
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectLocationFilter(loc.id);
                  }}
                  title={
                    isHu
                      ? 'Tárgyak megtekintése ezen a helyszínen'
                      : 'View items in location'
                  }
                  className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary-blue,#2563EB)] hover:text-blue-400 transition-colors cursor-pointer"
                >
                  <span>{isHu ? 'Megnyitás' : 'Open'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleOpenAddSubLocation(loc.id, e)}
                    className="p-1.5 rounded-lg bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--color-primary-blue,#2563EB)] transition-colors cursor-pointer"
                    title={
                      isHu
                        ? 'Alhelyszín hozzáadása ehhez a helyszínhez'
                        : 'Add sub-location here'
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>

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
                      setDeletingLocId(loc.id);
                    }}
                    className="p-1.5 rounded-lg bg-[var(--surface-bg,#465362)]/60 text-[var(--text-sub,#B5BDC6)] hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                    title={isHu ? 'Helyszín törlése' : 'Delete location'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Recursive renderer for sub-locations (depth >= 1) preserving arbitrary hierarchy depth
  const renderSubLocationBranch = (loc: LocationItem, depth: number): React.ReactNode => {
    const children = locations.filter((l) => l.parent_id === loc.id);

    if (children.length === 0) {
      return <div key={loc.id}>{renderLocationCard(loc, depth, 0)}</div>;
    }

    return (
      <div
        key={loc.id}
        className="col-span-full rounded-2xl border border-[var(--border-color,#56616D)]/60 bg-[var(--surface-bg,#465362)]/20 p-3 sm:p-4 space-y-3.5"
      >
        <div className="max-w-sm">
          {renderLocationCard(loc, depth, children.length)}
        </div>

        <div className="ml-3 sm:ml-6 pl-3 sm:pl-5 border-l-2 border-[var(--color-primary-blue,#2563EB)]/50 space-y-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-sub,#B5BDC6)]">
            <CornerDownRight className="w-3.5 h-3.5 text-[var(--color-primary-blue,#2563EB)]" />
            <span>
              {loc.name} — {isHu ? 'alhelyszínei' : 'sub-locations'} ({children.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {children.map((child) => renderSubLocationBranch(child, depth + 1))}
          </div>
        </div>
      </div>
    );
  };

  const renderRootLocationSection = (rootLoc: LocationItem) => {
    const children = locations.filter((l) => l.parent_id === rootLoc.id);

    if (children.length === 0) {
      return <div key={rootLoc.id}>{renderLocationCard(rootLoc, 0, 0)}</div>;
    }

    return (
      <div
        key={rootLoc.id}
        className="col-span-full rounded-2xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)]/35 p-4 sm:p-5 space-y-4 shadow-sm"
      >
        {/* Root Location Card + Group Summary Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          <div className="sm:col-span-1 lg:col-span-1">
            {renderLocationCard(rootLoc, 0, children.length)}
          </div>

          {/* Connected Sub-locations Indented Group */}
          <div className="sm:col-span-1 lg:col-span-2 xl:col-span-3 ml-2 sm:ml-0 pl-3 sm:pl-5 border-l-2 border-[var(--color-primary-blue,#2563EB)]/60 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-sub,#B5BDC6)]">
                <CornerDownRight className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)]" />
                <span>
                  {rootLoc.name} — {isHu ? 'alhelyszínek' : 'sub-locations'} ({children.length})
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => handleOpenAddSubLocation(rootLoc.id, e)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--surface-bg,#465362)] hover:bg-[var(--color-primary-blue,#2563EB)] text-[var(--text-main,#E0E3E6)] hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isHu ? 'Új alhelyszín ide' : 'Add sub-location'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {children.map((child) => renderSubLocationBranch(child, 1))}
            </div>
          </div>
        </div>
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

      {/* LOCATIONS CARD HIERARCHY DISPLAY */}
      <div>
        {rootLocations.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)]/40 text-[var(--text-sub,#B5BDC6)] text-xs">
            {isHu
              ? 'Még nincsenek létrehozott helyszínek. Kattints a "+ Helyszín Hozzáadása" gombra a helyiségek és szekrények felvételéhez.'
              : 'No locations created yet. Click "Add Location" to start mapping your rooms and cabinets.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 grid-flow-row-dense items-start">
            {rootLocations.map((root) => renderRootLocationSection(root))}
          </div>
        )}
      </div>
    </div>
  );
};
