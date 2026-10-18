import React, { useState, useMemo, useEffect } from 'react';
import { useApp, useModalBack } from '../context/AppContext';
import {
  Library,
  Coins,
  Watch,
  Wine,
  Disc,
  FolderArchive,
  Plus,
  Trash2,
  Edit2,
  Package,
  X,
  Search,
  ArrowLeft,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Shield,
  Upload,
  Link as LinkIcon,
  Loader2,
  Check,
  Maximize2,
  Star,
  Images
} from 'lucide-react';
import type { Collection, CollectionItem } from '../types';
import { uploadFileToStorage, optimizeImageFile } from '../lib/storage';

export const CollectionsView: React.FC = () => {
  const {
    items,
    collections,
    collectionItems,
    addCollection,
    updateCollection,
    deleteCollection,
    addItemToCollection,
    deleteCollectionItem,
    updateCollectionItem,
    setSelectedItemId,
    language,
    user,
    isHouseholdModuleAllowed
  } = useApp();

  const isHu = language === 'hu';

  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Collection modal
  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<Collection | null>(null);
  const [colName, setColName] = useState('');
  const [colDesc, setColDesc] = useState('');
  const [colType, setColType] = useState<string>('general');
  const [colCover, setColCover] = useState('');
  const [colIsPublic, setColIsPublic] = useState(false);
  const [isUploadingColCover, setIsUploadingColCover] = useState(false);
  const [colCoverUploadError, setColCoverUploadError] = useState<string | null>(null);
  const [colCoverTab, setColCoverTab] = useState<'upload' | 'url'>('upload');
  const [isColDragging, setIsColDragging] = useState(false);

  // Add / Edit item in collection modal
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [editingCollectionItem, setEditingCollectionItem] = useState<CollectionItem | null>(null);
  const [itemEntryMode, setItemEntryMode] = useState<'standalone' | 'linked'>('standalone');

  // Linked item state
  const [selectedItemIdToAdd, setSelectedItemIdToAdd] = useState('');

  // Standalone item state
  const [standaloneName, setStandaloneName] = useState('');
  const [standaloneDesc, setStandaloneDesc] = useState('');
  const [standaloneQuantity, setStandaloneQuantity] = useState<number>(1);
  const [standalonePhotoUrl, setStandalonePhotoUrl] = useState('');
  const [standaloneAdditionalPhotos, setStandaloneAdditionalPhotos] = useState<string[]>([]);

  // Item photo upload state
  const [isUploadingItemPhoto, setIsUploadingItemPhoto] = useState(false);
  const [itemPhotoUploadError, setItemPhotoUploadError] = useState<string | null>(null);
  const [itemPhotoTab, setItemPhotoTab] = useState<'upload' | 'url'>('upload');
  const [isItemDragging, setIsItemDragging] = useState(false);

  // Collector attributes
  const [collectorGrade, setCollectorGrade] = useState('');
  const [rarity, setRarity] = useState('');
  const [acquiredYear, setAcquiredYear] = useState<number | ''>('');
  const [catalogNumber, setCatalogNumber] = useState('');
  const [estimatedCollectorValue, setEstimatedCollectorValue] = useState<number | ''>('');

  // Fullscreen interactive gallery modal state
  const [galleryModal, setGalleryModal] = useState<{
    title: string;
    photos: string[];
    activeIndex: number;
    subtitle?: string;
  } | null>(null);

  // Mobile back button traps: closing panels / subviews on back button without changing route
  useModalBack(galleryModal !== null, () => setGalleryModal(null), 'collections-gallery');
  useModalBack(isAddItemModalOpen, () => setIsAddItemModalOpen(false), 'collections-add-item');
  useModalBack(isColModalOpen, () => setIsColModalOpen(false), 'collections-folder-modal');
  useModalBack(selectedCollectionId !== null, () => setSelectedCollectionId(null), 'collections-detail-view');

  // Keyboard navigation for fullscreen gallery
  useEffect(() => {
    if (!galleryModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGalleryModal(null);
      } else if (e.key === 'ArrowLeft') {
        setGalleryModal(prev => {
          if (!prev || prev.photos.length <= 1) return prev;
          const nextIdx = (prev.activeIndex - 1 + prev.photos.length) % prev.photos.length;
          return { ...prev, activeIndex: nextIdx };
        });
      } else if (e.key === 'ArrowRight') {
        setGalleryModal(prev => {
          if (!prev || prev.photos.length <= 1) return prev;
          const nextIdx = (prev.activeIndex + 1) % prev.photos.length;
          return { ...prev, activeIndex: nextIdx };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryModal]);

  // Listen for FAB central "+" action
  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ view?: string }>;
      if (!customEvent.detail || customEvent.detail.view === 'collections') {
        if (selectedCollectionId) {
          handleOpenAddItem();
        } else {
          handleOpenAddCollection();
        }
      }
    };
    window.addEventListener('thingor-open-add', handleTrigger);
    return () => window.removeEventListener('thingor-open-add', handleTrigger);
  }, [selectedCollectionId]);

  const processImageFiles = async (files: FileList | File[], target: 'item' | 'collection') => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    const invalid = fileList.some(f => !f.type.startsWith('image/'));
    if (invalid) {
      const msg = isHu ? 'Csak képfájlok választhatók ki (JPG, PNG, WebP)!' : 'Only image files are supported (JPG, PNG, WebP)!';
      if (target === 'item') setItemPhotoUploadError(msg);
      else setColCoverUploadError(msg);
      return;
    }

    if (target === 'item') {
      setIsUploadingItemPhoto(true);
      setItemPhotoUploadError(null);
    } else {
      setIsUploadingColCover(true);
      setColCoverUploadError(null);
    }

    const uploadedUrls: string[] = [];

    for (const file of fileList) {
      try {
        const res = await uploadFileToStorage(file, 'photos', user?.id || 'demo');
        if (res.signedUrl || res.path) {
          uploadedUrls.push(res.signedUrl || res.path || '');
        } else {
          // Fallback to data URL
          const dataUrl = await new Promise<string>((resolve, reject) => {
            optimizeImageFile(file).then(optimized => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(optimized);
            }).catch(() => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          });
          if (dataUrl) uploadedUrls.push(dataUrl);
        }
      } catch (err: any) {
        console.warn('Error processing image:', err);
      }
    }

    if (target === 'item') {
      setIsUploadingItemPhoto(false);
      if (uploadedUrls.length > 0) {
        if (!standalonePhotoUrl) {
          setStandalonePhotoUrl(uploadedUrls[0]);
          if (uploadedUrls.length > 1) {
            setStandaloneAdditionalPhotos(prev => [...prev, ...uploadedUrls.slice(1)]);
          }
        } else {
          setStandaloneAdditionalPhotos(prev => [...prev, ...uploadedUrls]);
        }
      } else {
        setItemPhotoUploadError(isHu ? 'Nem sikerült feltölteni a képeket.' : 'Failed to upload photos.');
      }
    } else {
      setIsUploadingColCover(false);
      if (uploadedUrls.length > 0) {
        setColCover(uploadedUrls[0]);
      } else {
        setColCoverUploadError(isHu ? 'Nem sikerült feltölteni a borítóképet.' : 'Failed to upload cover photo.');
      }
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(isHu ? 'hu-HU' : 'en-US', {
      style: 'currency',
      currency: isHu ? 'HUF' : 'EUR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getCollectionTypeIcon = (type: string) => {
    switch (type) {
      case 'books': return <Library className="h-5 w-5 text-[var(--cat-books,#818CF8)]" />;
      case 'coins': return <Coins className="h-5 w-5 text-[var(--cat-jewelry,#F59E0B)]" />;
      case 'watches': return <Watch className="h-5 w-5 text-[var(--color-primary-blue,#2563EB)]" />;
      case 'wine': return <Wine className="h-5 w-5 text-rose-400" />;
      case 'records': return <Disc className="h-5 w-5 text-emerald-400" />;
      default: return <FolderArchive className="h-5 w-5 text-[var(--text-sub,#B5BDC6)]" />;
    }
  };

  const getCollectionTypeLabel = (type: string) => {
    switch (type) {
      case 'books': return isHu ? 'Könyvtár' : 'Books';
      case 'coins': return isHu ? 'Érmék / Numizmatika' : 'Coins';
      case 'watches': return isHu ? 'Karórák' : 'Watches';
      case 'wine': return isHu ? 'Borok / Pincészet' : 'Wine';
      case 'records': return isHu ? 'Hanglemezek / Bakelit' : 'Vinyl Records';
      case 'stamps': return isHu ? 'Bélyegek / Filatélia' : 'Stamps';
      case 'minerals': return isHu ? 'Ásványok / Kőzetek' : 'Minerals & Crystals';
      case 'napkins': return isHu ? 'Szalvéták' : 'Napkins';
      case 'cards': return isHu ? 'Kártyák / Képeslapok' : 'Cards & Postcards';
      case 'general': return isHu ? 'Általános gyűjtemény' : 'General Collection';
      default: return type;
    }
  };

  // Accessible collections based on household permissions
  const accessibleCollections = useMemo(() => {
    if (isHouseholdModuleAllowed('collections')) return collections;
    return collections.filter(c => !user?.id || c.user_id === user.id);
  }, [collections, isHouseholdModuleAllowed, user?.id]);

  // Selected collection object
  const currentCollection = useMemo(() => {
    if (!selectedCollectionId) return null;
    return accessibleCollections.find(c => c.id === selectedCollectionId) || null;
  }, [selectedCollectionId, accessibleCollections]);

  // Dynamic filter types derived from user's actual collections
  const availableFilterTypes = useMemo(() => {
    const typesInUse = new Set(accessibleCollections.map(c => c.collection_type).filter(Boolean));
    return ['all', ...Array.from(typesInUse)];
  }, [accessibleCollections]);

  // Items belonging to selected collection
  const currentCollectionItems = useMemo(() => {
    if (!selectedCollectionId) return [];
    const relations = collectionItems.filter(ci => ci.collection_id === selectedCollectionId);
    return relations.map(rel => {
      const item = rel.item_id ? items.find(i => i.id === rel.item_id) : undefined;
      return {
        ...rel,
        item
      };
    });
  }, [selectedCollectionId, collectionItems, items]);

  // Overall KPI stats
  const stats = useMemo(() => {
    const totalCols = accessibleCollections.length;
    const totalCatalogedItems = collectionItems.length;
    let totalEstValue = 0;
    let rareCount = 0;

    collectionItems.forEach(ci => {
      const item = items.find(i => i.id === ci.item_id);
      const val = ci.estimated_collector_value ?? item?.current_value ?? item?.purchase_price ?? 0;
      totalEstValue += val;
      if (ci.rarity && (ci.rarity.toLowerCase().includes('ritka') || ci.rarity.toLowerCase().includes('rare') || ci.rarity.toLowerCase().includes('egyedi'))) {
        rareCount++;
      }
    });

    return { totalCols, totalCatalogedItems, totalEstValue, rareCount };
  }, [accessibleCollections, collectionItems, items]);

  // Filtered collections
  const filteredCollections = useMemo(() => {
    return accessibleCollections.filter(c => {
      if (filterType !== 'all' && c.collection_type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [accessibleCollections, filterType, searchQuery]);

  const handleOpenAddCollection = () => {
    setEditingCol(null);
    setColName('');
    setColDesc('');
    setColType('general');
    setColCover('');
    setColIsPublic(false);
    setIsUploadingColCover(false);
    setColCoverUploadError(null);
    setColCoverTab('upload');
    setIsColDragging(false);
    setIsColModalOpen(true);
  };

  const handleOpenEditCollection = (e: React.MouseEvent, col: Collection) => {
    e.stopPropagation();
    setEditingCol(col);
    setColName(col.name);
    setColDesc(col.description || '');
    setColType(col.collection_type);
    setColCover(col.cover_image_url || '');
    setColIsPublic(col.is_public);
    setIsUploadingColCover(false);
    setColCoverUploadError(null);
    setColCoverTab(col.cover_image_url && col.cover_image_url.startsWith('http') && !col.cover_image_url.includes('data:') ? 'url' : 'upload');
    setIsColDragging(false);
    setIsColModalOpen(true);
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colName.trim()) return;

    if (editingCol) {
      await updateCollection(editingCol.id, {
        name: colName.trim(),
        description: colDesc.trim() || undefined,
        collection_type: colType,
        cover_image_url: colCover.trim() || undefined,
        is_public: colIsPublic,
      });
    } else {
      await addCollection({
        user_id: '',
        name: colName.trim(),
        description: colDesc.trim() || undefined,
        collection_type: colType,
        cover_image_url: colCover.trim() || undefined,
        is_public: colIsPublic,
      });
    }

    setIsColModalOpen(false);
  };

  const handleOpenAddItem = () => {
    setEditingCollectionItem(null);
    setItemEntryMode('standalone');
    setSelectedItemIdToAdd(availableItems.length > 0 ? availableItems[0].id : '');
    setStandaloneName('');
    setStandaloneDesc('');
    setStandaloneQuantity(1);
    setStandalonePhotoUrl('');
    setStandaloneAdditionalPhotos([]);
    setIsUploadingItemPhoto(false);
    setItemPhotoUploadError(null);
    setItemPhotoTab('upload');
    setIsItemDragging(false);
    setCollectorGrade('');
    setRarity('');
    setAcquiredYear('');
    setCatalogNumber('');
    setEstimatedCollectorValue('');
    setIsAddItemModalOpen(true);
  };

  const handleOpenEditItem = (ci: CollectionItem) => {
    setEditingCollectionItem(ci);
    setItemEntryMode(ci.item_id ? 'linked' : 'standalone');
    setSelectedItemIdToAdd(ci.item_id || (availableItems.length > 0 ? availableItems[0].id : ''));
    setStandaloneName(ci.name || '');
    setStandaloneDesc(ci.description || '');
    setStandaloneQuantity(ci.quantity ?? 1);
    setStandalonePhotoUrl(ci.photo_url || '');
    setStandaloneAdditionalPhotos(ci.additional_photos || []);
    setIsUploadingItemPhoto(false);
    setItemPhotoUploadError(null);
    setItemPhotoTab(ci.photo_url && ci.photo_url.startsWith('http') && !ci.photo_url.includes('data:') ? 'url' : 'upload');
    setIsItemDragging(false);
    setCollectorGrade(ci.collector_grade || '');
    setRarity(ci.rarity || '');
    setAcquiredYear(ci.acquired_year || '');
    setCatalogNumber(ci.catalog_number || '');
    setEstimatedCollectorValue(ci.estimated_collector_value || '');
    setIsAddItemModalOpen(true);
  };

  const handleSaveItemToCurrentCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollectionId) return;

    if (itemEntryMode === 'linked' && !selectedItemIdToAdd) return;
    if (itemEntryMode === 'standalone' && !standaloneName.trim()) return;

    const details: Partial<CollectionItem> = {
      name: itemEntryMode === 'standalone' ? standaloneName.trim() : undefined,
      description: itemEntryMode === 'standalone' ? (standaloneDesc.trim() || undefined) : undefined,
      quantity: itemEntryMode === 'standalone' ? (Number(standaloneQuantity) || 1) : 1,
      photo_url: itemEntryMode === 'standalone' ? (standalonePhotoUrl.trim() || undefined) : (standalonePhotoUrl.trim() || undefined),
      additional_photos: standaloneAdditionalPhotos.length > 0 ? standaloneAdditionalPhotos : [],
      collector_grade: collectorGrade.trim() || undefined,
      rarity: rarity.trim() || undefined,
      acquired_year: acquiredYear ? Number(acquiredYear) : undefined,
      catalog_number: catalogNumber.trim() || undefined,
      estimated_collector_value: estimatedCollectorValue ? Number(estimatedCollectorValue) : undefined,
    };

    if (editingCollectionItem) {
      await updateCollectionItem(editingCollectionItem.id, details);
    } else {
      await addItemToCollection(
        selectedCollectionId,
        itemEntryMode === 'linked' ? selectedItemIdToAdd : null,
        details
      );
    }

    setIsAddItemModalOpen(false);
  };

  // Available items not yet in this collection
  const availableItems = useMemo(() => {
    if (!selectedCollectionId) return [];
    const inColIds = new Set(collectionItems.filter(ci => ci.collection_id === selectedCollectionId).map(ci => ci.item_id));
    return items.filter(i => !inColIds.has(i.id));
  }, [items, collectionItems, selectedCollectionId]);

  return (
    <div className="space-y-6 pb-16">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color,#56616D)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            {selectedCollectionId && (
              <button
                onClick={() => setSelectedCollectionId(null)}
                className="p-2 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] transition-colors"
                title={isHu ? 'Vissza a gyűjteményekhez' : 'Back to collections'}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            {currentCollection?.cover_image_url ? (
              <div
                onClick={() => setGalleryModal({
                  title: currentCollection.name,
                  photos: [currentCollection.cover_image_url!],
                  activeIndex: 0,
                  subtitle: isHu ? 'Gyűjtemény borítóképe' : 'Collection cover image'
                })}
                className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[var(--border-color,#56616D)] shadow-sm bg-[var(--surface-bg,#465362)] relative cursor-pointer group"
                title={isHu ? 'Kattints a borítókép megtekintéséhez' : 'Click to view cover image'}
              >
                <img
                  src={currentCollection.cover_image_url}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-sm opacity-40 scale-125"
                />
                <img
                  src={currentCollection.cover_image_url}
                  alt={currentCollection.name}
                  className="relative z-10 w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform"
                />
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-[var(--cat-books,#818CF8)]/15 text-[var(--cat-books,#818CF8)]">
                <Library className="h-6 w-6" />
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main,#E0E3E6)] tracking-tight">
                {currentCollection ? currentCollection.name : (isHu ? 'Gyűjtemények & Katalógusok' : 'Curated Collections')}
              </h1>
              <p className="text-sm text-[var(--text-sub,#B5BDC6)] mt-0.5">
                {currentCollection
                  ? (currentCollection.description || (isHu ? 'Tematikus leltár és gyűjtői adatok' : 'Thematic catalog and collector records'))
                  : (isHu
                    ? 'Tematikus katalógusok (érmék, könyvek, órák, borok) prémium gyűjtői attribútumokkal.'
                    : 'Thematic catalogs with curated collector grading, rarity, and valuations.')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {!selectedCollectionId ? (
            <button
              onClick={handleOpenAddCollection}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-sm shadow-md transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>{isHu ? 'Új gyűjtemény' : 'New Collection'}</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAddItem}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-sm shadow-md transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>{isHu ? 'Tétel hozzáadása' : 'Add Item'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats when viewing all collections */}
      {!selectedCollectionId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">
                {isHu ? 'Gyűjtemények' : 'Collections'}
              </span>
              <div className="p-2 rounded-lg bg-[var(--cat-books,#818CF8)]/15 text-[var(--cat-books,#818CF8)]">
                <FolderArchive className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-[var(--text-main,#E0E3E6)]">{stats.totalCols}</span>
              <span className="text-xs text-[var(--text-sub,#B5BDC6)] ml-2">{isHu ? 'katalógus' : 'catalogs'}</span>
            </div>
          </div>

          <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">
                {isHu ? 'Katalogizált tárgyak' : 'Cataloged Items'}
              </span>
              <div className="p-2 rounded-lg bg-[var(--color-primary-blue,#2563EB)]/15 text-[var(--color-primary-blue,#2563EB)]">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-[var(--text-main,#E0E3E6)]">{stats.totalCatalogedItems}</span>
              <span className="text-xs text-[var(--text-sub,#B5BDC6)] ml-2">{isHu ? 'tétel' : 'items'}</span>
            </div>
          </div>

          <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">
                {isHu ? 'Becsült gyűjtői érték' : 'Est. Collector Value'}
              </span>
              <div className="p-2 rounded-lg bg-[var(--status-success,#10B981)]/15 text-[var(--status-success,#10B981)]">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-[var(--status-success,#10B981)]">{formatCurrency(stats.totalEstValue)}</span>
            </div>
          </div>

          <div className="p-5 rounded-[14px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">
                {isHu ? 'Ritkaságok' : 'Rare Rarities'}
              </span>
              <div className="p-2 rounded-lg bg-[var(--status-warning,#F59E0B)]/15 text-[var(--status-warning,#F59E0B)]">
                <Shield className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-[var(--status-warning,#F59E0B)]">{stats.rareCount}</span>
              <span className="text-xs text-[var(--text-sub,#B5BDC6)] ml-2">{isHu ? 'különleges darab' : 'special items'}</span>
            </div>
          </div>
        </div>
      )}

      {/* OVERVIEW MODE: ALL COLLECTIONS CARDS */}
      {!selectedCollectionId ? (
        <>
          {/* Category Filter Pills & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center p-1 rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] overflow-x-auto">
              {availableFilterTypes.map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilterType(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    filterType === tab
                      ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)]'
                  }`}
                >
                  {tab === 'all' ? (isHu ? 'Összes' : 'All') : getCollectionTypeLabel(tab)}
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-sub,#B5BDC6)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isHu ? 'Keresés gyűjteményekben...' : 'Search collections...'}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
              />
            </div>
          </div>

          {/* Collections Grid */}
          {filteredCollections.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-[var(--surface-bg,#465362)] flex items-center justify-center text-[var(--text-sub,#B5BDC6)]">
                <Library className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                {isHu ? 'Nincs megjeleníthető gyűjtemény' : 'No collections found'}
              </h3>
              <p className="text-xs text-[var(--text-sub,#B5BDC6)] max-w-sm mx-auto">
                {isHu
                  ? 'Hozd létre az első tematikus katalógusodat a fenti gombra kattintva.'
                  : 'Create your first curated collection using the button above.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCollections.map(col => {
                const count = collectionItems.filter(ci => ci.collection_id === col.id).length;

                return (
                  <div
                    key={col.id}
                    onClick={() => setSelectedCollectionId(col.id)}
                    className="p-5 rounded-[18px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] hover:border-[var(--color-primary-blue,#2563EB)]/60 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      {col.cover_image_url && (
                        <div className="h-44 -mx-5 -mt-5 mb-4 rounded-t-[18px] overflow-hidden bg-black/40 relative flex items-center justify-center isolate">
                          {/* Ambient blurred backdrop to prevent dark empty edges while maintaining modern aesthetic */}
                          <img
                            src={col.cover_image_url}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover blur-md opacity-35 scale-125"
                          />
                          {/* Foreground full image: object-contain ensures 100% of the image is shown without cropping */}
                          <img
                            src={col.cover_image_url}
                            alt={col.name}
                            className="relative z-10 max-h-full max-w-full object-contain p-2 group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[var(--card-bg,#3A4551)] via-transparent to-transparent opacity-70 pointer-events-none" />
                          
                          {/* Quick full-size preview button on card */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGalleryModal({
                                title: col.name,
                                photos: [col.cover_image_url!],
                                activeIndex: 0,
                                subtitle: isHu ? `${getCollectionTypeLabel(col.collection_type)} • Borítókép` : `${getCollectionTypeLabel(col.collection_type)} • Cover Image`
                              });
                            }}
                            className="absolute top-2.5 right-2.5 z-20 p-2 rounded-xl bg-black/60 hover:bg-black/85 text-white/90 hover:text-white backdrop-blur border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            title={isHu ? 'Borítókép nagyítása' : 'View full-size cover image'}
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      {/* Top Bar: Icon & Type Badge */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 rounded-xl bg-[var(--surface-bg,#465362)] group-hover:scale-105 transition-transform">
                            {getCollectionTypeIcon(col.collection_type)}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider block">
                              {getCollectionTypeLabel(col.collection_type)}
                            </span>
                            <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)] group-hover:text-[var(--color-primary-blue,#2563EB)] transition-colors truncate">
                              {col.name}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={e => handleOpenEditCollection(e, col)}
                            className="p-1.5 rounded-lg text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]"
                            title={isHu ? 'Szerkesztés' : 'Edit'}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (window.confirm(isHu ? 'Biztosan törölni szeretnéd ezt a gyűjteményt?' : 'Are you sure you want to delete this collection?')) {
                                deleteCollection(col.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-[var(--status-danger,#EF4444)]/80 hover:text-[var(--status-danger,#EF4444)] hover:bg-[var(--status-danger,#EF4444)]/10"
                            title={isHu ? 'Törlés' : 'Delete'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      {col.description && (
                        <p className="mt-3 text-xs text-[var(--text-sub,#B5BDC6)] line-clamp-2">
                          {col.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom stats */}
                    <div className="mt-5 pt-3 border-t border-[var(--border-color,#56616D)]/50 flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--text-main,#E0E3E6)]">
                        {count} {isHu ? 'tárgy a katalógusban' : 'cataloged items'}
                      </span>
                      <span className="flex items-center gap-1 text-[var(--color-primary-blue,#2563EB)] font-bold group-hover:translate-x-0.5 transition-transform">
                        {isHu ? 'Megnyitás' : 'Open'} <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* DETAIL VIEW: ITEMS INSIDE SELECTED COLLECTION */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-main,#E0E3E6)]">
              {isHu ? 'Gyűjteményhez tartozó tételek' : 'Items in this Collection'} ({currentCollectionItems.length})
            </h2>
          </div>

          {currentCollectionItems.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] space-y-3">
              <Package className="h-8 w-8 text-[var(--text-sub,#B5BDC6)] mx-auto" />
              <h3 className="text-sm font-bold text-[var(--text-main,#E0E3E6)]">
                {isHu ? 'A gyűjtemény még üres' : 'This collection has no items yet'}
              </h3>
              <p className="text-xs text-[var(--text-sub,#B5BDC6)] max-w-sm mx-auto">
                {isHu
                  ? 'Kattints a fenti "Tárgy hozzáadása" gombra, és válaszd ki a leltáradból a gyűjteménybe illő darabokat.'
                  : 'Click "Add Item" above to add items from your inventory with collector attributes.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentCollectionItems.map(ci => {
                const item = ci.item;

                return (
                  <div
                    key={ci.id}
                    className="p-5 rounded-[16px] border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      {/* Item Media Showcase (Large Photo + Gallery trigger) */}
                      {(() => {
                        const primaryPhoto = ci.photo_url || item?.photo_url;
                        const extraPhotos = [
                          ...(ci.additional_photos || []),
                          ...((item?.additional_photos || []).filter(p => p !== ci.photo_url && !(ci.additional_photos || []).includes(p)))
                        ];
                        const allItemPhotos = [
                          ...(primaryPhoto ? [primaryPhoto] : []),
                          ...extraPhotos.filter(p => p !== primaryPhoto)
                        ];

                        return (
                          <div className="space-y-3">
                            {allItemPhotos.length > 0 ? (
                              <div
                                onClick={() => setGalleryModal({
                                  title: item?.name || ci.name || (isHu ? 'Gyűjteményi tétel' : 'Collection Item'),
                                  photos: allItemPhotos,
                                  activeIndex: 0,
                                  subtitle: ci.item_id ? (isHu ? 'Leltári tárgy' : 'Inventory Item') : (isHu ? 'Önálló gyűjteményi tétel' : 'Standalone Item')
                                })}
                                className="h-44 -mx-5 -mt-5 mb-3 rounded-t-[16px] overflow-hidden bg-black/40 relative flex items-center justify-center cursor-pointer group/photo isolate"
                                title={isHu ? 'Kattints a képek nagy méretű galériájához' : 'Click to view full-size gallery'}
                              >
                                <img
                                  src={allItemPhotos[0]}
                                  alt=""
                                  aria-hidden="true"
                                  className="absolute inset-0 w-full h-full object-cover blur-md opacity-35 scale-125"
                                />
                                <img
                                  src={allItemPhotos[0]}
                                  alt={item?.name || ci.name || ''}
                                  className="relative z-10 max-h-full max-w-full object-contain p-2 group-hover/photo:scale-105 transition-transform duration-300 drop-shadow-md"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[var(--card-bg,#3A4551)] via-transparent to-transparent opacity-60 pointer-events-none" />

                                {/* Multi-photo count pill */}
                                {allItemPhotos.length > 1 && (
                                  <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur border border-white/10 text-white text-[11px] font-bold shadow-md">
                                    <Images className="h-3.5 w-3.5 text-[var(--color-primary-blue,#2563EB)]" />
                                    <span>{allItemPhotos.length} {isHu ? 'kép' : 'photos'}</span>
                                  </div>
                                )}

                                {/* Zoom / View Fullscreen trigger button */}
                                <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                                  <span className="p-2 rounded-xl bg-black/60 hover:bg-black/85 text-white/90 hover:text-white backdrop-blur border border-white/10 opacity-80 group-hover/photo:opacity-100 transition-opacity shadow-lg">
                                    <Maximize2 className="h-3.5 w-3.5" />
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-28 -mx-5 -mt-5 mb-3 rounded-t-[16px] bg-[var(--surface-bg,#465362)]/30 flex flex-col items-center justify-center text-[var(--text-sub,#B5BDC6)] border-b border-[var(--border-color,#56616D)]/40">
                                <Package className="h-8 w-8 opacity-40 mb-1" />
                                <span className="text-[11px] opacity-70">{isHu ? 'Nincs fénykép feltöltve' : 'No photos uploaded'}</span>
                              </div>
                            )}

                            {/* Item Title and Actions Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div
                                onClick={() => {
                                  if (ci.item_id && item) {
                                    setSelectedItemId(item.id);
                                  }
                                }}
                                className={`flex-1 min-w-0 ${ci.item_id && item ? 'cursor-pointer group' : ''}`}
                              >
                                <h4 className={`text-sm font-bold text-[var(--text-main,#E0E3E6)] truncate ${ci.item_id && item ? 'group-hover:text-[var(--color-primary-blue,#2563EB)] transition-colors' : ''}`}>
                                  {item?.name || ci.name || (isHu ? 'Névtelen gyűjteményi tétel' : 'Unnamed item')}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  {ci.item_id ? (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--color-primary-blue,#2563EB)]/15 text-[var(--color-primary-blue,#2563EB)]">
                                      {isHu ? 'Leltári tárgy' : 'Inventory Item'}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                                      {isHu ? 'Önálló tétel' : 'Standalone'} {ci.quantity && ci.quantity > 1 ? `(${ci.quantity} db)` : ''}
                                    </span>
                                  )}
                                  <span className="text-[11px] text-[var(--text-sub,#B5BDC6)] font-semibold">
                                    {item?.current_value ? formatCurrency(item.current_value) : item?.purchase_price ? formatCurrency(item.purchase_price) : ''}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleOpenEditItem(ci)}
                                  className="p-1.5 rounded-lg text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]"
                                  title={isHu ? 'Szerkesztés' : 'Edit'}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(isHu ? 'Biztosan eltávolítod ezt a tételt a gyűjteményből?' : 'Are you sure you want to remove this item from the collection?')) {
                                      deleteCollectionItem(ci.id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-[var(--status-danger,#EF4444)]/80 hover:text-[var(--status-danger,#EF4444)] hover:bg-[var(--status-danger,#EF4444)]/10"
                                  title={isHu ? 'Eltávolítás a gyűjteményből' : 'Remove from collection'}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Standalone description if any */}
                      {ci.description && (
                        <p className="mt-2 text-xs text-[var(--text-sub,#B5BDC6)] line-clamp-2">
                          {ci.description}
                        </p>
                      )}

                      {/* Collector specific attributes */}
                      <div className="mt-3.5 grid grid-cols-2 gap-2 text-[11px]">
                        {ci.collector_grade && (
                          <div className="p-2 rounded-lg bg-[var(--surface-bg,#465362)]/50">
                            <span className="text-[10px] text-[var(--text-sub,#B5BDC6)] uppercase block font-semibold">
                              {isHu ? 'Fokozat / Állapot' : 'Grade'}
                            </span>
                            <span className="font-bold text-[var(--text-main,#E0E3E6)] mt-0.5 block">
                              {ci.collector_grade}
                            </span>
                          </div>
                        )}

                        {ci.rarity && (
                          <div className="p-2 rounded-lg bg-[var(--status-warning,#F59E0B)]/10">
                            <span className="text-[10px] text-[var(--status-warning,#F59E0B)] uppercase block font-semibold">
                              {isHu ? 'Ritkaság' : 'Rarity'}
                            </span>
                            <span className="font-bold text-[var(--status-warning,#F59E0B)] mt-0.5 block truncate">
                              {ci.rarity}
                            </span>
                          </div>
                        )}

                        {ci.catalog_number && (
                          <div className="p-2 rounded-lg bg-[var(--surface-bg,#465362)]/50">
                            <span className="text-[10px] text-[var(--text-sub,#B5BDC6)] uppercase block font-semibold">
                              {isHu ? 'Katalógusszám' : 'Catalog No.'}
                            </span>
                            <span className="font-bold text-[var(--text-main,#E0E3E6)] mt-0.5 block truncate">
                              {ci.catalog_number}
                            </span>
                          </div>
                        )}

                        {ci.acquired_year && (
                          <div className="p-2 rounded-lg bg-[var(--surface-bg,#465362)]/50">
                            <span className="text-[10px] text-[var(--text-sub,#B5BDC6)] uppercase block font-semibold">
                              {isHu ? 'Kiadási / Beszerzési év' : 'Year'}
                            </span>
                            <span className="font-bold text-[var(--text-main,#E0E3E6)] mt-0.5 block">
                              {ci.acquired_year}
                            </span>
                          </div>
                        )}
                      </div>

                      {ci.estimated_collector_value && (
                        <div className="mt-2.5 p-2 rounded-lg bg-[var(--status-success,#10B981)]/10 flex items-center justify-between text-xs">
                          <span className="text-[10px] uppercase font-bold text-[var(--status-success,#10B981)]">
                            {isHu ? 'Becsült gyűjtői érték' : 'Est. Collector Value'}
                          </span>
                          <span className="font-extrabold text-[var(--status-success,#10B981)]">
                            {formatCurrency(ci.estimated_collector_value)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE / EDIT COLLECTION */}
      {isColModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color,#56616D)]">
              <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                {editingCol ? (isHu ? 'Gyűjtemény szerkesztése' : 'Edit Collection') : (isHu ? 'Új gyűjtemény létrehozása' : 'Create New Collection')}
              </h3>
              <button
                onClick={() => setIsColModalOpen(false)}
                className="p-1.5 rounded-xl text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCollection} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                  {isHu ? 'Gyűjtemény neve *' : 'Collection Name *'}
                </label>
                <input
                  type="text"
                  value={colName}
                  onChange={e => setColName(e.target.value)}
                  placeholder={isHu ? 'Pl. Régi magyar érmék' : 'e.g. Vintage Coins'}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                  {isHu ? 'Gyűjtemény típusa' : 'Category Type'}
                </label>
                <select
                  value={colType}
                  onChange={e => setColType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                >
                  <option value="general">{isHu ? 'Általános gyűjtemény' : 'General'}</option>
                  <option value="books">{isHu ? 'Könyvek / Könyvtár' : 'Books'}</option>
                  <option value="coins">{isHu ? 'Érmék / Numizmatika' : 'Coins'}</option>
                  <option value="stamps">{isHu ? 'Bélyegek / Filatélia' : 'Stamps'}</option>
                  <option value="minerals">{isHu ? 'Ásványok / Kőzetek' : 'Minerals & Crystals'}</option>
                  <option value="napkins">{isHu ? 'Szalvéták' : 'Napkins'}</option>
                  <option value="cards">{isHu ? 'Kártyák / Képeslapok' : 'Cards & Postcards'}</option>
                  <option value="watches">{isHu ? 'Karórák' : 'Watches'}</option>
                  <option value="wine">{isHu ? 'Borok / Pincészet' : 'Wine'}</option>
                  <option value="records">{isHu ? 'Bakelit / Hanglemezek' : 'Vinyl Records'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                  {isHu ? 'Leírás' : 'Description'}
                </label>
                <textarea
                  value={colDesc}
                  onChange={e => setColDesc(e.target.value)}
                  rows={2}
                  placeholder={isHu ? 'Rövid leírás a gyűjtemény fókuszáról...' : 'Short description...'}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>

              {/* Collection Cover Image */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)]">
                    {isHu ? 'Gyűjtemény borítóképe (opcionális)' : 'Collection Cover Image (optional)'}
                  </label>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]">
                    <button
                      type="button"
                      onClick={() => setColCoverTab('upload')}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${
                        colCoverTab === 'upload'
                          ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
                          : 'text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)]'
                      }`}
                    >
                      <Upload className="h-3 w-3" />
                      <span>{isHu ? 'Feltöltés' : 'Upload'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setColCoverTab('url')}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${
                        colCoverTab === 'url'
                          ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
                          : 'text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)]'
                      }`}
                    >
                      <LinkIcon className="h-3 w-3" />
                      <span>{isHu ? 'URL' : 'URL'}</span>
                    </button>
                  </div>
                </div>

                {colCover ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-bg,#465362)]/50 border border-[var(--border-color,#56616D)]">
                    <div className="relative w-20 h-16 rounded-xl overflow-hidden bg-black/40 shrink-0 border border-[var(--border-color,#56616D)] flex items-center justify-center isolate">
                      <img
                        src={colCover}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-sm opacity-40 scale-125"
                      />
                      <img
                        src={colCover}
                        alt="Cover preview"
                        className="relative z-10 max-h-full max-w-full object-contain p-1"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-main,#E0E3E6)]">
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{isHu ? 'Borítókép beállítva' : 'Cover image set'}</span>
                      </div>
                      <p className="text-[10px] text-[var(--text-sub,#B5BDC6)] truncate mt-0.5">
                        {colCover.startsWith('data:') ? (isHu ? 'Beágyazott képfájl' : 'Embedded image file') : colCover}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <label className="text-[11px] font-bold text-[var(--color-primary-blue,#2563EB)] hover:underline cursor-pointer">
                          {isHu ? 'Csere' : 'Replace'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files) processImageFiles(e.target.files, 'collection');
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <span className="text-[var(--border-color,#56616D)]">•</span>
                        <button
                          type="button"
                          onClick={() => setColCover('')}
                          className="text-[11px] font-bold text-[var(--status-danger,#EF4444)] hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>{isHu ? 'Törlés' : 'Remove'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : colCoverTab === 'upload' ? (
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsColDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsColDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsColDragging(false);
                      if (e.dataTransfer.files) processImageFiles(e.dataTransfer.files, 'collection');
                    }}
                    className={`flex flex-col items-center justify-center p-3.5 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      isColDragging
                        ? 'border-[var(--color-primary-blue,#2563EB)] bg-[var(--color-primary-blue,#2563EB)]/10 scale-[0.99]'
                        : 'border-[var(--border-color,#56616D)] hover:border-[var(--color-primary-blue,#2563EB)]/70 bg-[var(--surface-bg,#465362)]/30'
                    } ${isUploadingColCover ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    {isUploadingColCover ? (
                      <div className="flex items-center gap-2 py-1 text-xs font-bold text-[var(--text-main,#E0E3E6)]">
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary-blue,#2563EB)]" />
                        <span>{isHu ? 'Feltöltés és optimalizálás...' : 'Uploading and optimizing...'}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-center">
                        <div className="p-2 rounded-lg bg-[var(--color-primary-blue,#2563EB)]/15 text-[var(--color-primary-blue,#2563EB)]">
                          <Upload className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">
                          {isHu ? 'Kattints a borítókép tallózásához vagy húzd ide' : 'Click to browse cover image or drag & drop'}
                        </span>
                        <span className="text-[10px] text-[var(--text-sub,#B5BDC6)]">
                          JPG, PNG, WebP (max. 15MB)
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploadingColCover}
                      onChange={(e) => {
                        if (e.target.files) processImageFiles(e.target.files, 'collection');
                        e.target.value = '';
                      }}
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-sub,#B5BDC6)]" />
                    <input
                      type="url"
                      value={colCover}
                      onChange={(e) => setColCover(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                    />
                  </div>
                )}

                {colCoverUploadError && (
                  <p className="text-[11px] text-[var(--status-danger,#EF4444)] font-medium">
                    {colCoverUploadError}
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsColModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]"
                >
                  {isHu ? 'Mégse' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white shadow-md"
                >
                  {editingCol ? (isHu ? 'Mentés' : 'Save') : (isHu ? 'Létrehozás' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ITEM IN COLLECTION */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color,#56616D)] shrink-0">
              <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                {editingCollectionItem
                  ? (isHu ? 'Gyűjteményi tétel szerkesztése' : 'Edit Collection Item')
                  : (isHu ? 'Tétel felvétele a gyűjteménybe' : 'Add Item to Collection')}
              </h3>
              <button
                onClick={() => setIsAddItemModalOpen(false)}
                className="p-1.5 rounded-xl text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemToCurrentCollection} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* If creating new item, toggle between Standalone and Linked */}
              {!editingCollectionItem && (
                <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]">
                  <button
                    type="button"
                    onClick={() => setItemEntryMode('standalone')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      itemEntryMode === 'standalone'
                        ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
                        : 'text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)]'
                    }`}
                  >
                    {isHu ? 'Önálló tétel (pl. bélyeg, ásvány)' : 'Standalone Item'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemEntryMode('linked')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      itemEntryMode === 'linked'
                        ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
                        : 'text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)]'
                    }`}
                  >
                    {isHu ? 'Leltári tárgy csatolása' : 'Link from Inventory'}
                  </button>
                </div>
              )}

              {/* Mode-specific Fields */}
              {itemEntryMode === 'standalone' ? (
                <div className="space-y-3.5 p-3.5 rounded-xl bg-[var(--surface-bg,#465362)]/30 border border-[var(--border-color,#56616D)]/50">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                        {isHu ? 'Tétel megnevezése *' : 'Item Name *'}
                      </label>
                      <input
                        type="text"
                        value={standaloneName}
                        onChange={e => setStandaloneName(e.target.value)}
                        placeholder={isHu ? 'Pl. 1968-as Űrkutatás emlékbélyeg, Ametiszt geóda...' : 'e.g. 1968 Space Stamp, Amethyst crystal...'}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                        {isHu ? 'Mennyiség (db)' : 'Quantity'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={standaloneQuantity}
                        onChange={e => setStandaloneQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                      />
                    </div>
                  </div>

                  {/* Multi-Photo Upload & URL Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)]">
                        {isHu ? 'Tétel fényképei (Fő kép & További fotók)' : 'Item Photos (Primary & Additional)'}
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--text-sub,#B5BDC6)] font-semibold">
                          {(standalonePhotoUrl ? 1 : 0) + standaloneAdditionalPhotos.length} {isHu ? 'kép' : 'photos'}
                        </span>
                        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]">
                          <button
                            type="button"
                            onClick={() => setItemPhotoTab('upload')}
                            className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${
                              itemPhotoTab === 'upload'
                                ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
                                : 'text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)]'
                            }`}
                          >
                            <Upload className="h-3 w-3" />
                            <span>{isHu ? 'Feltöltés' : 'Upload'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemPhotoTab('url')}
                            className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${
                              itemPhotoTab === 'url'
                                ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
                                : 'text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)]'
                            }`}
                          >
                            <LinkIcon className="h-3 w-3" />
                            <span>{isHu ? 'URL' : 'URL'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {itemPhotoTab === 'upload' ? (
                      <label
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsItemDragging(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsItemDragging(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsItemDragging(false);
                          if (e.dataTransfer.files) processImageFiles(e.dataTransfer.files, 'item');
                        }}
                        className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                          isItemDragging
                            ? 'border-[var(--color-primary-blue,#2563EB)] bg-[var(--color-primary-blue,#2563EB)]/10 scale-[0.99]'
                            : 'border-[var(--border-color,#56616D)] hover:border-[var(--color-primary-blue,#2563EB)]/70 bg-[var(--surface-bg,#465362)]/30'
                        } ${isUploadingItemPhoto ? 'opacity-60 pointer-events-none' : ''}`}
                      >
                        {isUploadingItemPhoto ? (
                          <div className="flex items-center gap-2 py-2 text-xs font-bold text-[var(--text-main,#E0E3E6)]">
                            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary-blue,#2563EB)]" />
                            <span>{isHu ? 'Képek feltöltése és optimalizálása...' : 'Uploading and optimizing photos...'}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-center py-1">
                            <div className="p-2.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)]/15 text-[var(--color-primary-blue,#2563EB)]">
                              <Upload className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-bold text-[var(--text-main,#E0E3E6)]">
                              {isHu ? 'Kattints több fénykép tallózásához vagy húzd ide' : 'Click to browse multiple photos or drag & drop'}
                            </span>
                            <span className="text-[10px] text-[var(--text-sub,#B5BDC6)]">
                              JPG, PNG, WebP (több kép is kiválasztható egyszerre)
                            </span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={isUploadingItemPhoto}
                          onChange={(e) => {
                            if (e.target.files) processImageFiles(e.target.files, 'item');
                            e.target.value = '';
                          }}
                        />
                      </label>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-sub,#B5BDC6)]" />
                          <input
                            type="url"
                            placeholder="https://images.unsplash.com/..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val) {
                                  if (!standalonePhotoUrl) setStandalonePhotoUrl(val);
                                  else setStandaloneAdditionalPhotos(prev => [...prev, val]);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }
                            }}
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            const input = (e.currentTarget.previousElementSibling?.querySelector('input') as HTMLInputElement);
                            if (input && input.value.trim()) {
                              const val = input.value.trim();
                              if (!standalonePhotoUrl) setStandalonePhotoUrl(val);
                              else setStandaloneAdditionalPhotos(prev => [...prev, val]);
                              input.value = '';
                            }
                          }}
                          className="px-3 py-2 rounded-xl bg-[var(--color-primary-blue,#2563EB)] text-white text-xs font-bold"
                        >
                          {isHu ? 'Hozzáadás' : 'Add'}
                        </button>
                      </div>
                    )}

                    {itemPhotoUploadError && (
                      <p className="text-[11px] text-[var(--status-danger,#EF4444)] font-medium">
                        {itemPhotoUploadError}
                      </p>
                    )}

                    {/* Uploaded Photos Gallery Preview & Reorder / Set-Primary */}
                    {(standalonePhotoUrl || standaloneAdditionalPhotos.length > 0) && (
                      <div className="space-y-1.5 pt-2 border-t border-[var(--border-color,#56616D)]/50">
                        <span className="text-[11px] font-semibold text-[var(--text-sub,#B5BDC6)] block">
                          {isHu ? 'Csatolt képek galériája:' : 'Attached photos gallery:'}
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {standalonePhotoUrl && (
                            <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-[var(--color-primary-blue,#2563EB)] bg-black/40 group p-1 flex items-center justify-center isolate">
                              <img
                                src={standalonePhotoUrl}
                                alt="Primary"
                                className="relative z-10 max-h-full max-w-full object-contain"
                              />
                              <span className="absolute top-1 left-1 z-20 px-1.5 py-0.5 rounded bg-[var(--card-bg,#3A4551)]/90 text-[9px] font-extrabold text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)]">
                                {isHu ? 'Fő Kép' : 'Primary'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (standaloneAdditionalPhotos.length > 0) {
                                    setStandalonePhotoUrl(standaloneAdditionalPhotos[0]);
                                    setStandaloneAdditionalPhotos(prev => prev.slice(1));
                                  } else {
                                    setStandalonePhotoUrl('');
                                  }
                                }}
                                className="absolute top-1 right-1 z-20 p-1 rounded-lg bg-[var(--card-bg,#3A4551)]/90 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                title={isHu ? 'Kép törlése' : 'Remove photo'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {standaloneAdditionalPhotos.map((url, idx) => (
                            <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-[var(--border-color,#56616D)] bg-black/40 group p-1 flex items-center justify-center isolate">
                              <img
                                src={url}
                                alt={`Additional ${idx + 1}`}
                                className="relative z-10 max-h-full max-w-full object-contain"
                              />
                              <div className="absolute top-1 right-1 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const oldPrimary = standalonePhotoUrl;
                                    setStandalonePhotoUrl(url);
                                    setStandaloneAdditionalPhotos(prev => {
                                      const filtered = prev.filter((_, i) => i !== idx);
                                      return oldPrimary ? [...filtered, oldPrimary] : filtered;
                                    });
                                  }}
                                  className="p-1 rounded-lg bg-[var(--card-bg,#3A4551)]/90 text-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)] hover:text-white transition-colors"
                                  title={isHu ? 'Beállítás fő képként' : 'Set as primary photo'}
                                >
                                  <Star className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStandaloneAdditionalPhotos(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-1 rounded-lg bg-[var(--card-bg,#3A4551)]/90 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                                  title={isHu ? 'Törlés' : 'Remove'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                      {isHu ? 'Leírás / Jegyzet' : 'Description / Notes'}
                    </label>
                    <textarea
                      value={standaloneDesc}
                      onChange={e => setStandaloneDesc(e.target.value)}
                      rows={2}
                      placeholder={isHu ? 'Részletes leírás, származási hely, különlegességek...' : 'Details, origin...'}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 p-3.5 rounded-xl bg-[var(--surface-bg,#465362)]/30 border border-[var(--border-color,#56616D)]/50">
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                    {isHu ? 'Válassz meglévő tárgyat a leltárból *' : 'Select Inventory Item *'}
                  </label>
                  {availableItems.length === 0 && !selectedItemIdToAdd ? (
                    <p className="text-xs text-[var(--status-warning,#F59E0B)]">
                      {isHu ? 'Minden leltári tárgyad már csatolva van, vagy nincs elérhető tárgy!' : 'All inventory items are already linked!'}
                    </p>
                  ) : (
                    <select
                      value={selectedItemIdToAdd}
                      onChange={e => setSelectedItemIdToAdd(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                    >
                      {editingCollectionItem?.item_id && (
                        <option value={editingCollectionItem.item_id}>
                          {items.find(i => i.id === editingCollectionItem.item_id)?.name || editingCollectionItem.item_id}
                        </option>
                      )}
                      {availableItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Linked Item Preview Card & Optional Custom Photo */}
                  {selectedItemIdToAdd && (() => {
                    const linked = items.find(i => i.id === selectedItemIdToAdd);
                    if (!linked) return null;
                    return (
                      <div className="pt-2 space-y-3 border-t border-[var(--border-color,#56616D)]/40">
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--surface-bg,#465362)]/50 border border-[var(--border-color,#56616D)]/60">
                          <div className="w-12 h-12 rounded-lg bg-[var(--card-bg,#3A4551)] overflow-hidden shrink-0 flex items-center justify-center border border-[var(--border-color,#56616D)]">
                            {standalonePhotoUrl || linked.photo_url ? (
                              <img src={standalonePhotoUrl || linked.photo_url} alt={linked.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="h-5 w-5 text-[var(--text-sub,#B5BDC6)]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-[var(--text-main,#E0E3E6)] truncate">{linked.name}</h5>
                            <p className="text-[10px] text-[var(--text-sub,#B5BDC6)] mt-0.5">
                              {linked.purchase_price ? formatCurrency(linked.purchase_price) : (isHu ? 'Nincs ár megadva' : 'No price set')}
                            </p>
                          </div>
                        </div>

                        {/* Optional photo override */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-[var(--text-sub,#B5BDC6)]">
                              {isHu ? 'Egyedi gyűjtői fotó (felülírja az eredetit):' : 'Custom collector photo (optional override):'}
                            </span>
                            <div className="flex items-center gap-1">
                              <label className="text-[11px] font-bold text-[var(--color-primary-blue,#2563EB)] hover:underline cursor-pointer flex items-center gap-1">
                                <Upload className="h-3 w-3" />
                                <span>{isHu ? 'Feltöltés' : 'Upload'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  disabled={isUploadingItemPhoto}
                                  onChange={(e) => {
                                    if (e.target.files) processImageFiles(e.target.files, 'item');
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                              {standalonePhotoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setStandalonePhotoUrl('')}
                                  className="text-[11px] font-bold text-[var(--status-danger,#EF4444)] hover:underline ml-2"
                                >
                                  {isHu ? 'Visszaállítás' : 'Reset'}
                                </button>
                              )}
                            </div>
                          </div>
                          {isUploadingItemPhoto && (
                            <div className="flex items-center gap-1.5 text-xs text-[var(--color-primary-blue,#2563EB)] font-medium">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>{isHu ? 'Kép feltöltése...' : 'Uploading photo...'}</span>
                            </div>
                          )}
                          {itemPhotoUploadError && (
                            <p className="text-[11px] text-[var(--status-danger,#EF4444)] font-medium">
                              {itemPhotoUploadError}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Collector Attributes */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold text-[var(--text-sub,#B5BDC6)] uppercase tracking-wider">
                  {isHu ? 'Gyűjtői attribútumok' : 'Collector Attributes'}
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                      {isHu ? 'Fokozat / Állapot' : 'Grade'}
                    </label>
                    <input
                      type="text"
                      value={collectorGrade}
                      onChange={e => setCollectorGrade(e.target.value)}
                      placeholder={isHu ? 'Pl. Mint, MS-65, Hibátlan' : 'e.g. Mint, Uncirculated'}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                      {isHu ? 'Ritkaság' : 'Rarity'}
                    </label>
                    <input
                      type="text"
                      value={rarity}
                      onChange={e => setRarity(e.target.value)}
                      placeholder={isHu ? 'Pl. Ritka, 1 of 500' : 'e.g. Rare, Unique'}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                      {isHu ? 'Katalógusszám' : 'Catalog No.'}
                    </label>
                    <input
                      type="text"
                      value={catalogNumber}
                      onChange={e => setCatalogNumber(e.target.value)}
                      placeholder="Pl. KM# 821, Michel 452"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                      {isHu ? 'Évjárat / Kiadás' : 'Year'}
                    </label>
                    <input
                      type="number"
                      value={acquiredYear}
                      onChange={e => setAcquiredYear(e.target.value ? Number(e.target.value) : '')}
                      placeholder="1984"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                    {isHu ? 'Becsült gyűjtői érték' : 'Est. Collector Value'}
                  </label>
                  <input
                    type="number"
                    value={estimatedCollectorValue}
                    onChange={e => setEstimatedCollectorValue(e.target.value ? Number(e.target.value) : '')}
                    placeholder={isHu ? 'HUF érték' : 'Value'}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-color,#56616D)] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]"
                >
                  {isHu ? 'Mégse' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={itemEntryMode === 'linked' && !selectedItemIdToAdd && availableItems.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white shadow-md disabled:opacity-50"
                >
                  {editingCollectionItem ? (isHu ? 'Mentés' : 'Save') : (isHu ? 'Hozzáadás' : 'Add to Collection')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN INTERACTIVE PHOTO GALLERY MODAL (Lightbox) */}
      {galleryModal && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-fade-in select-none"
          onClick={() => setGalleryModal(null)}
        >
          {/* Top Bar: Title, Counter & Close Button */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 bg-black/40 z-20"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-white/10 text-white">
                <Images className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {galleryModal.title}
                </h3>
                {galleryModal.subtitle && (
                  <p className="text-xs text-white/60 truncate">
                    {galleryModal.subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {galleryModal.photos.length > 1 && (
                <div className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold tracking-wide">
                  {galleryModal.activeIndex + 1} / {galleryModal.photos.length}
                </div>
              )}
              <button
                type="button"
                onClick={() => setGalleryModal(null)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                title={isHu ? 'Bezárás (ESC)' : 'Close (ESC)'}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Main Stage: Large Image + Next/Prev Navigation */}
          <div
            className="flex-1 relative flex items-center justify-center p-4 sm:p-8 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Previous Button */}
            {galleryModal.photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryModal(prev => {
                    if (!prev) return prev;
                    const nextIdx = (prev.activeIndex - 1 + prev.photos.length) % prev.photos.length;
                    return { ...prev, activeIndex: nextIdx };
                  });
                }}
                className="absolute left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white backdrop-blur border border-white/15 transition-all hover:scale-105 shadow-xl"
                title={isHu ? 'Előző kép (Bal nyíl)' : 'Previous photo (Left arrow)'}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Current Active Image with ambient blur backing */}
            <div className="relative max-w-full max-h-full flex items-center justify-center">
              <img
                src={galleryModal.photos[galleryModal.activeIndex]}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-contain blur-2xl opacity-20 scale-110 pointer-events-none"
              />
              <img
                key={galleryModal.activeIndex}
                src={galleryModal.photos[galleryModal.activeIndex]}
                alt={`${galleryModal.title} (${galleryModal.activeIndex + 1})`}
                className="relative z-10 max-w-[92vw] max-h-[72vh] sm:max-h-[78vh] object-contain rounded-xl shadow-2xl transition-all duration-300"
              />
            </div>

            {/* Next Button */}
            {galleryModal.photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryModal(prev => {
                    if (!prev) return prev;
                    const nextIdx = (prev.activeIndex + 1) % prev.photos.length;
                    return { ...prev, activeIndex: nextIdx };
                  });
                }}
                className="absolute right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white backdrop-blur border border-white/15 transition-all hover:scale-105 shadow-xl"
                title={isHu ? 'Következő kép (Jobb nyíl)' : 'Next photo (Right arrow)'}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnail Strip */}
          {galleryModal.photos.length > 1 && (
            <div
              className="px-6 py-3 border-t border-white/10 bg-black/50 shrink-0 z-20 flex items-center justify-center gap-2 overflow-x-auto"
              onClick={e => e.stopPropagation()}
            >
              {galleryModal.photos.map((photo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setGalleryModal(prev => prev ? { ...prev, activeIndex: idx } : null)}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                    idx === galleryModal.activeIndex
                      ? 'border-[var(--color-primary-blue,#2563EB)] scale-105 shadow-lg'
                      : 'border-white/20 opacity-50 hover:opacity-90'
                  }`}
                >
                  <img
                    src={photo}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
