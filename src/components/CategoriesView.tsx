import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { Category } from '../types';
import { uploadFileToStorage, deleteFileFromStorage } from '../lib/storage';
import {
  Tag,
  ChevronRight,
  X,
  Upload,
  Trash2,
  Loader2,
  Pencil,
  Image as ImageIcon,
  AlertCircle,
  Maximize2,
} from 'lucide-react';

export const CategoriesView: React.FC = () => {
  const {
    categories,
    items,
    user,
    isVaultUnlocked,
    addCategory,
    updateCategory,
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    setCurrentView,
    setFilters,
    getCategoryName,
    openImageViewer,
    t,
    language,
  } = useApp();

  const isHu = language === 'hu';

  // Create modal state
  const [name, setName] = useState('');
  const [createPhotoFile, setCreatePhotoFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit category / photo modal state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
    setCreatePhotoFile(null);
    setCreateError(null);
    setIsCreating(false);
  };

  const handleCloseCreateModal = () => {
    if (isCreating) return;
    resetCreateModal();
    setIsCategoryModalOpen(false);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isCreating) return;

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
                ? 'A kép feltöltése sikertelen volt. Kérjük, próbáld újra.'
                : 'Image upload failed. Please try again.')
          );
          setIsCreating(false);
          return;
        }
        uploadedPhotoUrl = res.signedUrl || res.path || null;
      }

      await addCategory(trimmed, uploadedPhotoUrl);
      resetCreateModal();
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      setCreateError(
        err?.message ||
          (isHu
            ? 'Váratlan hiba történt a kategória létrehozásakor.'
            : 'Unexpected error while creating category.')
      );
      setIsCreating(false);
    }
  };

  const handleOpenEditCategory = (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setEditName(cat.is_custom ? cat.name : getCategoryName(cat.id));
    setEditPhotoFile(null);
    setEditError(null);
    setIsSavingEdit(false);
    setIsDeletingPhoto(false);
  };

  const handleCloseEditModal = () => {
    if (isSavingEdit || isDeletingPhoto) return;
    setEditingCategory(null);
    setEditPhotoFile(null);
    setEditError(null);
  };

  const handleSaveEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || isSavingEdit || isDeletingPhoto) return;

    const trimmedName = editName.trim();
    if (editingCategory.is_custom && !trimmedName) {
      setEditError(
        isHu ? 'A kategória neve nem lehet üres.' : 'Category name cannot be empty.'
      );
      return;
    }

    setEditError(null);
    setIsSavingEdit(true);

    const oldPhotoUrl = editingCategory.photo_url || null;
    let nextPhotoUrl: string | null = oldPhotoUrl;
    let newlyUploadedUrl: string | null = null;

    try {
      // 1. If a new photo file is selected, upload it to R2 first before modifying DB or deleting old photo
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

      // 2. Save updated category data
      const ok = await updateCategory(editingCategory.id, {
        ...(editingCategory.is_custom ? { name: trimmedName } : {}),
        photo_url: nextPhotoUrl,
      });

      if (!ok) {
        // Rollback newly uploaded file if DB save failed, preserving old image
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

      // 3. Only after new upload AND DB update succeeded, remove replaced old R2 file
      if (newlyUploadedUrl && oldPhotoUrl && oldPhotoUrl !== newlyUploadedUrl) {
        deleteFileFromStorage(oldPhotoUrl).catch(() => {});
      }

      setIsSavingEdit(false);
      setEditingCategory(null);
      setEditPhotoFile(null);
    } catch (err: any) {
      setEditError(
        err?.message ||
          (isHu ? 'Hiba történt a mentés során.' : 'An error occurred while saving.')
      );
      setIsSavingEdit(false);
    }
  };

  const handleRemoveCategoryPhotoOnly = async () => {
    if (!editingCategory || !editingCategory.photo_url || isDeletingPhoto || isSavingEdit) {
      return;
    }

    setEditError(null);
    setIsDeletingPhoto(true);
    const oldPhotoUrl = editingCategory.photo_url;

    try {
      const ok = await updateCategory(editingCategory.id, { photo_url: null });
      if (!ok) {
        setEditError(
          isHu
            ? 'A kép eltávolítása sikertelen volt.'
            : 'Failed to remove category image.'
        );
        setIsDeletingPhoto(false);
        return;
      }

      if (oldPhotoUrl) {
        deleteFileFromStorage(oldPhotoUrl).catch(() => {});
      }

      setEditingCategory((prev) => (prev ? { ...prev, photo_url: null } : null));
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

  const handleSelectCategory = (catId: string) => {
    setFilters((prev) => ({ ...prev, categoryId: catId }));
    setCurrentView('items');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color,#56616D)] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main,#E0E3E6)] tracking-tight">
              {t('categories')}
            </h1>
            <span className="px-3 py-1 rounded-full bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--color-primary-blue,#2563EB)] font-bold text-xs">
              {categories.length} {isHu ? 'kategória' : 'categories'}
            </span>
          </div>
          <p className="text-sm text-[var(--text-sub,#B5BDC6)] mt-1">
            {isHu
              ? 'Rendszerezd a tárgyaidat kategóriák szerint, és adj hozzájuk saját képet az átláthatóbb eligazodáshoz.'
              : 'Group your items by classification and attach custom category images for quick visual recognition.'}
          </p>
        </div>

        <button
          onClick={() => {
            resetCreateModal();
            setIsCategoryModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02] cursor-pointer"
        >
          {isHu ? 'Egyedi kategória' : 'Custom Category'}
        </button>
      </div>

      {/* CREATE CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color,#56616D)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                <Tag className="h-5 w-5 text-[var(--color-primary-blue,#2563EB)]" />
                {isHu ? 'Egyedi kategória létrehozása' : 'Create Custom Category'}
              </h3>
              <button
                type="button"
                onClick={handleCloseCreateModal}
                className="text-[var(--text-sub,#B5BDC6)] hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              {createError && (
                <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/60 text-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-[var(--text-sub,#B5BDC6)] font-semibold mb-1">
                  {isHu ? 'Kategória neve *' : 'Category Name *'}
                </label>
                <input
                  type="text"
                  placeholder={
                    isHu
                      ? 'pl. Fényképészet, Hangszerek'
                      : 'e.g. Photography, Musical Instruments'
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] text-sm focus:border-[var(--color-primary-blue,#2563EB)] focus:outline-none transition-colors"
                />
              </div>

              {/* Category Image Upload (Optional) */}
              <div className="space-y-2">
                <label className="block text-[var(--text-sub,#B5BDC6)] font-semibold">
                  {isHu ? 'Kategória képe (opcionális)' : 'Category Image (optional)'}
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
                        ? 'Automatikus WebP optimalizálás feltöltéskor'
                        : 'Automatic WebP optimization on upload'}
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
                  {t('cancel')}
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
                      ? 'Kategória hozzáadása'
                      : 'Add Category'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY & PHOTO MODAL */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color,#56616D)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)] flex items-center gap-2">
                <Pencil className="h-4 w-4 text-[var(--color-primary-blue,#2563EB)]" />
                {isHu ? 'Kategória és kép szerkesztése' : 'Edit Category & Image'}
              </h3>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="text-[var(--text-sub,#B5BDC6)] hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCategory} className="space-y-4 text-xs">
              {editError && (
                <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/60 text-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-[var(--text-sub,#B5BDC6)] font-semibold mb-1">
                  {isHu ? 'Kategória neve' : 'Category Name'}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!editingCategory.is_custom}
                  required
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] text-sm focus:border-[var(--color-primary-blue,#2563EB)] focus:outline-none transition-colors disabled:opacity-60"
                />
              </div>

              {/* Photo Management */}
              <div className="space-y-2">
                <label className="block text-[var(--text-sub,#B5BDC6)] font-semibold">
                  {isHu ? 'Kategória képe' : 'Category Image'}
                </label>

                <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)]/60">
                  <div className="w-16 h-16 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] flex items-center justify-center overflow-hidden shrink-0">
                    {editPreviewUrl || editingCategory.photo_url ? (
                      <img
                        src={editPreviewUrl || editingCategory.photo_url || ''}
                        alt={editName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Tag className="w-6 h-6 text-[var(--color-primary-blue,#2563EB)]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold text-xs cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {editingCategory.photo_url || editPhotoFile
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

                      {editingCategory.photo_url && !editPhotoFile && (
                        <button
                          type="button"
                          disabled={isDeletingPhoto || isSavingEdit}
                          onClick={handleRemoveCategoryPhotoOnly}
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
                        : editingCategory.photo_url
                        ? isHu
                          ? 'Jelenleg egyedi kép van beállítva ehhez a kategóriához.'
                          : 'A custom image is currently assigned to this category.'
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
                  {t('cancel')}
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

      {/* CATEGORIES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const catItems = items.filter(
            (i) => i.category_id === cat.id && (isVaultUnlocked || !i.is_vault_protected)
          );
          const totalCount = catItems.length;
          const totalVal = catItems.reduce(
            (s, i) => s + (i.current_value ?? i.purchase_price ?? 0),
            0
          );
          const displayName = getCategoryName(cat.id);

          return (
            <div
              key={cat.id}
              onClick={() => handleSelectCategory(cat.id)}
              className="group p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] hover:border-[var(--color-primary-blue,#2563EB)]/60 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  {cat.photo_url ? (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        openImageViewer({
                          urls: [cat.photo_url!],
                          title: displayName,
                        });
                      }}
                      title={isHu ? 'Kép nagyítása' : 'View larger image'}
                      className="relative w-12 h-12 rounded-xl overflow-hidden border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] shrink-0 group/img"
                    >
                      <img
                        src={cat.photo_url}
                        alt={displayName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] group-hover:bg-[var(--color-primary-blue,#2563EB)] group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                      <Tag className="h-5 w-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="font-bold text-[var(--text-main,#E0E3E6)] text-base group-hover:text-[var(--color-primary-blue,#2563EB)] transition-colors truncate">
                      {displayName}
                    </h3>
                    <span className="text-[11px] text-[var(--text-sub,#B5BDC6)] block truncate">
                      {cat.is_custom
                        ? isHu
                          ? 'Egyedi kategória'
                          : 'Custom Category'
                        : isHu
                        ? 'Alapértelmezett kategória'
                        : 'Default Category'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditCategory(cat, e)}
                    title={
                      isHu
                        ? 'Kategória képe és szerkesztése'
                        : 'Edit category & image'
                    }
                    className="p-2 rounded-lg bg-[var(--surface-bg,#465362)]/80 hover:bg-[var(--color-primary-blue,#2563EB)] text-[var(--text-sub,#B5BDC6)] hover:text-white transition-colors cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <ChevronRight className="h-5 w-5 text-[var(--text-sub,#B5BDC6)] group-hover:text-[var(--color-primary-blue,#2563EB)] transition-colors" />
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-color,#56616D)]/60 flex items-center justify-between text-xs">
                <span className="text-[var(--text-sub,#B5BDC6)]">
                  {totalCount} {isHu ? 'tárgy rögzítve' : 'items logged'}
                </span>
                <span className="font-bold text-emerald-400">
                  {isHu
                    ? `${totalVal.toLocaleString('hu-HU')} Ft`
                    : `€${totalVal.toLocaleString('en-US')}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
