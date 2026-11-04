import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Boxes,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Plus,
  QrCode,
  Search,
  ArrowLeft,
  ArrowUp,
  X,
  Package,
  Layers,
  MapPin,
  Tag,
  Info,
  Check,
  Printer,
  Minus,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  Pencil,
  Image as ImageIcon,
  Upload,
  Maximize2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp, useModalBack } from '../context/AppContext';
import { uploadFileToStorage, deleteFileFromStorage } from '../lib/storage';
import type { ContainerType, ContainerItemUnit } from '../types';

export interface StorageViewProps {
  onClose?: () => void;
}

export interface StorageItemDisplay {
  id: string;
  name: string;
  category: string;
  code: string;
  isRealItem: boolean;
}

export interface ContainerBulkItemDisplay {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minQuantity?: number | null;
  notes?: string | null;
  photoUrl?: string | null;
}

export interface StorageContainerDisplay {
  id: string;
  parentId: string | null;
  name: string;
  containerType: ContainerType;
  code: string;
  locationName: string;
  locationId?: string | null;
  description?: string;
  ownership_scope?: 'private' | 'household';
  household_id?: string | null;
  items: StorageItemDisplay[];
  bulkItems: ContainerBulkItemDisplay[];
  photos: string[];
  isReal: boolean;
}

export function parseContainerPhotos(photoUrl?: string | null): string[] {
  if (!photoUrl || !photoUrl.trim()) return [];
  const trimmed = photoUrl.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
      }
    } catch {}
  }
  return [trimmed];
}

export function serializeContainerPhotos(photos: string[]): string | null {
  const clean = photos.filter(p => typeof p === 'string' && p.trim().length > 0);
  if (clean.length === 0) return null;
  if (clean.length === 1) return clean[0];
  return JSON.stringify(clean);
}

const CONTAINER_TYPE_LABELS: Record<ContainerType, { hu: string; en: string }> = {
  box: { hu: 'Doboz', en: 'Box' },
  shelf: { hu: 'Polc', en: 'Shelf' },
  cabinet: { hu: 'Szekrény', en: 'Cabinet' },
  drawer: { hu: 'Fiók', en: 'Drawer' },
  crate: { hu: 'Láda / Rekesz', en: 'Crate' },
  bag: { hu: 'Zsák / Táska', en: 'Bag' },
  bin: { hu: 'Konténer / Tároló', en: 'Bin' },
  case: { hu: 'Bőrönd / Koffer', en: 'Case' },
  other: { hu: 'Egyéb tároló', en: 'Other' },
};

const BULK_UNITS: ContainerItemUnit[] = ['db', 'pár', 'készlet', 'csomag', 'm', 'kg', 'l', 'doboz'];

// Initial Mock Data demonstrating the requested hierarchy when no database records exist:
const INITIAL_MOCK_CONTAINERS: StorageContainerDisplay[] = [
  {
    id: 'cont-1',
    parentId: null,
    name: 'Műhely',
    containerType: 'bin',
    code: 'CONT-WS-001',
    locationName: 'Főépület / Alagsor',
    description: 'Fő barkácsműhely és munkaasztal környéke',
    items: [
      { id: 'mock-101', name: 'Munkaasztal satu', category: 'Nehézgépek', code: 'ITM-9812', isRealItem: false }
    ],
    bulkItems: [],
    photos: [],
    isReal: false
  },
  {
    id: 'cont-2',
    parentId: 'cont-1',
    name: 'Szerszámos szekrény',
    containerType: 'cabinet',
    code: 'CONT-CAB-001',
    locationName: 'Főépület / Alagsor',
    description: 'Kétajtós fém szerszámtároló szekrény',
    items: [
      { id: 'mock-102', name: 'Makita fúrókalapács HR2470', category: 'Szerszámgép', code: 'ITM-4412', isRealItem: false }
    ],
    bulkItems: [
      { id: 'bulk-mock-201', name: 'Szigetelőszalag 10m fekete', quantity: 6, unit: 'db' }
    ],
    photos: [],
    isReal: false
  },
  {
    id: 'cont-3',
    parentId: 'cont-2',
    name: 'Felső polc',
    containerType: 'shelf',
    code: 'CONT-SH-001',
    locationName: 'Főépület / Alagsor',
    description: 'A szerszámos szekrény legfelső kivehető polca aprócikkeknek',
    items: [
      { id: 'mock-103', name: 'Bosch GSB 13 RE ütvefúró', category: 'Elektromos kéziszerszám', code: 'ITM-1029', isRealItem: false },
      { id: 'mock-104', name: 'Stanley racsnis csavarhúzó készlet', category: 'Kéziszerszám', code: 'ITM-2041', isRealItem: false }
    ],
    bulkItems: [
      { id: 'bulk-mock-301', name: 'M6x30 rozsdamentes acélcsavar', quantity: 120, unit: 'db' },
      { id: 'bulk-mock-302', name: 'P120 szemcsés csiszolóvászon', quantity: 15, unit: 'ív' },
      { id: 'bulk-mock-303', name: 'Kábelkötegelő 200mm fekete', quantity: 85, unit: 'db' }
    ],
    photos: [],
    isReal: false
  },
  {
    id: 'cont-4',
    parentId: null,
    name: 'Kerti tároló',
    containerType: 'crate',
    code: 'CONT-GDN-001',
    locationName: 'Kert / Fészer',
    description: 'Kerti gépek és szerszámok külső tárolója',
    items: [
      { id: 'mock-105', name: 'Gardena fűszegélynyíró', category: 'Kerti gép', code: 'ITM-3199', isRealItem: false }
    ],
    bulkItems: [],
    photos: [],
    isReal: false
  },
  {
    id: 'cont-5',
    parentId: 'cont-4',
    name: 'Fűnyíró tartozékos doboz',
    containerType: 'box',
    code: 'CONT-BX-042',
    locationName: 'Kert / Fészer',
    description: 'Pótkések, olaj, gyújtógyertya és tisztítókefe',
    items: [
      { id: 'mock-106', name: 'Fűnyíró mulcsozó betét', category: 'Tartozék', code: 'ITM-8120', isRealItem: false }
    ],
    bulkItems: [
      { id: 'bulk-mock-501', name: '4T Motorolaj SAE30', quantity: 2, unit: 'l' },
      { id: 'bulk-mock-502', name: 'Trimmer damil 2.4mm', quantity: 30, unit: 'm' }
    ],
    photos: [],
    isReal: false
  }
];

