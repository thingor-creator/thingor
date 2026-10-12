import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
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
  DollarSign,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Shield,
  Tag
} from 'lucide-react';
import type { Collection, CollectionItem } from '../types';

export const CollectionsView: React.FC = () => {
  const {
    items,
    collections,
    collectionItems,
    addCollection,
    updateCollection,
    deleteCollection,
    addItemToCollection,
    removeItemFromCollection,
    setSelectedItemId,
    language
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
  const [colType, setColType] = useState<Collection['collection_type']>('general');
  const [colCover, setColCover] = useState('');
  const [colIsPublic, setColIsPublic] = useState(false);

  // Add item to collection modal
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [selectedItemIdToAdd, setSelectedItemIdToAdd] = useState('');
  const [collectorGrade, setCollectorGrade] = useState('');
  const [rarity, setRarity] = useState('');
  const [acquiredYear, setAcquiredYear] = useState<number | ''>('');
  const [catalogNumber, setCatalogNumber] = useState('');
  const [estimatedCollectorValue, setEstimatedCollectorValue] = useState<number | ''>('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(isHu ? 'hu-HU' : 'en-US', {
      style: 'currency',
      currency: isHu ? 'HUF' : 'EUR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getCollectionTypeIcon = (type: Collection['collection_type']) => {
    switch (type) {
      case 'books': return <Library className="h-5 w-5 text-[var(--cat-books,#818CF8)]" />;
      case 'coins': return <Coins className="h-5 w-5 text-[var(--cat-jewelry,#F59E0B)]" />;
      case 'watches': return <Watch className="h-5 w-5 text-[var(--color-primary-blue,#2563EB)]" />;
      case 'wine': return <Wine className="h-5 w-5 text-rose-400" />;
      case 'records': return <Disc className="h-5 w-5 text-emerald-400" />;
      default: return <FolderArchive className="h-5 w-5 text-[var(--text-sub,#B5BDC6)]" />;
    }
  };

  const getCollectionTypeLabel = (type: Collection['collection_type']) => {
    switch (type) {
      case 'books': return isHu ? 'Könyvtár' : 'Books';
      case 'coins': return isHu ? 'Érmék / Numizmatika' : 'Coins';
      case 'watches': return isHu ? 'Karórák' : 'Watches';
      case 'wine': return isHu ? 'Borok / Pincészet' : 'Wine';
      case 'records': return isHu ? 'Hanglemezek / Bakelit' : 'Vinyl Records';
      default: return isHu ? 'Általános gyűjtemény' : 'General Collection';
    }
  };

  // Selected collection object
  const currentCollection = useMemo(() => {
    if (!selectedCollectionId) return null;
    return collections.find(c => c.id === selectedCollectionId) || null;
  }, [selectedCollectionId, collections]);

  // Items belonging to selected collection
  const currentCollectionItems = useMemo(() => {
    if (!selectedCollectionId) return [];
    const relations = collectionItems.filter(ci => ci.collection_id === selectedCollectionId);
    return relations.map(rel => {
      const item = items.find(i => i.id === rel.item_id);
      return {
        ...rel,
        item
      };
    });
  }, [selectedCollectionId, collectionItems, items]);

  // Overall KPI stats
  const stats = useMemo(() => {
    const totalCols = collections.length;
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
  }, [collections, collectionItems, items]);

  // Filtered collections
  const filteredCollections = useMemo(() => {
    return collections.filter(c => {
      if (filterType !== 'all' && c.collection_type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [collections, filterType, searchQuery]);

  const handleOpenAddCollection = () => {
    setEditingCol(null);
    setColName('');
    setColDesc('');
    setColType('general');
    setColCover('');
    setColIsPublic(false);
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

  const handleAddItemToCurrentCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollectionId || !selectedItemIdToAdd) return;

    await addItemToCollection(selectedCollectionId, selectedItemIdToAdd, {
      collector_grade: collectorGrade.trim() || undefined,
      rarity: rarity.trim() || undefined,
      acquired_year: acquiredYear ? Number(acquiredYear) : undefined,
      catalogNumber: catalogNumber.trim() || undefined,
      estimated_collector_value: estimatedCollectorValue ? Number(estimatedCollectorValue) : undefined,
    });

    setIsAddItemModalOpen(false);
    setSelectedItemIdToAdd('');
    setCollectorGrade('');
    setRarity('');
    setAcquiredYear('');
    setCatalogNumber('');
    setEstimatedCollectorValue('');
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
            <div className="p-2.5 rounded-xl bg-[var(--cat-books,#818CF8)]/15 text-[var(--cat-books,#818CF8)]">
              <Library className="h-6 w-6" />
            </div>
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
              onClick={() => {
                if (availableItems.length > 0) {
                  setSelectedItemIdToAdd(availableItems[0].id);
                }
                setIsAddItemModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-sm shadow-md transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>{isHu ? 'Tárgy hozzáadása' : 'Add Item'}</span>
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
              {(['all', 'books', 'coins', 'watches', 'wine', 'records', 'general'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilterType(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    filterType === tab
                      ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-sm'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)]'
                  }`}
                >
                  {tab === 'all' && (isHu ? 'Összes' : 'All')}
                  {tab === 'books' && (isHu ? 'Könyvek' : 'Books')}
                  {tab === 'coins' && (isHu ? 'Érmék' : 'Coins')}
                  {tab === 'watches' && (isHu ? 'Órák' : 'Watches')}
                  {tab === 'wine' && (isHu ? 'Borok' : 'Wine')}
                  {tab === 'records' && (isHu ? 'Bakelit' : 'Vinyl')}
                  {tab === 'general' && (isHu ? 'Egyéb' : 'General')}
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
                      {/* Item header */}
                      <div className="flex items-start justify-between gap-3">
                        <div
                          onClick={() => item && setSelectedItemId(item.id)}
                          className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                        >
                          <div className="w-12 h-12 rounded-xl bg-[var(--surface-bg,#465362)] overflow-hidden shrink-0 flex items-center justify-center border border-[var(--border-color,#56616D)]">
                            {item?.photo_url || item?.image_url ? (
                              <img src={item.photo_url || item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="h-5 w-5 text-[var(--text-sub,#B5BDC6)]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-[var(--text-main,#E0E3E6)] truncate group-hover:text-[var(--color-primary-blue,#2563EB)] transition-colors">
                              {item?.name || (isHu ? 'Ismeretlen tárgy' : 'Unknown')}
                            </h4>
                            <p className="text-[11px] text-[var(--text-sub,#B5BDC6)]">
                              {item?.current_value ? formatCurrency(item.current_value) : item?.purchase_price ? formatCurrency(item.purchase_price) : ''}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => removeItemFromCollection(selectedCollectionId, ci.item_id)}
                          className="p-1.5 rounded-lg text-[var(--status-danger,#EF4444)]/80 hover:text-[var(--status-danger,#EF4444)] hover:bg-[var(--status-danger,#EF4444)]/10"
                          title={isHu ? 'Eltávolítás a gyűjteményből' : 'Remove from collection'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

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

      {/* MODAL: ADD ITEM TO COLLECTION */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color,#56616D)]">
              <h3 className="text-base font-bold text-[var(--text-main,#E0E3E6)]">
                {isHu ? 'Tárgy hozzáadása a gyűjteményhez' : 'Add Item to Collection'}
              </h3>
              <button
                onClick={() => setIsAddItemModalOpen(false)}
                className="p-1.5 rounded-xl text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddItemToCurrentCollection} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                  {isHu ? 'Válassz tárgyat *' : 'Select Item *'}
                </label>
                {availableItems.length === 0 ? (
                  <p className="text-xs text-[var(--status-warning,#F59E0B)]">
                    {isHu ? 'Minden tárgyad már ebben a gyűjteményben van!' : 'All items are already in this collection!'}
                  </p>
                ) : (
                  <select
                    value={selectedItemIdToAdd}
                    onChange={e => setSelectedItemIdToAdd(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  >
                    {availableItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                    {isHu ? 'Fokozat / Állapot' : 'Grade'}
                  </label>
                  <input
                    type="text"
                    value={collectorGrade}
                    onChange={e => setCollectorGrade(e.target.value)}
                    placeholder={isHu ? 'Pl. Mint, MS-65' : 'e.g. Mint, Uncirculated'}
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
                    placeholder={isHu ? 'Pl. Nagyon ritka' : 'e.g. Rare, 1 of 500'}
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
                    placeholder="Pl. KM# 821, ISBN"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-main,#E0E3E6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-main,#E0E3E6)] mb-1">
                    {isHu ? 'Évjárat' : 'Year'}
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

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-sub,#B5BDC6)] hover:text-[var(--text-main,#E0E3E6)] hover:bg-[var(--surface-bg,#465362)]"
                >
                  {isHu ? 'Mégse' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={availableItems.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white shadow-md disabled:opacity-50"
                >
                  {isHu ? 'Hozzáadás' : 'Add to Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