export const StorageView: React.FC<StorageViewProps> = ({ onClose }) => {
  const {
    storageContainers,
    containerItems,
    items,
    locations,
    categories,
    household,
    isAuthenticated,
    fetchStorageContainers,
    fetchContainerItems,
    createStorageContainer,
    updateStorageContainer,
    deleteStorageContainer,
    addContainerItem,
    updateContainerItem,
    deleteContainerItem,
    adjustContainerItemQuantity,
    assignItemToContainer,
    setSelectedItemId,
    user,
    isHouseholdModuleAllowed,
    openImageViewer,
  } = useApp();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isAssignItemModalOpen, setIsAssignItemModalOpen] = useState(false);
  const [isAddBulkModalOpen, setIsAddBulkModalOpen] = useState(false);
  // Bulk item photo handling
  const [bulkPhotoFile, setBulkPhotoFile] = useState<File | null>(null);
  const [isUploadingBulkPhoto, setIsUploadingBulkPhoto] = useState(false);
  const [uploadingBulkItemId, setUploadingBulkItemId] = useState<string | null>(null);
  const [bulkPhotoError, setBulkPhotoError] = useState<string | null>(null);

  const bulkPhotoPreviewUrl = useMemo(() => {
    if (!bulkPhotoFile) return null;
    return URL.createObjectURL(bulkPhotoFile);
  }, [bulkPhotoFile]);

  useEffect(() => {
    return () => {
      if (bulkPhotoPreviewUrl) {
        URL.revokeObjectURL(bulkPhotoPreviewUrl);
      }
    };
  }, [bulkPhotoPreviewUrl]);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'bulk' | 'items' | 'photos'>('overview');
  const [mobileView, setMobileView] = useState<'tree' | 'detail'>('tree');
  const [bulkSearchQuery, setBulkSearchQuery] = useState('');
  const [assignedItemSearchQuery, setAssignedItemSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const detailPanelRef = useRef<HTMLDivElement>(null);

  // Form states for creating new container
  const [newContainerName, setNewContainerName] = useState('');
  const [newContainerType, setNewContainerType] = useState<ContainerType>('box');
  const [newContainerParentId, setNewContainerParentId] = useState<string>('');
  const [newContainerLocationId, setNewContainerLocationId] = useState<string>('');
  const [newContainerDesc, setNewContainerDesc] = useState('');
  const [newContainerScope, setNewContainerScope] = useState<'private' | 'household'>('private');
  const [newContainerPhotos, setNewContainerPhotos] = useState<string[]>([]);
  const [isUploadingNewPhotos, setIsUploadingNewPhotos] = useState(false);
  const [newPhotoError, setNewPhotoError] = useState<string | null>(null);

  // Form states for editing existing container
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editContainerName, setEditContainerName] = useState('');
  const [editContainerType, setEditContainerType] = useState<ContainerType>('box');
  const [editContainerParentId, setEditContainerParentId] = useState<string>('');
  const [editContainerLocationId, setEditContainerLocationId] = useState<string>('');
  const [editContainerDesc, setEditContainerDesc] = useState('');
  const [editContainerPhotos, setEditContainerPhotos] = useState<string[]>([]);
  const [isUploadingEditPhotos, setIsUploadingEditPhotos] = useState(false);
  const [editPhotoError, setEditPhotoError] = useState<string | null>(null);

  // Photo state for direct upload on detail panel
  const [isUploadingDetailPhoto, setIsUploadingDetailPhoto] = useState(false);

  // Form states for adding bulk item
  const [newBulkName, setNewBulkName] = useState('');
  const [newBulkQty, setNewBulkQty] = useState(1);
  const [newBulkUnit, setNewBulkUnit] = useState<string>('db');
  const [newBulkMinQty, setNewBulkMinQty] = useState<string>('');
  const [newBulkNotes, setNewBulkNotes] = useState('');

  // Mobile back button traps: closing modals on device back button without changing route
  useModalBack(isCreateModalOpen, () => setIsCreateModalOpen(false), 'storage-create-modal');
  useModalBack(isQrModalOpen, () => setIsQrModalOpen(false), 'storage-qr-modal');
  useModalBack(isAssignItemModalOpen, () => setIsAssignItemModalOpen(false), 'storage-assign-modal');
  useModalBack(isAddBulkModalOpen, () => setIsAddBulkModalOpen(false), 'storage-add-bulk-modal');
  useModalBack(isEditModalOpen, () => setIsEditModalOpen(false), 'storage-edit-modal');

  // Real data is active whenever user is authenticated
  const isRealDataActive = isAuthenticated;

  // On-demand fetch of Supabase storage containers & items
  const loadStorageData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      setLoadError(null);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      await Promise.all([
        fetchStorageContainers(),
        fetchContainerItems()
      ]);
    } catch (err: any) {
      console.error('Hiba a tárolók betöltésekor:', err);
      setLoadError(err?.message || 'Nem sikerült betölteni a tárolókat a felhőből.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, fetchStorageContainers, fetchContainerItems]);

  useEffect(() => {
    loadStorageData();
  }, [loadStorageData]);

  // Scope storage containers by household permission
  const accessibleContainers = useMemo(() => {
    if (isHouseholdModuleAllowed('storage')) return storageContainers;
    return storageContainers.filter(sc => !user?.id || sc.user_id === user.id);
  }, [storageContainers, isHouseholdModuleAllowed, user?.id]);

  // Build unified display containers list
  const containers: StorageContainerDisplay[] = useMemo(() => {
    if (isRealDataActive) {
      return accessibleContainers.map(sc => {
        const loc = locations.find(l => l.id === sc.location_id);
        const assignedItems: StorageItemDisplay[] = items
          .filter(it => it.container_id === sc.id)
          .map(it => {
            const cat = categories.find(c => c.id === it.category_id);
            return {
              id: it.id,
              name: it.name,
              category: cat?.name || 'Egyéb kategória',
              code: it.id.slice(0, 8).toUpperCase(),
              isRealItem: true,
            };
          });

        const bulkItems: ContainerBulkItemDisplay[] = containerItems
          .filter(ci => ci.container_id === sc.id)
          .map(ci => ({
            id: ci.id,
            name: ci.name,
            quantity: ci.quantity,
            unit: ci.unit,
            minQuantity: ci.min_quantity,
            notes: ci.notes,
            photoUrl: ci.photo_url || null,
          }));

        return {
          id: sc.id,
          parentId: sc.parent_container_id,
          name: sc.name,
          containerType: sc.container_type as ContainerType,
          code: sc.qr_code || ('CONT-' + sc.id.slice(0, 8).toUpperCase()),
          locationName: loc?.name || (sc.ownership_scope === 'household' ? 'Közös háztartás' : 'Személyes tároló'),
          locationId: sc.location_id,
          description: sc.notes || undefined,
          ownership_scope: sc.ownership_scope,
          household_id: sc.household_id,
          items: assignedItems,
          bulkItems,
          photos: parseContainerPhotos(sc.photo_url),
          isReal: true,
        };
      });
    }

    return INITIAL_MOCK_CONTAINERS;
  }, [isRealDataActive, accessibleContainers, storageContainers, containerItems, items, locations, categories]);

  // Deep-link URL hash support (#storage/<container_id>)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#storage/')) {
        const targetId = hash.replace('#storage/', '').trim();
        if (targetId) {
          const match = containers.find(c => c.id === targetId || c.code === targetId);
          if (match) {
            setSelectedContainerId(match.id);
            // Expand ancestors
            const expandSet = new Set<string>();
            let cur = match.parentId ? containers.find(c => c.id === match.parentId) : null;
            while (cur) {
              expandSet.add(cur.id);
              cur = cur.parentId ? containers.find(c => c.id === cur.parentId) : null;
            }
            if (expandSet.size > 0) {
              setExpandedIds(prev => new Set([...prev, ...expandSet]));
            }
          }
        }
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [containers]);

  // Set default selected container if none selected
  useEffect(() => {
    if (!selectedContainerId && containers.length > 0) {
      setSelectedContainerId(containers[0].id);
      if (containers[0].id) {
        setExpandedIds(prev => new Set([...prev, containers[0].id]));
      }
    }
  }, [containers, selectedContainerId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectContainer = (containerId: string, shouldScroll = true) => {
    setSelectedContainerId(containerId);
    setMobileView('detail');
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(window.history.state, '', `#storage/${containerId}`);
    }

    // Expand all ancestors in tree
    const expandSet = new Set<string>();
    let cur = containers.find(c => c.id === containerId);
    while (cur && cur.parentId) {
      expandSet.add(cur.parentId);
      cur = containers.find(c => c.id === cur?.parentId);
    }
    if (expandSet.size > 0) {
      setExpandedIds(prev => new Set([...prev, ...expandSet]));
    }

    if (shouldScroll && typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  };

  const selectedContainer = containers.find(c => c.id === selectedContainerId) || containers[0] || null;

  // Direct child containers for the selected container
  const childContainers = useMemo(() => {
    if (!selectedContainer) return [];
    return containers.filter(c => c.parentId === selectedContainer.id);
  }, [containers, selectedContainer]);

  // Breadcrumb generator
  const getBreadcrumbs = (containerId: string | null): StorageContainerDisplay[] => {
    const crumbs: StorageContainerDisplay[] = [];
    let current = containers.find(c => c.id === containerId);
    while (current) {
      crumbs.unshift(current);
      current = containers.find(c => c.id === current?.parentId);
    }
    return crumbs;
  };

  // Computed helpers for overview and tabs
  const totalBulkQuantity = useMemo(() => {
    if (!selectedContainer) return 0;
    return selectedContainer.bulkItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  }, [selectedContainer]);

  const lowStockCount = useMemo(() => {
    if (!selectedContainer) return 0;
    return selectedContainer.bulkItems.filter(
      b => b.minQuantity !== null && b.minQuantity !== undefined && b.quantity <= b.minQuantity
    ).length;
  }, [selectedContainer]);

  const parentContainer = useMemo(() => {
    if (!selectedContainer?.parentId) return null;
    return containers.find(c => c.id === selectedContainer.parentId) || null;
  }, [containers, selectedContainer]);

  // Filtered bulk items based on local search query in bulk tab
  const filteredBulkItems = useMemo(() => {
    if (!selectedContainer) return [];
    if (!bulkSearchQuery.trim()) return selectedContainer.bulkItems;
    const q = bulkSearchQuery.toLowerCase();
    return selectedContainer.bulkItems.filter(b =>
      b.name.toLowerCase().includes(q) || (b.notes && b.notes.toLowerCase().includes(q))
    );
  }, [selectedContainer, bulkSearchQuery]);

  // Filtered assigned items based on local search query in items tab
  const filteredAssignedItems = useMemo(() => {
    if (!selectedContainer) return [];
    if (!assignedItemSearchQuery.trim()) return selectedContainer.items;
    const q = assignedItemSearchQuery.toLowerCase();
    return selectedContainer.items.filter(i =>
      i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)
    );
  }, [selectedContainer, assignedItemSearchQuery]);

  // Adjust quantity for bulk items
  const handleAdjustQuantity = async (bulkItemId: string, delta: number) => {
    if (isRealDataActive) {
      try {
        await adjustContainerItemQuantity(bulkItemId, delta);
        showToast(`Mennyiség módosítva (${delta > 0 ? `+${delta}` : delta})`);
      } catch (err: any) {
        showToast(err?.message || 'Hiba a darabszám frissítésekor');
      }
    } else {
      showToast(`Minta adat módosítva (${delta > 0 ? `+${delta}` : delta})`);
    }
  };

  // Delete bulk item (and safe R2 photo cleanup after DB deletion)
  const handleDeleteBulkItem = async (bulkItemId: string) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a készlettételt?')) return;
    const itemToDelete = selectedContainer?.bulkItems.find(b => b.id === bulkItemId);
    try {
      if (isRealDataActive) {
        await deleteContainerItem(bulkItemId);
        if (itemToDelete?.photoUrl) {
          try {
            await deleteFileFromStorage(itemToDelete.photoUrl);
          } catch (delErr) {
            console.warn('R2 photo delete error:', delErr);
          }
        }
        showToast('Készlettétel törölve.');
      } else {
        showToast('Minta tétel törölve.');
      }
    } catch (err: any) {
      showToast(err?.message || 'Hiba a tétel törlésekor');
    }
  };

  // Update photo for existing bulk item
  const handleUpdateBulkItemPhoto = async (bulkId: string, currentPhotoUrl: string | null | undefined, file: File) => {
    if (!user?.id || !file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Csak képfájlok tölthetők fel.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('A kép mérete maximum 15 MB lehet.');
      return;
    }
    setUploadingBulkItemId(bulkId);
    try {
      const res = await uploadFileToStorage(file, 'photos', user.id);
      const newPhotoUrl = res.signedUrl || res.path;
      if (!newPhotoUrl) {
        throw new Error(res.error || 'A feltöltés nem sikerült');
      }
      // Update database first
      await updateContainerItem(bulkId, { photo_url: newPhotoUrl });
      // Only clean up old photo after DB update succeeds
      if (currentPhotoUrl && currentPhotoUrl !== newPhotoUrl) {
        try {
          await deleteFileFromStorage(currentPhotoUrl);
        } catch (delErr) {
          console.warn('Old photo cleanup warning:', delErr);
        }
      }
      showToast('Kép sikeresen frissítve!');
    } catch (err: any) {
      showToast(err?.message || 'Hiba a kép mentésekor');
    } finally {
      setUploadingBulkItemId(null);
    }
  };

  // Remove photo from existing bulk item
  const handleRemoveBulkItemPhoto = async (bulkId: string, photoUrl: string) => {
    if (!window.confirm('Biztosan törölni szeretnéd a készlettétel fényképét?')) return;
    setUploadingBulkItemId(bulkId);
    try {
      await updateContainerItem(bulkId, { photo_url: null });
      try {
        await deleteFileFromStorage(photoUrl);
      } catch (delErr) {
        console.warn('R2 photo delete warning:', delErr);
      }
      showToast('Kép sikeresen eltávolítva.');
    } catch (err: any) {
      showToast(err?.message || 'Hiba a kép eltávolításakor');
    } finally {
      setUploadingBulkItemId(null);
    }
  };

  // Create new container
  const handleCreateContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContainerName.trim()) return;

    setIsSubmitting(true);
    try {
      if (isAuthenticated) {
        // Enforce parent-child scope compatibility
        if (newContainerParentId) {
          const parentCont = containers.find(c => c.id === newContainerParentId);
          if (parentCont?.ownership_scope === 'private' && newContainerScope === 'household') {
            throw new Error('Privát tároló alá nem helyezhető el családi megosztású tároló!');
          }
        }

        const created = await createStorageContainer({
          name: newContainerName.trim(),
          container_type: newContainerType,
          parent_container_id: newContainerParentId ? newContainerParentId : null,
          location_id: newContainerParentId ? null : (newContainerLocationId ? newContainerLocationId : null),
          notes: newContainerDesc.trim() || null,
          ownership_scope: newContainerScope,
          household_id: newContainerScope === 'household' ? (household?.id || null) : null,
          photo_url: serializeContainerPhotos(newContainerPhotos),
          user_id: '',
        });

        if (created?.id) {
          if (newContainerParentId) {
            setExpandedIds(prev => new Set([...prev, newContainerParentId]));
          }
          handleSelectContainer(created.id, true);
        }
        showToast(`"${newContainerName.trim()}" tároló sikeresen létrehozva a Supabase-ben!`);
      } else {
        showToast(`"${newContainerName.trim()}" hozzáadva a helyi előnézethez.`);
      }

      setIsCreateModalOpen(false);
      setNewContainerName('');
      setNewContainerType('box');
      setNewContainerParentId('');
      setNewContainerLocationId('');
      setNewContainerDesc('');
      setNewContainerScope('private');
      setNewContainerPhotos([]);
      setNewPhotoError(null);
    } catch (err: any) {
      console.error('Tároló létrehozási hiba:', err);
      showToast(err?.message || 'Hiba a tároló mentésekor');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit modal for selected container
  const handleOpenEditModal = () => {
    if (!selectedContainer) return;
    setEditContainerName(selectedContainer.name);
    setEditContainerType(selectedContainer.containerType);
    setEditContainerParentId(selectedContainer.parentId || '');
    setEditContainerLocationId(selectedContainer.locationId || '');
    setEditContainerDesc(selectedContainer.description || '');
    setEditContainerPhotos(selectedContainer.photos || []);
    setEditPhotoError(null);
    setIsEditModalOpen(true);
  };

  // Update existing container
  const handleUpdateContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContainer || !editContainerName.trim()) return;

    setIsSubmitting(true);
    try {
      if (editContainerParentId) {
        if (editContainerParentId === selectedContainer.id) {
          throw new Error('Egy tároló nem lehet önmaga szülője!');
        }
        const parentCont = containers.find(c => c.id === editContainerParentId);
        if (parentCont?.ownership_scope === 'private' && selectedContainer.ownership_scope === 'household') {
          throw new Error('Privát tároló alá nem helyezhető el családi tároló!');
        }
      }

      await updateStorageContainer(selectedContainer.id, {
        name: editContainerName.trim(),
        container_type: editContainerType,
        parent_container_id: editContainerParentId ? editContainerParentId : null,
        location_id: editContainerParentId ? undefined : (editContainerLocationId ? editContainerLocationId : null),
        notes: editContainerDesc.trim() || null,
        photo_url: serializeContainerPhotos(editContainerPhotos),
      });

      showToast(`"${editContainerName.trim()}" tároló sikeresen frissítve!`);
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error('Tároló módosítási hiba:', err);
      showToast(err?.message || 'Hiba a tároló módosításakor');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upload photos for create modal
  const handleUploadNewPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user?.id) return;
    setIsUploadingNewPhotos(true);
    setNewPhotoError(null);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          setNewPhotoError('Csak képfájlok (JPG, PNG, WebP) tölthetők fel.');
          continue;
        }
        if (file.size > 15 * 1024 * 1024) {
          setNewPhotoError('A fájl mérete nem haladhatja meg a 15 MB-ot.');
          continue;
        }
        const res = await uploadFileToStorage(file, 'photos', user.id);
        if (res.signedUrl || res.path) {
          uploaded.push(res.signedUrl || res.path || '');
        } else if (res.error) {
          setNewPhotoError(res.error);
        }
      }
      if (uploaded.length > 0) {
        setNewContainerPhotos(prev => [...prev, ...uploaded]);
      }
    } catch (err: any) {
      setNewPhotoError(err?.message || 'Hiba a képek feltöltésekor');
    } finally {
      setIsUploadingNewPhotos(false);
      e.target.value = '';
    }
  };

  // Upload photos for edit modal
  const handleUploadEditPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user?.id) return;
    setIsUploadingEditPhotos(true);
    setEditPhotoError(null);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          setEditPhotoError('Csak képfájlok (JPG, PNG, WebP) tölthetők fel.');
          continue;
        }
        if (file.size > 15 * 1024 * 1024) {
          setEditPhotoError('A fájl mérete nem haladhatja meg a 15 MB-ot.');
          continue;
        }
        const res = await uploadFileToStorage(file, 'photos', user.id);
        if (res.signedUrl || res.path) {
          uploaded.push(res.signedUrl || res.path || '');
        } else if (res.error) {
          setEditPhotoError(res.error);
        }
      }
      if (uploaded.length > 0) {
        setEditContainerPhotos(prev => [...prev, ...uploaded]);
      }
    } catch (err: any) {
      setEditPhotoError(err?.message || 'Hiba a képek feltöltésekor');
    } finally {
      setIsUploadingEditPhotos(false);
      e.target.value = '';
    }
  };

  // Upload photo directly on detail panel
  const handleUploadDetailPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedContainer) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user?.id) return;
    setIsUploadingDetailPhoto(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          showToast('Csak képfájlok (JPG, PNG, WebP) tölthetők fel.');
          continue;
        }
        if (file.size > 15 * 1024 * 1024) {
          showToast('A fájl mérete nem haladhatja meg a 15 MB-ot.');
          continue;
        }
        const res = await uploadFileToStorage(file, 'photos', user.id);
        if (res.signedUrl || res.path) {
          uploaded.push(res.signedUrl || res.path || '');
        } else if (res.error) {
          showToast(res.error);
        }
      }
      if (uploaded.length > 0) {
        const nextPhotos = [...selectedContainer.photos, ...uploaded];
        await updateStorageContainer(selectedContainer.id, {
          photo_url: serializeContainerPhotos(nextPhotos)
        });
        showToast(`${uploaded.length} fénykép sikeresen hozzáadva a tárolóhoz!`);
      }
    } catch (err: any) {
      showToast(err?.message || 'Hiba a fénykép feltöltésekor');
    } finally {
      setIsUploadingDetailPhoto(false);
      e.target.value = '';
    }
  };

  // Remove photo directly on detail panel
  const handleRemoveDetailPhoto = async (indexToRemove: number) => {
    if (!selectedContainer) return;
    if (!window.confirm('Biztosan törölni szeretnéd ezt a fényképet a tárolóból?')) return;
    try {
      const nextPhotos = selectedContainer.photos.filter((_, idx) => idx !== indexToRemove);
      await updateStorageContainer(selectedContainer.id, {
        photo_url: serializeContainerPhotos(nextPhotos)
      });
      showToast('Fénykép eltávolítva a tárolóból.');
    } catch (err: any) {
      showToast(err?.message || 'Hiba a fénykép törlésekor');
    }
  };

  // Add bulk item to selected container
  const handleAddBulkItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContainer || !newBulkName.trim()) return;

    setIsSubmitting(true);
    setIsUploadingBulkPhoto(Boolean(bulkPhotoFile));
    try {
      let uploadedPhotoUrl: string | null = null;
      if (bulkPhotoFile && user?.id) {
        const uploadRes = await uploadFileToStorage(bulkPhotoFile, 'photos', user.id);
        if (uploadRes.signedUrl || uploadRes.path) {
          uploadedPhotoUrl = uploadRes.signedUrl || uploadRes.path || null;
        } else if (uploadRes.error) {
          showToast(`Kép feltöltési hiba: ${uploadRes.error}`);
        }
      }

      if (isRealDataActive) {
        const created = await addContainerItem({
          container_id: selectedContainer.id,
          user_id: '',
          ownership_scope: household ? 'household' : 'private',
          name: newBulkName.trim(),
          quantity: Math.max(0, newBulkQty),
          unit: newBulkUnit,
          min_quantity: newBulkMinQty ? Number(newBulkMinQty) : null,
          notes: newBulkNotes.trim() || null,
        });

        if (uploadedPhotoUrl && created?.id) {
          try {
            await updateContainerItem(created.id, { photo_url: uploadedPhotoUrl });
          } catch (updErr) {
            console.warn('Failed to attach photo_url to new bulk item:', updErr);
          }
        }
        showToast(`"${newBulkName.trim()}" tétel hozzáadva!`);
      } else {
        showToast(`Minta készlettétel hozzáadva!`);
      }

      setIsAddBulkModalOpen(false);
      setNewBulkName('');
      setNewBulkQty(1);
      setNewBulkUnit('db');
      setNewBulkMinQty('');
      setNewBulkNotes('');
      setBulkPhotoFile(null);
      setBulkPhotoError(null);
    } catch (err: any) {
      showToast(err?.message || 'Hiba a készlettétel mentésekor');
    } finally {
      setIsSubmitting(false);
      setIsUploadingBulkPhoto(false);
    }
  };

  // Assign existing Thingor item to container
  const handleAssignItem = async (itemId: string) => {
    if (!selectedContainer) return;
    setIsSubmitting(true);
    try {
      await assignItemToContainer(itemId, selectedContainer.id);
      showToast('Tárgy sikeresen hozzárendelve a tárolóhoz!');
      setIsAssignItemModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Hiba a tárgy hozzárendelésekor');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unassign item from container
  const handleUnassignItem = async (itemId: string) => {
    setIsSubmitting(true);
    try {
      await assignItemToContainer(itemId, null);
      showToast('Tárgy eltávolítva a tárolóból.');
    } catch (err: any) {
      showToast(err?.message || 'Hiba a tárgy eltávolításakor');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete container with safety checks
  const handleDeleteContainer = async () => {
    if (!selectedContainer) return;

    const confirmMsg = `Biztosan törölni szeretnéd a(z) "${selectedContainer.name}" tárolót? Csak üres tároló törölhető!`;
    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      if (isRealDataActive) {
        const res = await deleteStorageContainer(selectedContainer.id);
        if (!res.success) {
          alert(res.error || 'A tároló nem törölhető!');
          return;
        }
        showToast('Tároló sikeresen törölve.');
        setSelectedContainerId(null);
      } else {
        showToast('Minta tároló törölve.');
        setSelectedContainerId(null);
      }
    } catch (err: any) {
      alert(err?.message || 'Törlési hiba történt');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eligible parent containers for creation
  const eligibleCreateParents = useMemo(() => {
    return containers.filter(c => {
      if (newContainerScope === 'household') {
        return c.ownership_scope === 'household';
      }
      return true;
    });
  }, [containers, newContainerScope]);

  // Descendants helper for cycle prevention
  const getDescendantIds = useCallback((containerId: string): Set<string> => {
    const descendants = new Set<string>();
    const findChildren = (pid: string) => {
      containers.filter(c => c.parentId === pid).forEach(c => {
        descendants.add(c.id);
        findChildren(c.id);
      });
    };
    findChildren(containerId);
    return descendants;
  }, [containers]);

  // Eligible parent containers for editing (strictly excludes self and descendants, and enforces household scope)
  const eligibleEditParents = useMemo(() => {
    if (!selectedContainer) return [];
    const disallowed = getDescendantIds(selectedContainer.id);
    disallowed.add(selectedContainer.id);
    return containers.filter(c => {
      if (disallowed.has(c.id)) return false;
      if (selectedContainer.ownership_scope === 'household') {
        return c.ownership_scope === 'household';
      }
      return true;
    });
  }, [containers, selectedContainer, getDescendantIds]);

  // Filter root containers for search
  const filteredContainers = containers.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  const rootContainers = filteredContainers.filter(c => !c.parentId);

  // Available unassigned items for assignment modal (strictly respecting ownership scope)
  const assignableItems = useMemo(() => {
    if (!selectedContainer) return [];
    return items.filter(it => {
      if (it.container_id === selectedContainer.id) return false;

      // Ownership scope constraint: private container only accepts private items; household accepts household items
      if (selectedContainer.ownership_scope) {
        if (selectedContainer.ownership_scope === 'household' && it.ownership_scope !== 'household') {
          return false;
        }
        if (selectedContainer.ownership_scope === 'private' && it.ownership_scope === 'household') {
          return false;
        }
      }

      if (!itemSearchQuery.trim()) return true;
      const q = itemSearchQuery.toLowerCase();
      return it.name.toLowerCase().includes(q);
    });
  }, [items, selectedContainer, itemSearchQuery]);

  const renderContainerNode = (container: StorageContainerDisplay, depth = 0) => {
    const children = containers.filter(c => c.parentId === container.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(container.id);
    const isSelected = selectedContainer?.id === container.id;
    const totalItems = container.items.length;
    const totalBulkTypes = container.bulkItems.length;

    const depthIndent = depth === 0
      ? ''
      : depth === 1
      ? 'ml-2 sm:ml-4 border-l-2 border-l-[var(--color-primary-blue,#2563EB)]'
      : 'ml-3.5 sm:ml-7 border-l-2 border-l-[var(--color-primary-blue,#2563EB)]';

    return (
      <div key={container.id} className="space-y-1.5">
        <div
          onClick={() => handleSelectContainer(container.id, true)}
          className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${
            isSelected
              ? 'bg-[var(--card-bg,#3A4551)] border-[var(--color-primary-blue,#2563EB)] shadow-lg shadow-[var(--color-primary-blue,#2563EB)]/10 ring-1 ring-[var(--color-primary-blue,#2563EB)]/50'
              : 'bg-[var(--card-bg,#3A4551)]/60 hover:bg-[var(--card-bg,#3A4551)] border-[var(--border-color,#56616D)]/80 hover:border-[var(--color-primary-blue,#2563EB)]/50'
          } ${depthIndent}`}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 pr-1.5 sm:pr-2">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(container.id);
                }}
                className="p-1 rounded-lg hover:bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                aria-label={isExpanded ? 'Összecsukás' : 'Kinyitás'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)]" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0">
                <Box className="w-4 h-4 text-[var(--text-sub,#B5BDC6)]/40" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="font-bold text-xs sm:text-sm text-white truncate max-w-[170px] sm:max-w-[220px]">
                  {container.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] shrink-0">
                  {CONTAINER_TYPE_LABELS[container.containerType]?.hu || container.containerType}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[var(--text-sub,#B5BDC6)]">
                <MapPin className="w-3 h-3 text-[var(--text-sub,#B5BDC6)]/70 shrink-0" />
                <span className="truncate max-w-[180px]">{container.locationName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 pl-1">
            {totalItems > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20 whitespace-nowrap">
                {totalItems} tárgy
              </span>
            )}
            {totalBulkTypes > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                {totalBulkTypes} tétel
              </span>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1.5 animate-fadeIn">
            {children.map(child => renderContainerNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fadeIn pb-12 w-full max-w-full overflow-x-hidden">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-[var(--card-bg,#3A4551)] border border-[var(--color-primary-blue,#2563EB)] text-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-slideUp">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Status Notice */}
      <div className="rounded-2xl sm:rounded-3xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] p-3.5 sm:p-5 space-y-3 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-white transition-colors border border-[var(--border-color,#56616D)] shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                title="Vissza a fő nézetre"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <Package className="w-5 h-5 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                  <span>Fizikai Tárolók és Raktározás</span>
                </h1>
                {!isRealDataActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-[var(--color-primary-blue,#2563EB)] border border-blue-500/20 shrink-0">
                    MVP Előnézet
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-[var(--text-sub,#B5BDC6)] mt-0.5 truncate sm:whitespace-normal">
                Fizikai tárolódobozok, szekrények, polcok hierarchikus rendszere, készletkezelés és QR-címkézés.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto px-3.5 py-2 min-h-[38px] rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Új tároló létrehozása</span>
            </button>
          </div>
        </div>

        {/* Error Alert Box with Retry */}
        {loadError && (
          <div className="p-3 rounded-xl sm:rounded-2xl bg-rose-950/30 border border-rose-500/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{loadError}</span>
            </div>
            <button
              onClick={loadStorageData}
              className="px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Újrapróbálás</span>
            </button>
          </div>
        )}

        {/* Demo Mode Notice */}
        {!isRealDataActive && (
          <div className="p-3 rounded-xl sm:rounded-2xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]/70 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[11px] sm:text-xs text-[var(--text-sub,#B5BDC6)] leading-relaxed">
              <strong className="text-white font-semibold">Bemutató mintaadatok (Demo mód):</strong> Nem vagy bejelentkezve, ezért a felület minta tárolókat jelenít meg. Jelentkezz be saját felhő tárolóid és készleteid kezeléséhez.
            </div>
          </div>
        )}
      </div>

      {/* Main Layout: Tree Column (Left 300-340px) & Tabbed Detail Workspace (Right) */}
      <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
        {/* Left Column: Container Hierarchy Tree */}
        <div className={`w-full lg:w-[320px] lg:shrink-0 space-y-3 ${
          mobileView === 'detail' ? 'hidden lg:block' : 'block'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Tárolók Hierarchiája
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs text-[var(--text-sub,#B5BDC6)]">
                {containers.length} db tároló
              </span>
              {selectedContainer && (
                <button
                  type="button"
                  onClick={() => setMobileView('detail')}
                  className="lg:hidden text-[11px] text-[var(--color-primary-blue,#2563EB)] font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                >
                  <span>Megnyitás</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-sub,#B5BDC6)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Keresés tároló nevére vagy kódjára..."
              className="w-full pl-10 pr-4 py-2 min-h-[38px] rounded-xl sm:rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-white text-xs placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] transition-colors"
            />
          </div>

          {/* Tree Listing */}
          <div className="space-y-2">
            {isLoading && containers.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2.5 rounded-xl sm:rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)]">
                <Loader2 className="w-6 h-6 text-[var(--color-primary-blue,#2563EB)] animate-spin" />
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Tárolók betöltése a felhőből...</p>
              </div>
            ) : rootContainers.length > 0 ? (
              rootContainers.map(container => renderContainerNode(container, 0))
            ) : containers.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-xl sm:rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-sub,#B5BDC6)] space-y-3">
                <div className="w-10 h-10 mx-auto rounded-xl bg-[var(--surface-bg,#465362)] flex items-center justify-center text-[var(--text-sub,#B5BDC6)]">
                  <Box className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-white text-xs sm:text-sm">Még nincs rögzített tárolód</p>
                  <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] max-w-xs mx-auto">
                    Hozz létre dobozokat, polcokat vagy szekrényeket a fizikai tárgyaid és készleteid rendszerezéséhez!
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  <span>Első tároló létrehozása</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-8 rounded-xl sm:rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-sub,#B5BDC6)]">
                Nincs a keresésnek megfelelő tároló.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Container Detail Panel with Tabs */}
        <div className={`flex-1 min-w-0 w-full ${
          mobileView === 'tree' ? 'hidden lg:block' : 'block'
        }`} ref={detailPanelRef}>
          {selectedContainer ? (
            <div className="rounded-2xl sm:rounded-3xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xl">
              {/* Detail Header & Breadcrumb */}
              <div className="space-y-2.5 pb-3.5 border-b border-[var(--border-color,#56616D)]/60">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Mobile Back to Tree Button */}
                    <button
                      type="button"
                      onClick={() => setMobileView('tree')}
                      className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-white text-[11px] font-semibold border border-[var(--border-color,#56616D)] transition-colors cursor-pointer mr-1"
                    >
                      <ArrowLeft className="w-3 h-3 text-[var(--color-primary-blue,#2563EB)]" />
                      <span>Fa nézet</span>
                    </button>

                    <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-[var(--text-sub,#B5BDC6)] flex-wrap">
                      {getBreadcrumbs(selectedContainer.id).map((crumb, idx, arr) => (
                        <React.Fragment key={crumb.id}>
                          <button
                            onClick={() => handleSelectContainer(crumb.id, false)}
                            className={`hover:text-white transition-colors font-medium truncate max-w-[140px] ${
                              idx === arr.length - 1 ? 'text-[var(--color-primary-blue,#2563EB)] font-bold' : ''
                            }`}
                          >
                            {crumb.name}
                          </button>
                          {idx < arr.length - 1 && <ChevronRight className="w-3 h-3 text-[var(--text-sub,#B5BDC6)]/60 shrink-0" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="lg:hidden text-[10px] text-[var(--color-primary-blue,#2563EB)] hover:text-white flex items-center gap-1 font-semibold shrink-0 py-1 cursor-pointer"
                  >
                    <ArrowUp className="w-3 h-3" />
                    <span>Tetejére</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pt-1">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight break-words flex items-center gap-2">
                      {selectedContainer.name}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-[var(--text-sub,#B5BDC6)] mt-0.5 line-clamp-2">
                      {selectedContainer.description || 'Nincs leírás megadva ehhez a tárolóhoz.'}
                    </p>
                  </div>

                  {/* QR & Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => setIsQrModalOpen(true)}
                      className="px-3 py-1.5 min-h-[34px] rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[var(--border-color,#56616D)] cursor-pointer"
                      title="QR-kód és Címke"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[var(--color-primary-blue,#2563EB)]" />
                      <span>QR-címke</span>
                    </button>

                    {isAuthenticated && (
                      <button
                        onClick={handleOpenEditModal}
                        className="px-3 py-1.5 min-h-[34px] rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[var(--border-color,#56616D)] cursor-pointer"
                        title="Tároló adatainak módosítása"
                      >
                        <Pencil className="w-3.5 h-3.5 text-amber-400" />
                        <span>Szerkesztés</span>
                      </button>
                    )}

                    <button
                      onClick={handleDeleteContainer}
                      disabled={isSubmitting}
                      className="p-2 min-h-[34px] min-w-[34px] rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                      title="Tároló törlése (csak ha üres)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metadata Pills */}
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-sub,#B5BDC6)] flex-wrap pt-1">
                  <span className="font-mono bg-[var(--surface-bg,#465362)] px-2 py-0.5 rounded-md text-[var(--color-primary-blue,#2563EB)] font-bold">
                    {selectedContainer.code}
                  </span>
                  <span className="flex items-center gap-1 bg-[var(--surface-bg,#465362)] px-2 py-0.5 rounded-md">
                    <MapPin className="w-3 h-3 text-[var(--text-sub,#B5BDC6)]" />
                    <span>{selectedContainer.locationName}</span>
                  </span>
                  <span className="bg-[var(--surface-bg,#465362)] px-2 py-0.5 rounded-md">
                    Típus: <strong className="text-white">{CONTAINER_TYPE_LABELS[selectedContainer.containerType]?.hu || selectedContainer.containerType}</strong>
                  </span>
                  <span className="bg-[var(--surface-bg,#465362)] px-2 py-0.5 rounded-md">
                    Hatókör: <strong className="text-white">{selectedContainer.ownership_scope === 'household' ? 'Családi' : 'Privát'}</strong>
                  </span>
                </div>
              </div>

              {/* 4 TABS NAVIGATION */}
              <div className="flex items-center gap-1 border-b border-[var(--border-color,#56616D)]/60 pb-2 overflow-x-auto no-scrollbar text-xs font-bold">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                    activeTab === 'overview'
                      ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-md shadow-blue-500/20'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)]/60'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Áttekintés</span>
                </button>

                <button
                  onClick={() => setActiveTab('bulk')}
                  className={`px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                    activeTab === 'bulk'
                      ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-md shadow-blue-500/20'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)]/60'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Készlet</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'bulk' ? 'bg-white/20 text-white' : 'bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)]'
                  }`}>
                    {selectedContainer.bulkItems.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('items')}
                  className={`px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                    activeTab === 'items'
                      ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-md shadow-blue-500/20'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)]/60'
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Tárgyak</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'items' ? 'bg-white/20 text-white' : 'bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)]'
                  }`}>
                    {selectedContainer.items.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('photos')}
                  className={`px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                    activeTab === 'photos'
                      ? 'bg-[var(--color-primary-blue,#2563EB)] text-white shadow-md shadow-blue-500/20'
                      : 'text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)]/60'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Fényképek</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'photos' ? 'bg-white/20 text-white' : 'bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)]'
                  }`}>
                    {selectedContainer.photos.length}
                  </span>
                </button>
              </div>

              {/* TAB 1: ÁTTEKINTÉS (OVERVIEW) */}
              {activeTab === 'overview' && (
                <div className="space-y-4 sm:space-y-5 animate-fadeIn">
                  {/* 4 Stat Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    <div
                      onClick={() => setActiveTab('bulk')}
                      className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[var(--surface-bg,#465362)]/50 hover:bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]/60 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-1 text-amber-400 mb-1">
                        <Layers className="w-4 h-4" />
                        <span className="text-[10px] font-bold text-[var(--text-sub,#B5BDC6)] group-hover:text-amber-300">Megnyitás →</span>
                      </div>
                      <p className="text-lg sm:text-xl font-black text-white">{selectedContainer.bulkItems.length} <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">tétel</span></p>
                      <p className="text-[10px] text-[var(--text-sub,#B5BDC6)] mt-0.5 truncate">
                        {totalBulkQuantity} egység {lowStockCount > 0 && <span className="text-amber-400 font-bold">({lowStockCount} fogyóban)</span>}
                      </p>
                    </div>

                    <div
                      onClick={() => setActiveTab('items')}
                      className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[var(--surface-bg,#465362)]/50 hover:bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]/60 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-1 text-[var(--color-primary-blue,#2563EB)] mb-1">
                        <Boxes className="w-4 h-4" />
                        <span className="text-[10px] font-bold text-[var(--text-sub,#B5BDC6)] group-hover:text-blue-300">Megnyitás →</span>
                      </div>
                      <p className="text-lg sm:text-xl font-black text-white">{selectedContainer.items.length} <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">db</span></p>
                      <p className="text-[10px] text-[var(--text-sub,#B5BDC6)] mt-0.5 truncate">
                        Hozzárendelt tárgy
                      </p>
                    </div>

                    <div
                      onClick={() => setActiveTab('photos')}
                      className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[var(--surface-bg,#465362)]/50 hover:bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]/60 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-1 text-emerald-400 mb-1">
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-[10px] font-bold text-[var(--text-sub,#B5BDC6)] group-hover:text-emerald-300">Galéria →</span>
                      </div>
                      <p className="text-lg sm:text-xl font-black text-white">{selectedContainer.photos.length} <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">fotó</span></p>
                      <p className="text-[10px] text-[var(--text-sub,#B5BDC6)] mt-0.5 truncate">
                        Dokumentáció
                      </p>
                    </div>

                    <div
                      className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[var(--surface-bg,#465362)]/50 border border-[var(--border-color,#56616D)]/60"
                    >
                      <div className="flex items-center justify-between gap-1 text-purple-400 mb-1">
                        <FolderTree className="w-4 h-4" />
                        <span className="text-[10px] font-bold text-[var(--text-sub,#B5BDC6)]">Hierarchia</span>
                      </div>
                      <p className="text-lg sm:text-xl font-black text-white">{childContainers.length} <span className="text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">altároló</span></p>
                      <p className="text-[10px] text-[var(--text-sub,#B5BDC6)] mt-0.5 truncate">
                        {parentContainer ? `Szülő: ${parentContainer.name}` : 'Fő szintű tároló'}
                      </p>
                    </div>
                  </div>

                  {/* Container Parameters / Info Card */}
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[var(--surface-bg,#465362)]/40 border border-[var(--border-color,#56616D)]/60 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)]" />
                        <span>Tároló Részletes Adatai</span>
                      </h3>
                      {isAuthenticated && (
                        <button
                          onClick={handleOpenEditModal}
                          className="text-xs font-semibold text-[var(--color-primary-blue,#2563EB)] hover:text-blue-400 flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Módosítás</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-[var(--card-bg,#3A4551)]/60 border border-[var(--border-color,#56616D)]/40 flex items-center justify-between gap-2">
                        <span className="text-[var(--text-sub,#B5BDC6)]">Tároló Típusa:</span>
                        <span className="font-semibold text-white">{CONTAINER_TYPE_LABELS[selectedContainer.containerType]?.hu || selectedContainer.containerType}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[var(--card-bg,#3A4551)]/60 border border-[var(--border-color,#56616D)]/40 flex items-center justify-between gap-2">
                        <span className="text-[var(--text-sub,#B5BDC6)]">Helyszín:</span>
                        <span className="font-semibold text-white">{selectedContainer.locationName}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[var(--card-bg,#3A4551)]/60 border border-[var(--border-color,#56616D)]/40 flex items-center justify-between gap-2">
                        <span className="text-[var(--text-sub,#B5BDC6)]">QR / Címkekód:</span>
                        <span className="font-mono font-bold text-[var(--color-primary-blue,#2563EB)]">{selectedContainer.code}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[var(--card-bg,#3A4551)]/60 border border-[var(--border-color,#56616D)]/40 flex items-center justify-between gap-2">
                        <span className="text-[var(--text-sub,#B5BDC6)]">Hatókör / Megosztás:</span>
                        <span className="font-semibold text-white">{selectedContainer.ownership_scope === 'household' ? 'Családi tároló (háztartás)' : 'Személyes privát tároló'}</span>
                      </div>
                      {parentContainer && (
                        <div className="p-2.5 rounded-xl bg-[var(--card-bg,#3A4551)]/60 border border-[var(--border-color,#56616D)]/40 flex items-center justify-between gap-2 sm:col-span-2">
                          <span className="text-[var(--text-sub,#B5BDC6)]">Szülő Tároló a hierarchiában:</span>
                          <button
                            onClick={() => handleSelectContainer(parentContainer.id, true)}
                            className="font-semibold text-[var(--color-primary-blue,#2563EB)] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{parentContainer.name}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {selectedContainer.description && (
                        <div className="p-2.5 rounded-xl bg-[var(--card-bg,#3A4551)]/60 border border-[var(--border-color,#56616D)]/40 sm:col-span-2 space-y-0.5">
                          <span className="text-[10px] text-[var(--text-sub,#B5BDC6)] block">Leírás / Megjegyzés:</span>
                          <p className="text-white text-xs leading-relaxed">{selectedContainer.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sub-containers Showcase in Overview */}
                  {childContainers.length > 0 && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                          <FolderTree className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)]" />
                          <span>Belső Altárolók</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)]">
                            {childContainers.length} db
                          </span>
                        </h3>
                        {isAuthenticated && (
                          <button
                            onClick={() => {
                              setNewContainerParentId(selectedContainer.id);
                              setNewContainerScope(selectedContainer.ownership_scope || 'private');
                              setIsCreateModalOpen(true);
                            }}
                            className="text-xs font-semibold text-[var(--color-primary-blue,#2563EB)] hover:text-blue-400 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Altároló hozzáadása</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {childContainers.map(child => (
                          <div
                            key={child.id}
                            onClick={() => handleSelectContainer(child.id, true)}
                            className="p-3 rounded-xl sm:rounded-2xl bg-[var(--surface-bg,#465362)]/60 hover:bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]/60 hover:border-[var(--color-primary-blue,#2563EB)] transition-all cursor-pointer flex items-center justify-between gap-2.5 group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-lg bg-[var(--card-bg,#3A4551)] text-[var(--color-primary-blue,#2563EB)] flex items-center justify-center shrink-0 border border-[var(--border-color,#56616D)]/60">
                                <Box className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-xs text-white truncate group-hover:text-[var(--color-primary-blue,#2563EB)] transition-colors">
                                  {child.name}
                                </p>
                                <p className="text-[10px] text-[var(--text-sub,#B5BDC6)] truncate">
                                  {CONTAINER_TYPE_LABELS[child.containerType]?.hu || child.containerType}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-[10px] text-[var(--text-sub,#B5BDC6)] shrink-0 font-medium">
                              <span>{child.items.length + child.bulkItems.length} tétel</span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Previews: 2 columns for bulk teaser & items teaser */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Bulk preview teaser */}
                    <div className="p-3.5 rounded-xl sm:rounded-2xl bg-[var(--surface-bg,#465362)]/40 border border-[var(--border-color,#56616D)]/50 space-y-2.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-amber-400" />
                          <span>Készlet ízelítő</span>
                        </span>
                        <button
                          onClick={() => setActiveTab('bulk')}
                          className="text-[11px] font-semibold text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>Összes ({selectedContainer.bulkItems.length})</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      {selectedContainer.bulkItems.length > 0 ? (
                        <div className="space-y-1.5">
                          {selectedContainer.bulkItems.slice(0, 3).map(b => (
                            <div key={b.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[var(--card-bg,#3A4551)]/60">
                              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                                {b.photoUrl ? (
                                  <img src={b.photoUrl} alt={b.name} className="w-5 h-5 rounded-md object-contain bg-black/20 shrink-0" />
                                ) : (
                                  <Package className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                )}
                                <span className="text-white font-medium truncate">{b.name}</span>
                              </div>
                              <span className="font-mono text-amber-300 font-bold text-[11px] shrink-0">{b.quantity} {b.unit}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] italic py-1">Nincsenek rögzített készlettételek.</p>
                      )}
                    </div>

                    {/* Items preview teaser */}
                    <div className="p-3.5 rounded-xl sm:rounded-2xl bg-[var(--surface-bg,#465362)]/40 border border-[var(--border-color,#56616D)]/50 space-y-2.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Boxes className="w-3.5 h-3.5 text-[var(--color-primary-blue,#2563EB)]" />
                          <span>Hozzárendelt tárgyak</span>
                        </span>
                        <button
                          onClick={() => setActiveTab('items')}
                          className="text-[11px] font-semibold text-[var(--color-primary-blue,#2563EB)] hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>Összes ({selectedContainer.items.length})</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      {selectedContainer.items.length > 0 ? (
                        <div className="space-y-1.5">
                          {selectedContainer.items.slice(0, 3).map(it => (
                            <div key={it.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[var(--card-bg,#3A4551)]/60">
                              <span className="text-white font-medium truncate max-w-[150px]">{it.name}</span>
                              <span className="text-[10px] text-[var(--text-sub,#B5BDC6)] truncate">{it.category}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] italic py-1">Nincsenek hozzárendelt Thingor tárgyak.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: KÉSZLET (BULK ITEMS) */}
              {activeTab === 'bulk' && (
                <div className="space-y-3.5 sm:space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs sm:text-sm font-bold text-white">
                        Ömlesztett / Mennyiségi Készlettételek
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)]">
                        {selectedContainer.bulkItems.length} tétel
                      </span>
                    </div>

                    <button
                      onClick={() => setIsAddBulkModalOpen(true)}
                      className="w-full sm:w-auto px-3.5 py-1.5 min-h-[34px] rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Új készlettétel</span>
                    </button>
                  </div>

                  {/* Search within bulk items */}
                  {selectedContainer.bulkItems.length > 2 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sub,#B5BDC6)]" />
                      <input
                        type="text"
                        value={bulkSearchQuery}
                        onChange={(e) => setBulkSearchQuery(e.target.value)}
                        placeholder="Keresés készlettétel nevére vagy megjegyzésére..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)] text-white text-xs placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                  )}

                  {/* Bulk Items List */}
                  {filteredBulkItems.length > 0 ? (
                    <div className="space-y-2">
                      {filteredBulkItems.map(bulk => {
                        const isLowStock = bulk.minQuantity !== null && bulk.minQuantity !== undefined && bulk.quantity <= bulk.minQuantity;

                        return (
                          <div
                            key={bulk.id}
                            className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[var(--surface-bg,#465362)]/60 border text-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 ${
                              isLowStock ? 'border-amber-500/50 bg-amber-500/5' : 'border-[var(--border-color,#56616D)]/60'
                            }`}
                          >
                            {/* Left / Top: Thumbnail & Name / Info */}
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                              {/* Thumbnail frame */}
                              <div
                                onClick={() => {
                                  if (bulk.photoUrl) {
                                    openImageViewer([bulk.photoUrl], { title: bulk.name, activeIndex: 0 });
                                  }
                                }}
                                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-black/20 border border-[var(--border-color,#56616D)] flex items-center justify-center shrink-0 relative group ${
                                  bulk.photoUrl ? 'cursor-pointer hover:border-amber-400/80 transition-colors' : ''
                                }`}
                                title={bulk.photoUrl ? 'Kattints a nagyobb mérethez' : undefined}
                              >
                                {bulk.photoUrl ? (
                                  <>
                                    <img
                                      src={bulk.photoUrl}
                                      alt={bulk.name}
                                      className="w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform duration-200"
                                      loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Maximize2 className="w-3.5 h-3.5 text-white drop-shadow" />
                                    </div>
                                  </>
                                ) : (
                                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--text-sub,#B5BDC6)]/60" />
                                )}
                              </div>

                              {/* Details */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-white text-xs sm:text-sm break-words line-clamp-2">{bulk.name}</p>
                                  {isLowStock && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-md font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                      Alacsony készlet!
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-[var(--text-sub,#B5BDC6)] mt-0.5 flex-wrap">
                                  <span>Mértékegység: <strong className="text-white">{bulk.unit}</strong></span>
                                  {bulk.minQuantity !== null && bulk.minQuantity !== undefined && (
                                    <>
                                      <span>•</span>
                                      <span className={isLowStock ? 'text-amber-400 font-semibold' : ''}>
                                        Min. szint: {bulk.minQuantity} {bulk.unit}
                                      </span>
                                    </>
                                  )}
                                  {bulk.notes && (
                                    <>
                                      <span>•</span>
                                      <span className="italic truncate max-w-[200px]">{bulk.notes}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right / Bottom (mobile): Interactive Counter, Photo Actions & Delete */}
                            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t border-[var(--border-color,#56616D)]/30 sm:border-0 w-full sm:w-auto">
                              <div className="flex items-center gap-1 bg-[var(--card-bg,#3A4551)] p-1 rounded-xl border border-[var(--border-color,#56616D)]/80">
                                <button
                                  onClick={() => handleAdjustQuantity(bulk.id, -1)}
                                  disabled={bulk.quantity <= 0}
                                  className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-[var(--surface-bg,#465362)] hover:bg-rose-600 disabled:opacity-30 disabled:hover:bg-[var(--surface-bg,#465362)] text-white transition-colors active:scale-95 cursor-pointer"
                                  title="Csökkentés (-1)"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs font-mono font-black text-white px-2 min-w-[36px] text-center">
                                  {bulk.quantity}
                                </span>
                                <button
                                  onClick={() => handleAdjustQuantity(bulk.id, 1)}
                                  className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-[var(--surface-bg,#465362)] hover:bg-emerald-600 text-white transition-colors active:scale-95 cursor-pointer"
                                  title="Növelés (+1)"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {/* Photo upload / replace button */}
                                {isAuthenticated && (
                                  <label
                                    className={`p-2 rounded-xl bg-[var(--card-bg,#3A4551)] hover:bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white transition-colors cursor-pointer border border-[var(--border-color,#56616D)]/60 ${
                                      uploadingBulkItemId === bulk.id ? 'opacity-50 pointer-events-none' : ''
                                    }`}
                                    title={bulk.photoUrl ? 'Kép cseréje' : 'Kép hozzáadása'}
                                  >
                                    {uploadingBulkItemId === bulk.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                    ) : (
                                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={uploadingBulkItemId === bulk.id}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleUpdateBulkItemPhoto(bulk.id, bulk.photoUrl, file);
                                        }
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                )}

                                {/* Remove photo button (if photo exists) */}
                                {isAuthenticated && bulk.photoUrl && (
                                  <button
                                    onClick={() => handleRemoveBulkItemPhoto(bulk.id, bulk.photoUrl!)}
                                    disabled={uploadingBulkItemId === bulk.id}
                                    className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-colors cursor-pointer border border-amber-500/20"
                                    title="Kép törlése"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteBulkItem(bulk.id)}
                                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer border border-rose-500/20"
                                  title="Készlettétel törlése"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : selectedContainer.bulkItems.length > 0 ? (
                    <div className="text-center py-8 rounded-xl bg-[var(--surface-bg,#465362)]/30 border border-dashed border-[var(--border-color,#56616D)]/50 text-xs text-[var(--text-sub,#B5BDC6)]">
                      Nincs a keresésnek megfelelő készlettétel.
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-[var(--surface-bg,#465362)]/30 border border-dashed border-[var(--border-color,#56616D)]/50 text-center text-xs text-[var(--text-sub,#B5BDC6)] space-y-2">
                      <div className="w-10 h-10 mx-auto rounded-xl bg-[var(--surface-bg,#465362)] flex items-center justify-center text-amber-400">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-white text-xs sm:text-sm">Nincsenek készlettételek ebben a tárolóban</p>
                        <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] max-w-sm mx-auto">
                          Rögzíts ömlesztett aprócikkeket, csavarokat, alkatrészeket, kábeleket vagy fogyóeszközöket!
                        </p>
                      </div>
                      <button
                        onClick={() => setIsAddBulkModalOpen(true)}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Első készlettétel rögzítése</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TÁRGYAK (ASSIGNED ITEMS) */}
              {activeTab === 'items' && (
                <div className="space-y-3.5 sm:space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)]" />
                      <h3 className="text-xs sm:text-sm font-bold text-white">
                        Hozzárendelt Thingor-tárgyak
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)]">
                        {selectedContainer.items.length} db
                      </span>
                    </div>

                    {isAuthenticated && (
                      <button
                        onClick={() => {
                          setItemSearchQuery('');
                          setIsAssignItemModalOpen(true);
                        }}
                        className="w-full sm:w-auto px-3.5 py-1.5 min-h-[34px] rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tárgy hozzárendelése</span>
                      </button>
                    )}
                  </div>

                  {/* Search within assigned items */}
                  {selectedContainer.items.length > 2 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sub,#B5BDC6)]" />
                      <input
                        type="text"
                        value={assignedItemSearchQuery}
                        onChange={(e) => setAssignedItemSearchQuery(e.target.value)}
                        placeholder="Keresés hozzárendelt tárgy nevére vagy kategóriájára..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)] text-white text-xs placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] transition-colors"
                      />
                    </div>
                  )}

                  {/* Items List */}
                  {filteredAssignedItems.length > 0 ? (
                    <div className="space-y-2">
                      {filteredAssignedItems.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-xl sm:rounded-2xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]/60 text-xs"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-bold text-white truncate text-xs sm:text-sm">{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--text-sub,#B5BDC6)]">
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3 text-[var(--color-primary-blue,#2563EB)]" />
                                <span>{item.category}</span>
                              </span>
                              <span>•</span>
                              <span className="font-mono text-blue-400">{item.code}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.isRealItem && (
                              <button
                                onClick={() => setSelectedItemId(item.id)}
                                className="p-2 rounded-xl bg-[var(--card-bg,#3A4551)] hover:bg-[var(--card-bg,#3A4551)]/80 text-[var(--text-sub,#B5BDC6)] hover:text-white transition-colors border border-[var(--border-color,#56616D)]/40 cursor-pointer"
                                title="Tárgy adatlapjának megnyitása"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {item.isRealItem && (
                              <button
                                onClick={() => handleUnassignItem(item.id)}
                                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/20 cursor-pointer"
                                title="Eltávolítás a tárolóból"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedContainer.items.length > 0 ? (
                    <div className="text-center py-8 rounded-xl bg-[var(--surface-bg,#465362)]/30 border border-dashed border-[var(--border-color,#56616D)]/50 text-xs text-[var(--text-sub,#B5BDC6)]">
                      Nincs a keresésnek megfelelő hozzárendelt tárgy.
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-[var(--surface-bg,#465362)]/30 border border-dashed border-[var(--border-color,#56616D)]/50 text-center text-xs text-[var(--text-sub,#B5BDC6)] space-y-2">
                      <div className="w-10 h-10 mx-auto rounded-xl bg-[var(--surface-bg,#465362)] flex items-center justify-center text-[var(--color-primary-blue,#2563EB)]">
                        <Boxes className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-white text-xs sm:text-sm">Még nincs Thingor-tárgy ehhez a tárolóhoz rendelve</p>
                        <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] max-w-sm mx-auto">
                          Társíts meglévő leltározott tárgyakat ehhez a tárolódobozhoz vagy polchoz a gyors kereshetőségért!
                        </p>
                      </div>
                      {isAuthenticated && (
                        <button
                          onClick={() => setIsAssignItemModalOpen(true)}
                          className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tárgy hozzárendelése</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: FÉNYKÉPEK (PHOTOS) */}
              {activeTab === 'photos' && (
                <div className="space-y-3.5 sm:space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)]" />
                      <h3 className="text-xs sm:text-sm font-bold text-white">
                        Fényképek és Vizuális Dokumentáció
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)]">
                        {selectedContainer.photos.length} db
                      </span>
                    </div>

                    {isAuthenticated && (
                      <label className={`px-3 py-1.5 min-h-[34px] rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-colors ${
                        isUploadingDetailPhoto ? 'opacity-50 pointer-events-none' : ''
                      }`}>
                        {isUploadingDetailPhoto ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Kép feltöltése</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleUploadDetailPhoto}
                          disabled={isUploadingDetailPhoto}
                        />
                      </label>
                    )}
                  </div>

                  {selectedContainer.photos.length > 0 ? (
                    <div className="space-y-3">
                      {/* Primary Showcase */}
                      <div
                        onClick={() => openImageViewer(selectedContainer.photos, { title: selectedContainer.name, activeIndex: 0 })}
                        className="relative w-full h-52 sm:h-64 rounded-2xl overflow-hidden bg-black/40 border border-[var(--border-color,#56616D)] group cursor-pointer shadow-md"
                      >
                        <img
                          src={selectedContainer.photos[0]}
                          alt={selectedContainer.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3.5">
                          <span className="text-xs text-white font-medium flex items-center gap-1">
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Kattints a nagyításhoz</span>
                          </span>
                          {isAuthenticated && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveDetailPhoto(0);
                              }}
                              className="p-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                              title="Kép törlése"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] text-white font-semibold">
                          1 / {selectedContainer.photos.length}
                        </div>
                      </div>

                      {/* Secondary Thumbnails */}
                      {selectedContainer.photos.length > 1 && (
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 pt-1">
                          {selectedContainer.photos.map((photo, pIdx) => (
                            <div
                              key={pIdx}
                              onClick={() => openImageViewer(selectedContainer.photos, { title: selectedContainer.name, activeIndex: pIdx })}
                              className="relative aspect-square rounded-xl overflow-hidden bg-black/30 border border-[var(--border-color,#56616D)] group cursor-pointer"
                            >
                              <img
                                src={photo}
                                alt={`${selectedContainer.name} ${pIdx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="w-3.5 h-3.5 text-white" />
                              </div>
                              {isAuthenticated && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveDetailPhoto(pIdx);
                                  }}
                                  className="absolute top-1 right-1 p-1 rounded-md bg-rose-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Kép törlése"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-[var(--surface-bg,#465362)]/30 border border-dashed border-[var(--border-color,#56616D)]/50 text-center text-xs text-[var(--text-sub,#B5BDC6)] space-y-2">
                      <div className="w-10 h-10 mx-auto rounded-xl bg-[var(--surface-bg,#465362)] flex items-center justify-center text-[var(--text-sub,#B5BDC6)]">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-white text-xs sm:text-sm">Még nincs fénykép feltöltve ehhez a tárolóhoz</p>
                        <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] max-w-sm mx-auto">
                          Tölts fel fotót a dobozról, fiókról vagy polcról, hogy azonnal felismerd a fizikai helyét!
                        </p>
                      </div>
                      {isAuthenticated && (
                        <label className={`mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-white font-semibold text-xs border border-[var(--border-color,#56616D)] cursor-pointer transition-colors ${
                          isUploadingDetailPhoto ? 'opacity-50 pointer-events-none' : ''
                        }`}>
                          {isUploadingDetailPhoto ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-primary-blue,#2563EB)]" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-[var(--color-primary-blue,#2563EB)]" />
                          )}
                          <span>{isUploadingDetailPhoto ? 'Feltöltés...' : 'Első kép feltöltése'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleUploadDetailPhoto}
                            disabled={isUploadingDetailPhoto}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl sm:rounded-3xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] p-6 sm:p-8 text-center text-[var(--text-sub,#B5BDC6)] text-xs space-y-2">
              <Box className="w-8 h-8 text-[var(--text-sub,#B5BDC6)]/40 mx-auto" />
              <p className="font-bold text-white text-xs sm:text-sm">
                {containers.length === 0 ? 'Nincs megjeleníthető tároló' : 'Nincs kiválasztott tároló'}
              </p>
              <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] max-w-xs mx-auto">
                {containers.length === 0
                  ? 'Kattints az új tároló létrehozása gombra az első tárolód felvételéhez.'
                  : 'Válassz ki egy tárolót a bal oldali fa struktúrából a részletek megtekintéséhez.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Create Container Form */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl my-auto overflow-hidden">
            <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-[var(--border-color,#56616D)]/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--color-primary-blue,#2563EB)]/15 text-[var(--color-primary-blue,#2563EB)]">
                  <Box className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">Új Tároló Létrehozása</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white transition-colors cursor-pointer"
                aria-label="Bezárás"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContainer} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4">
              <div>
                <label className="text-xs font-bold text-white block mb-1">Tároló Neve *</label>
                <input
                  type="text"
                  required
                  value={newContainerName}
                  onChange={(e) => setNewContainerName(e.target.value)}
                  placeholder="Pl. Kis alkatrészes fiók, Szerszámos láda"
                  className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs sm:text-sm placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>

              {/* Ownership scope selection (if user has household) */}
              {household && (
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Tároló Hatóköre *</label>
                  <select
                    value={newContainerScope}
                    onChange={(e) => {
                      const val = e.target.value as 'private' | 'household';
                      setNewContainerScope(val);
                      if (val === 'household' && newContainerParentId) {
                        const p = containers.find(c => c.id === newContainerParentId);
                        if (p?.ownership_scope === 'private') {
                          setNewContainerParentId('');
                        }
                      }
                    }}
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs sm:text-sm focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  >
                    <option value="private" className="bg-[var(--card-bg,#3A4551)]">Személyes tároló (Csak én látom)</option>
                    <option value="household" className="bg-[var(--card-bg,#3A4551)]">Családi tároló ({household.name})</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Tároló Típusa *</label>
                  <select
                    value={newContainerType}
                    onChange={(e) => setNewContainerType(e.target.value as ContainerType)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs sm:text-sm focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  >
                    {Object.entries(CONTAINER_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val} className="bg-[var(--card-bg,#3A4551)]">
                        {label.hu}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-white block mb-1">Szülő Tároló (Hierarchia)</label>
                  <select
                    value={newContainerParentId}
                    onChange={(e) => setNewContainerParentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs sm:text-sm focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  >
                    <option value="" className="bg-[var(--card-bg,#3A4551)]">-- Fő szintű tároló (Nincs szülő) --</option>
                    {eligibleCreateParents.map(c => (
                      <option key={c.id} value={c.id} className="bg-[var(--card-bg,#3A4551)]">
                        {c.name} ({CONTAINER_TYPE_LABELS[c.containerType]?.hu || c.containerType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Fizikai Helyszín</label>
                {newContainerParentId ? (
                  <div className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[var(--surface-bg,#465362)]/40 border border-[var(--border-color,#56616D)]/50 text-[var(--text-sub,#B5BDC6)] text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Helyszín a szülőtárolótól örökölve: <strong className="text-white">{containers.find(c => c.id === newContainerParentId)?.locationName || 'Nincs helyszín'}</strong></span>
                  </div>
                ) : (
                  <select
                    value={newContainerLocationId}
                    onChange={(e) => setNewContainerLocationId(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs sm:text-sm focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  >
                    <option value="" className="bg-[var(--card-bg,#3A4551)]">-- Válassz helyszínt (vagy hagyd üresen) --</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id} className="bg-[var(--card-bg,#3A4551)]">
                        {loc.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Megjegyzés / Leírás</label>
                <textarea
                  rows={2}
                  value={newContainerDesc}
                  onChange={(e) => setNewContainerDesc(e.target.value)}
                  placeholder="Belső rekeszek, méretek, kulcs helye..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs sm:text-sm placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>

              {/* Photo Upload in Create Modal */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-white block">Tároló Fényképei</label>
                  <span className="text-[11px] text-[var(--text-sub,#B5BDC6)] font-medium">
                    {newContainerPhotos.length} kép feltöltve
                  </span>
                </div>

                <div className="space-y-2">
                  <label className={`w-full py-3 px-4 rounded-xl border border-dashed border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)]/40 hover:bg-[var(--surface-bg,#465362)]/60 flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs text-[var(--text-sub,#B5BDC6)] font-semibold ${
                    isUploadingNewPhotos ? 'opacity-50 pointer-events-none' : ''
                  }`}>
                    {isUploadingNewPhotos ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary-blue,#2563EB)]" />
                    ) : (
                      <Upload className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)]" />
                    )}
                    <span>{isUploadingNewPhotos ? 'Feltöltés folyamatban...' : '+ Képek feltöltése (JPG, PNG, WebP)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleUploadNewPhotos}
                      disabled={isUploadingNewPhotos}
                    />
                  </label>

                  {newPhotoError && (
                    <p className="text-[11px] text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{newPhotoError}</span>
                    </p>
                  )}

                  {newContainerPhotos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {newContainerPhotos.map((photo, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-black/40 border border-[var(--border-color,#56616D)] group">
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setNewContainerPhotos(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 p-1 rounded-md bg-rose-600/90 hover:bg-rose-600 text-white transition-opacity cursor-pointer"
                            title="Kép eltávolítása"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-color,#56616D)]/60 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 min-h-[40px] rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 min-h-[40px] rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Mentés...' : 'Tároló Mentése'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1B: Edit Container Form */}
      {isEditModalOpen && selectedContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl my-auto overflow-hidden">
            <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-[var(--border-color,#56616D)]/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">Tároló Módosítása</h3>
                  <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] font-mono">{selectedContainer.code}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white transition-colors cursor-pointer"
                aria-label="Bezárás"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateContainer} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4">
              <div>
                <label className="text-xs font-bold text-white block mb-1">Tároló Neve *</label>
                <input
                  type="text"
                  required
                  value={editContainerName}
                  onChange={(e) => setEditContainerName(e.target.value)}
                  placeholder="Pl. Kis alkatrészes fiók, Szerszámos láda"
                  className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs sm:text-sm placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Tároló Típusa *</label>
                  <select
                    value={editContainerType}
                    onChange={(e) => setEditContainerType(e.target.value as ContainerType)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs sm:text-sm focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  >
                    {Object.entries(CONTAINER_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val} className="bg-[var(--card-bg,#3A4551)]">
                        {label.hu}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-white block mb-1">Szülő Tároló (Hierarchia)</label>
                  <select
                    value={editContainerParentId}
                    onChange={(e) => setEditContainerParentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs sm:text-sm focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  >
                    <option value="" className="bg-[var(--card-bg,#3A4551)]">-- Fő szintű tároló (Nincs szülő) --</option>
                    {eligibleEditParents.map(c => (
                      <option key={c.id} value={c.id} className="bg-[var(--card-bg,#3A4551)]">
                        {c.name} ({CONTAINER_TYPE_LABELS[c.containerType]?.hu || c.containerType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Fizikai Helyszín</label>
                {editContainerParentId ? (
                  <div className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[var(--surface-bg,#465362)]/40 border border-[var(--border-color,#56616D)]/50 text-[var(--text-sub,#B5BDC6)] text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Helyszín a szülőtárolótól örökölve: <strong className="text-white">{containers.find(c => c.id === editContainerParentId)?.locationName || 'Nincs helyszín'}</strong></span>
                  </div>
                ) : (
                  <select
                    value={editContainerLocationId}
                    onChange={(e) => setEditContainerLocationId(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs sm:text-sm focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                  >
                    <option value="" className="bg-[var(--card-bg,#3A4551)]">-- Válassz helyszínt (vagy hagyd üresen) --</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id} className="bg-[var(--card-bg,#3A4551)]">
                        {loc.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Megjegyzés / Leírás</label>
                <textarea
                  rows={2}
                  value={editContainerDesc}
                  onChange={(e) => setEditContainerDesc(e.target.value)}
                  placeholder="Belső rekeszek, méretek, kulcs helye..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs sm:text-sm placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>

              {/* Photo Upload in Edit Modal */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-white block">Tároló Fényképei</label>
                  <span className="text-[11px] text-[var(--text-sub,#B5BDC6)] font-medium">
                    {editContainerPhotos.length} kép feltöltve
                  </span>
                </div>

                <div className="space-y-2">
                  <label className={`w-full py-3 px-4 rounded-xl border border-dashed border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)]/40 hover:bg-[var(--surface-bg,#465362)]/60 flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs text-[var(--text-sub,#B5BDC6)] font-semibold ${
                    isUploadingEditPhotos ? 'opacity-50 pointer-events-none' : ''
                  }`}>
                    {isUploadingEditPhotos ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary-blue,#2563EB)]" />
                    ) : (
                      <Upload className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)]" />
                    )}
                    <span>{isUploadingEditPhotos ? 'Feltöltés folyamatban...' : '+ Képek feltöltése (JPG, PNG, WebP)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleUploadEditPhotos}
                      disabled={isUploadingEditPhotos}
                    />
                  </label>

                  {editPhotoError && (
                    <p className="text-[11px] text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{editPhotoError}</span>
                    </p>
                  )}

                  {editContainerPhotos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {editContainerPhotos.map((photo, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-black/40 border border-[var(--border-color,#56616D)] group">
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setEditContainerPhotos(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 p-1 rounded-md bg-rose-600/90 hover:bg-rose-600 text-white transition-opacity cursor-pointer"
                            title="Kép eltávolítása"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-color,#56616D)]/60 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 min-h-[40px] rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 min-h-[40px] rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Mentés...' : 'Módosítások Mentése'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Assign Item Modal */}
      {isAssignItemModalOpen && selectedContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl sm:rounded-3xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-6 pb-3 border-b border-[var(--border-color,#56616D)]/60 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">Tárgy Hozzárendelése</h3>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Tároló: <strong className="text-white">{selectedContainer.name}</strong></p>
              </div>
              <button
                onClick={() => setIsAssignItemModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-[var(--border-color,#56616D)]/60">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sub,#B5BDC6)]" />
                <input
                  type="text"
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  placeholder="Keresés saját tárgyaid között..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {assignableItems.length > 0 ? (
                assignableItems.map(it => {
                  const currentCont = it.container_id ? containers.find(c => c.id === it.container_id) : null;
                  return (
                    <div
                      key={it.id}
                      onClick={() => handleAssignItem(it.id)}
                      className="p-3 rounded-xl bg-[var(--surface-bg,#465362)]/60 hover:bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{it.name}</p>
                        <p className="text-[10px] text-[var(--text-sub,#B5BDC6)]">
                          {currentCont ? `Jelenlegi tároló: ${currentCont.name}` : 'Még nincs tárolóhoz rendelve'}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-[var(--color-primary-blue,#2563EB)] text-white text-[11px] font-bold shrink-0">
                        Kiválasztás
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-center py-6 text-xs text-[var(--text-sub,#B5BDC6)]">
                  Nincs hozzárendelhető tárgy.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Bulk Item Modal */}
      {isAddBulkModalOpen && selectedContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color,#56616D)]/60 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Új Mennyiségi Készlettétel</h3>
                <p className="text-xs text-[var(--text-sub,#B5BDC6)]">Tároló: <strong className="text-white">{selectedContainer.name}</strong></p>
              </div>
              <button
                onClick={() => setIsAddBulkModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBulkItem} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-white block mb-1">Tétel Megnevezése *</label>
                <input
                  type="text"
                  required
                  value={newBulkName}
                  onChange={(e) => setNewBulkName(e.target.value)}
                  placeholder="Pl. M4x20 csavar, Ragasztószalag"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Kezdő Mennyiség *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={newBulkQty}
                    onChange={(e) => setNewBulkQty(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white block mb-1">Mértékegység *</label>
                  <select
                    value={newBulkUnit}
                    onChange={(e) => setNewBulkUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs"
                  >
                    {BULK_UNITS.map(u => (
                      <option key={u} value={u} className="bg-[var(--card-bg,#3A4551)]">{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Minimum Készlet (Értesítéshez)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newBulkMinQty}
                  onChange={(e) => setNewBulkMinQty(e.target.value)}
                  placeholder="Opcionális küszöbérték"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs"
                />
              </div>

              {/* Photo Upload for new bulk item */}
              <div>
                <label className="text-xs font-bold text-white block mb-1">Fénykép (Opcionális)</label>
                {bulkPhotoFile && bulkPhotoPreviewUrl ? (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-black/30 border border-[var(--border-color,#56616D)] shrink-0 flex items-center justify-center">
                      <img src={bulkPhotoPreviewUrl} alt="Előnézet" className="w-full h-full object-contain p-0.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate">{bulkPhotoFile.name}</p>
                      <p className="text-[10px] text-[var(--text-sub,#B5BDC6)]">{(bulkPhotoFile.size / 1024).toFixed(0)} KB</p>
                      <label className="text-xs text-amber-400 hover:underline cursor-pointer font-semibold inline-block mt-1">
                        Kép cseréje
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (!file.type.startsWith('image/')) {
                                setBulkPhotoError('Csak képfájlok (JPG, PNG, WebP) tölthetők fel.');
                              } else if (file.size > 15 * 1024 * 1024) {
                                setBulkPhotoError('A kép mérete maximum 15 MB lehet.');
                              } else {
                                setBulkPhotoError(null);
                                setBulkPhotoFile(file);
                              }
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkPhotoFile(null);
                        setBulkPhotoError(null);
                      }}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                      title="Kép eltávolítása"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-[var(--border-color,#56616D)] hover:border-amber-400/80 bg-[var(--surface-bg,#465362)]/40 hover:bg-[var(--surface-bg,#465362)]/60 cursor-pointer transition-colors group">
                    <div className="w-9 h-9 rounded-lg bg-[var(--card-bg,#3A4551)] flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white">Kép feltöltése vagy készítése</p>
                      <p className="text-[10px] text-[var(--text-sub,#B5BDC6)]">JPG, PNG vagy WebP (opcionális)</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (!file.type.startsWith('image/')) {
                            setBulkPhotoError('Csak képfájlok (JPG, PNG, WebP) tölthetők fel.');
                          } else if (file.size > 15 * 1024 * 1024) {
                            setBulkPhotoError('A kép mérete maximum 15 MB lehet.');
                          } else {
                            setBulkPhotoError(null);
                            setBulkPhotoFile(file);
                          }
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}

                {bulkPhotoError && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{bulkPhotoError}</span>
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddBulkModalOpen(false);
                    setBulkPhotoFile(null);
                    setBulkPhotoError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--surface-bg,#465362)] text-white text-xs font-bold"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:opacity-50"
                >
                  {isSubmitting ? (isUploadingBulkPhoto ? 'Kép feltöltése...' : 'Mentés...') : 'Tétel Mentése'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: QR-kód és Címkenyomtatás */}
      {isQrModalOpen && selectedContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl sm:rounded-3xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl p-5 sm:p-6 text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color,#56616D)]/60">
              <h3 className="font-bold text-white text-sm">Tároló QR Címke</h3>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Label Preview Box */}
            <div id="storage-printable-label" className="p-4 rounded-2xl bg-white text-black space-y-2 shadow-inner inline-block mx-auto border-2 border-slate-300">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                THINGOR TÁROLÓ
              </p>
              <div className="p-2 bg-white flex justify-center">
                <QRCodeSVG
                  value={typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#storage/${selectedContainer.id}` : selectedContainer.code}
                  size={150}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs font-extrabold text-slate-900 truncate max-w-[180px] mx-auto">
                {selectedContainer.name}
              </p>
              <p className="font-mono text-[10px] text-slate-600 font-bold">
                {selectedContainer.code}
              </p>
            </div>

            <p className="text-[11px] text-[var(--text-sub,#B5BDC6)]">
              A QR-kód beolvasása a Thingor beépített szkennerével közvetlenül megnyitja ezt a tárolót.
            </p>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 min-h-[38px] rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Nyomtatás</span>
              </button>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="px-4 py-2 min-h-[38px] rounded-xl bg-[var(--surface-bg,#465362)] text-white font-bold text-xs cursor-pointer"
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
