import React, { useState, useRef } from 'react';
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
  Minus
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// Container Types matching migration schema: 'box' | 'shelf' | 'cabinet' | 'drawer' | 'bin' | 'room' | 'shed' | 'other'
export type ContainerType = 'box' | 'shelf' | 'cabinet' | 'drawer' | 'bin' | 'room' | 'shed' | 'other';

export interface StorageItemMock {
  id: string;
  name: string;
  category: string;
  code: string;
}

export interface ContainerBulkItemMock {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface StorageContainerMock {
  id: string;
  parentId: string | null;
  name: string;
  containerType: ContainerType;
  code: string;
  locationName: string;
  description?: string;
  items: StorageItemMock[];
  bulkItems: ContainerBulkItemMock[];
}

const CONTAINER_TYPE_LABELS: Record<ContainerType, { hu: string; en: string }> = {
  room: { hu: 'Helyiség / Tér', en: 'Room / Space' },
  cabinet: { hu: 'Szekrény', en: 'Cabinet' },
  shelf: { hu: 'Polc', en: 'Shelf' },
  shed: { hu: 'Fészer / Kerti tároló', en: 'Shed' },
  box: { hu: 'Doboz', en: 'Box' },
  drawer: { hu: 'Fiók', en: 'Drawer' },
  bin: { hu: 'Tárolóláda / Rekesz', en: 'Bin' },
  other: { hu: 'Egyéb tároló', en: 'Other' },
};

// Initial Mock Data demonstrating the requested hierarchy:
// Műhely -> Szerszámos szekrény -> Felső polc
// Kerti tároló -> Fűnyíró tartozékos doboz
const INITIAL_MOCK_CONTAINERS: StorageContainerMock[] = [
  {
    id: 'cont-1',
    parentId: null,
    name: 'Műhely',
    containerType: 'room',
    code: 'CONT-WS-001',
    locationName: 'Főépület / Alagsor',
    description: 'Fő barkácsműhely és munkaasztal környéke',
    items: [
      { id: 'item-101', name: 'Munkaasztal satu', category: 'Nehézgépek', code: 'ITM-9812' }
    ],
    bulkItems: []
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
      { id: 'item-102', name: 'Makita fúrókalapács HR2470', category: 'Szerszámgép', code: 'ITM-4412' }
    ],
    bulkItems: [
      { id: 'bulk-201', name: 'Szigetelőszalag 10m fekete', quantity: 6, unit: 'db' }
    ]
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
      { id: 'item-103', name: 'Bosch GSB 13 RE ütvefúró', category: 'Elektromos kéziszerszám', code: 'ITM-1029' },
      { id: 'item-104', name: 'Stanley racsnis csavarhúzó készlet', category: 'Kéziszerszám', code: 'ITM-2041' }
    ],
    bulkItems: [
      { id: 'bulk-301', name: 'M6x30 rozsdamentes acélcsavar', quantity: 120, unit: 'db' },
      { id: 'bulk-302', name: 'P120 szemcsés csiszolóvászon', quantity: 15, unit: 'ív' },
      { id: 'bulk-303', name: 'Kábelkötegelő 200mm fekete', quantity: 85, unit: 'db' }
    ]
  },
  {
    id: 'cont-4',
    parentId: null,
    name: 'Kerti tároló',
    containerType: 'shed',
    code: 'CONT-GDN-001',
    locationName: 'Udvar / Hátsó kert',
    description: 'Zárható faház kerti gépeknek és kinti szerszámoknak',
    items: [
      { id: 'item-105', name: 'Fiskars PowerGear sövényvágó', category: 'Kerti eszköz', code: 'ITM-5531' },
      { id: 'item-106', name: 'Gardena tömlőkocsi 50m', category: 'Öntözés', code: 'ITM-5532' }
    ],
    bulkItems: []
  },
  {
    id: 'cont-5',
    parentId: 'cont-4',
    name: 'Fűnyíró tartozékos doboz',
    containerType: 'box',
    code: 'CONT-BOX-002',
    locationName: 'Udvar / Hátsó kert',
    description: 'Műanyag zárható szerszámosláda fűkaszálás kellékeihez',
    items: [
      { id: 'item-107', name: 'Gyújtógyertya kulcs 19mm', category: 'Szerszám', code: 'ITM-7701' }
    ],
    bulkItems: [
      { id: 'bulk-401', name: 'Fűnyíró damil 2.4mm narancs', quantity: 4, unit: 'tekercs' },
      { id: 'bulk-402', name: 'Kerti védőkesztyű (L méret)', quantity: 3, unit: 'pár' }
    ]
  }
];

interface StorageViewProps {
  onClose?: () => void;
}

export const StorageView: React.FC<StorageViewProps> = ({ onClose }) => {
  const [containers, setContainers] = useState<StorageContainerMock[]>(INITIAL_MOCK_CONTAINERS);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['cont-1', 'cont-2', 'cont-4']));
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>('cont-3');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const detailPanelRef = useRef<HTMLDivElement>(null);

  // Form states for creating new container
  const [newContainerName, setNewContainerName] = useState('');
  const [newContainerType, setNewContainerType] = useState<ContainerType>('box');
  const [newContainerParentId, setNewContainerParentId] = useState<string>('');
  const [newContainerLocation, setNewContainerLocation] = useState('Műhely');
  const [newContainerDesc, setNewContainerDesc] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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

  const handleSelectContainer = (containerId: string, shouldScroll = false) => {
    setSelectedContainerId(containerId);
    if (shouldScroll && typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  };

  const selectedContainer = containers.find(c => c.id === selectedContainerId) || null;

  // Breadcrumb generator
  const getBreadcrumbs = (containerId: string | null): StorageContainerMock[] => {
    const crumbs: StorageContainerMock[] = [];
    let current = containers.find(c => c.id === containerId);
    while (current) {
      crumbs.unshift(current);
      current = containers.find(c => c.id === current?.parentId);
    }
    return crumbs;
  };

  // Adjust quantity for bulk items (Interactive local test)
  const handleAdjustQuantity = (containerId: string, bulkItemId: string, delta: number) => {
    setContainers(prev =>
      prev.map(c => {
        if (c.id !== containerId) return c;
        return {
          ...c,
          bulkItems: c.bulkItems.map(b => {
            if (b.id !== bulkItemId) return b;
            const newQty = Math.max(0, b.quantity + delta);
            return { ...b, quantity: newQty };
          })
        };
      })
    );
    showToast(`Mennyiség módosítva (${delta > 0 ? `+${delta}` : delta})`);
  };

  // Create new container in local state
  const handleCreateContainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContainerName.trim()) return;

    const newCode = `CONT-${newContainerType.toUpperCase().slice(0, 3)}-00${containers.length + 1}`;
    const newEntry: StorageContainerMock = {
      id: `cont-custom-${Date.now()}`,
      name: newContainerName.trim(),
      containerType: newContainerType,
      parentId: newContainerParentId ? newContainerParentId : null,
      code: newCode,
      locationName: newContainerLocation || 'Alapértelmezett helyszín',
      description: newContainerDesc.trim() || undefined,
      items: [],
      bulkItems: []
    };

    setContainers(prev => [...prev, newEntry]);
    if (newContainerParentId) {
      setExpandedIds(prev => new Set([...prev, newContainerParentId]));
    }
    setSelectedContainerId(newEntry.id);
    setIsCreateModalOpen(false);

    // Reset inputs
    setNewContainerName('');
    setNewContainerType('box');
    setNewContainerParentId('');
    setNewContainerDesc('');

    showToast(`"${newEntry.name}" tároló sikeresen hozzáadva a helyi mintához!`);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  };

  // Filter root containers
  const filteredContainers = containers.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  const rootContainers = filteredContainers.filter(c => !c.parentId);

  const renderContainerNode = (container: StorageContainerMock, depth = 0) => {
    const children = containers.filter(c => c.parentId === container.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(container.id);
    const isSelected = selectedContainerId === container.id;
    const totalItems = container.items.length;
    const totalBulkTypes = container.bulkItems.length;

    // Indentation scale: gentle on mobile so it doesn't crush width
    const depthIndent = depth === 0
      ? ''
      : depth === 1
      ? 'ml-2 sm:ml-4 border-l-2 border-l-[var(--color-primary-blue,#2563EB)]'
      : 'ml-3.5 sm:ml-7 border-l-2 border-l-[var(--color-primary-blue,#2563EB)]';

    return (
      <div key={container.id} className="space-y-1.5">
        <div
          onClick={() => handleSelectContainer(container.id, false)}
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
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] hover:text-white transition-colors shrink-0"
                aria-label={isExpanded ? 'Összecsukás' : 'Kibontás'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)]" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-7 sm:w-8 flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-sub,#B5BDC6)]/40" />
              </div>
            )}

            <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0 transition-colors ${
              isSelected
                ? 'bg-[var(--color-primary-blue,#2563EB)] text-white'
                : 'bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] group-hover:bg-[var(--surface-bg,#465362)]/80'
            }`}>
              <Box className="w-4 h-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[var(--color-primary-blue,#2563EB)] transition-colors">
                  {container.name}
                </span>
                <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] border border-[var(--border-color,#56616D)]/50 shrink-0">
                  {CONTAINER_TYPE_LABELS[container.containerType]?.hu || container.containerType}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[var(--text-sub,#B5BDC6)] truncate">
                {container.code} • {container.locationName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right hidden md:block">
              <span className="text-xs font-semibold text-white block">
                {totalItems} tárgy
              </span>
              <span className="text-[11px] text-[var(--text-sub,#B5BDC6)]">
                {totalBulkTypes} ömlesztett tétel
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectContainer(container.id, true);
              }}
              className="px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--color-primary-blue,#2563EB)] text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors border border-[var(--border-color,#56616D)]/50 shrink-0 cursor-pointer active:scale-95"
              title="Tároló megnyitása és részletei"
            >
              <span>Megnyitás</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
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

      {/* Header & MVP Notice */}
      <div className="rounded-2xl sm:rounded-3xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] p-4 sm:p-6 md:p-8 space-y-3 sm:space-y-4 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-white transition-colors border border-[var(--border-color,#56616D)] shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                title="Vissza a fő nézetre"
              >
                <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                  <span>Fizikai Tárolók és Raktározás</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-[var(--color-primary-blue,#2563EB)] border border-blue-500/20 shrink-0">
                  MVP Előnézet
                </span>
              </div>
              <p className="text-[11px] sm:text-xs md:text-sm text-[var(--text-sub,#B5BDC6)] mt-1">
                Fizikai tárolódobozok, szekrények, polcok hierarchikus rendszere és QR-címkézése.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 sm:pt-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[40px] rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>+ Új tároló létrehozása</span>
            </button>
          </div>
        </div>

        {/* Local Mock Badge Callout */}
        <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]/70 flex items-start gap-2.5 sm:gap-3">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-[11px] sm:text-xs text-[var(--text-sub,#B5BDC6)] leading-relaxed">
            <strong className="text-white font-semibold">Helyi demonstrációs minta:</strong> Az alábbi tárolók és tételek helyi mintaként működnek a felület kipróbálásához. Közvetlen Supabase-módosítás vagy éles adatbázis-írás nem történik.
          </div>
        </div>
      </div>

      {/* Main Grid: Tree Column (Left on Desktop, Top on Mobile) & Detail Drawer (Right on Desktop, Below on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left Column: Container Hierarchy Tree */}
        <div className="lg:col-span-6 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Tárolók Hierarchiája
              </h2>
            </div>
            <span className="text-[11px] sm:text-xs text-[var(--text-sub,#B5BDC6)]">
              {containers.length} db tároló
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-sub,#B5BDC6)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Keresés tároló nevére vagy kódjára..."
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 min-h-[40px] rounded-xl sm:rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-white text-xs placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] transition-colors"
            />
          </div>

          {/* Tree Listing */}
          <div className="space-y-2">
            {rootContainers.length > 0 ? (
              rootContainers.map(container => renderContainerNode(container, 0))
            ) : (
              <div className="text-center py-8 rounded-xl sm:rounded-2xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-xs text-[var(--text-sub,#B5BDC6)]">
                Nincs a keresésnek megfelelő tároló.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Container Detail Panel */}
        <div className="lg:col-span-6" ref={detailPanelRef}>
          {selectedContainer ? (
            <div className="rounded-2xl sm:rounded-3xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] p-4 sm:p-6 space-y-5 sm:space-y-6 shadow-xl lg:sticky lg:top-24">
              {/* Detail Header & Breadcrumb */}
              <div className="space-y-2.5 pb-4 border-b border-[var(--border-color,#56616D)]/60">
                <div className="flex items-center justify-between gap-2">
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

                  {/* Jump back button on mobile */}
                  <button
                    type="button"
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="lg:hidden text-[10px] text-[var(--color-primary-blue,#2563EB)] hover:text-white flex items-center gap-1 font-semibold shrink-0 py-1 cursor-pointer"
                  >
                    <ArrowUp className="w-3 h-3" />
                    <span>Fel a fához</span>
                  </button>
                </div>

                <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-2 pt-1">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl font-black text-white tracking-tight break-words flex items-center gap-2">
                      {selectedContainer.name}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-[var(--text-sub,#B5BDC6)] mt-0.5">
                      {selectedContainer.description || 'Nincs leírás megadva ehhez a tárolóhoz.'}
                    </p>
                  </div>
                  <span className="self-start px-2.5 sm:px-3 py-1 rounded-xl text-[10px] sm:text-xs font-bold bg-[var(--surface-bg,#465362)] text-white border border-[var(--border-color,#56616D)] shrink-0">
                    {CONTAINER_TYPE_LABELS[selectedContainer.containerType]?.hu || selectedContainer.containerType}
                  </span>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]/50">
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--text-sub,#B5BDC6)] flex items-center gap-1 mb-0.5">
                      <Tag className="w-3 h-3 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                      Azonosító kód
                    </span>
                    <span className="text-xs font-extrabold text-white truncate block">{selectedContainer.code}</span>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]/50">
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--text-sub,#B5BDC6)] flex items-center gap-1 mb-0.5">
                      <MapPin className="w-3 h-3 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                      Helyszín
                    </span>
                    <span className="text-xs font-extrabold text-white truncate block">{selectedContainer.locationName}</span>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-[var(--surface-bg,#465362)]/60 border border-[var(--border-color,#56616D)]/50 xs:col-span-2 sm:col-span-1">
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--text-sub,#B5BDC6)] block mb-0.5">Kapacitás</span>
                    <span className="text-xs font-extrabold text-emerald-400">Raktározásra kész</span>
                  </div>
                </div>
              </div>

              {/* QR-kód Előnézet szekció */}
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[var(--surface-bg,#465362)]/50 border border-[var(--border-color,#56616D)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Tároló QR Címke Előnézet
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    Előnézet
                  </span>
                </div>

                <div className="flex flex-col xs:flex-row items-center xs:items-start gap-3 sm:gap-4 bg-white/5 p-3 rounded-xl border border-white/5 text-center xs:text-left">
                  <div className="p-2 bg-white rounded-xl shadow-inner shrink-0">
                    <QRCodeSVG
                      value={`thingor://storage/${selectedContainer.code}`}
                      size={64}
                      level="M"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-bold text-white truncate">{selectedContainer.code}</p>
                    <p className="text-[11px] text-[var(--text-sub,#B5BDC6)] leading-relaxed">
                      Fizikai dobozra vagy polcra ragasztható azonosító QR kód.
                    </p>
                    <button
                      onClick={() => setIsQrModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--color-primary-blue,#2563EB)] hover:text-white font-semibold transition-colors mt-1 py-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Nagyított címke megtekintése
                    </button>
                  </div>
                </div>
              </div>

              {/* Benne lévő egyedi tárgyak */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-[var(--color-primary-blue,#2563EB)] shrink-0" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Benne lévő Tárgyak ({selectedContainer.items.length})
                    </h3>
                  </div>
                </div>

                {selectedContainer.items.length > 0 ? (
                  <div className="space-y-2">
                    {selectedContainer.items.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]/60 gap-2"
                      >
                        <div className="min-w-0 flex-1 pr-1">
                          <span className="text-xs font-bold text-white block truncate">{item.name}</span>
                          <span className="text-[10px] text-[var(--text-sub,#B5BDC6)] block truncate">{item.category} • {item.code}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-[var(--card-bg,#3A4551)] text-white border border-[var(--border-color,#56616D)]/50 shrink-0">
                          Egyedi tárgy
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)] italic py-2">
                    Ebben a tárolóban jelenleg nincs regisztrált egyedi tárgy.
                  </p>
                )}
              </div>

              {/* Egyszerű mennyiségi tételek */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-color,#56616D)]/60">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Ömlesztett Tételek ({selectedContainer.bulkItems.length})
                    </h3>
                  </div>
                  <span className="text-[10px] text-[var(--text-sub,#B5BDC6)]">
                    Interaktív teszt (+/-)
                  </span>
                </div>

                {selectedContainer.bulkItems.length > 0 ? (
                  <div className="space-y-2">
                    {selectedContainer.bulkItems.map(bulk => (
                      <div
                        key={bulk.id}
                        className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)]/60 gap-2"
                      >
                        <div className="min-w-0 flex-1 pr-1">
                          <span className="text-xs font-bold text-white block truncate">{bulk.name}</span>
                          <span className="text-[10px] text-emerald-400 font-bold block truncate">
                            {bulk.quantity} {bulk.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                          <button
                            onClick={() => handleAdjustQuantity(selectedContainer.id, bulk.id, -1)}
                            disabled={bulk.quantity <= 0}
                            className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-[var(--card-bg,#3A4551)] hover:bg-rose-600 disabled:opacity-30 disabled:hover:bg-[var(--card-bg,#3A4551)] text-white transition-colors active:scale-95 cursor-pointer"
                            title="Csökkentés (-1)"
                            aria-label="Csökkentés"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-mono font-bold text-white px-1 min-w-[28px] sm:min-w-[32px] text-center">
                            {bulk.quantity}
                          </span>
                          <button
                            onClick={() => handleAdjustQuantity(selectedContainer.id, bulk.id, 1)}
                            className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-[var(--card-bg,#3A4551)] hover:bg-emerald-600 text-white transition-colors active:scale-95 cursor-pointer"
                            title="Növelés (+1)"
                            aria-label="Növelés"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-sub,#B5BDC6)] italic py-2">
                    Nincsenek ömlesztett / mennyiségi cikkek ebben a tárolóban.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl sm:rounded-3xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] p-6 sm:p-8 text-center text-[var(--text-sub,#B5BDC6)] text-xs space-y-2">
              <Box className="w-8 h-8 text-[var(--text-sub,#B5BDC6)]/40 mx-auto" />
              <p>Válassz ki egy tárolót a bal oldali fa struktúrából a részletek megtekintéséhez.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Container Form - Mobile Keyboard Friendly with overflow */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl my-auto overflow-hidden">
            {/* Modal Header */}
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

            {/* Modal Body: Scrollable */}
            <form onSubmit={handleCreateContainer} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4">
              <div>
                <label className="text-xs font-bold text-white block mb-1">Tároló Neve *</label>
                <input
                  type="text"
                  required
                  value={newContainerName}
                  onChange={(e) => setNewContainerName(e.target.value)}
                  placeholder="Pl. Kis alkatrészes fiók, Kerti szerszámtartó"
                  className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs sm:text-sm placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>

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
                    {containers.map(c => (
                      <option key={c.id} value={c.id} className="bg-[var(--card-bg,#3A4551)]">
                        {c.name} ({CONTAINER_TYPE_LABELS[c.containerType]?.hu || c.containerType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Fizikai Helyszín</label>
                <input
                  type="text"
                  value={newContainerLocation}
                  onChange={(e) => setNewContainerLocation(e.target.value)}
                  placeholder="Pl. Műhely, Garázs, Földszint"
                  className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs sm:text-sm placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Leírás (Opcionális)</label>
                <textarea
                  rows={2}
                  value={newContainerDesc}
                  onChange={(e) => setNewContainerDesc(e.target.value)}
                  placeholder="Rövid leírás a tároló funkciójáról..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-white text-xs sm:text-sm placeholder-[var(--text-sub,#B5BDC6)] focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)]"
                />
              </div>

              {/* Modal Footer: Sticky at bottom */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[var(--border-color,#56616D)]/60">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 min-h-[40px] rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[40px] rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95"
                >
                  Létrehozás (Helyi minta)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: QR Code Large Preview */}
      {isQrModalOpen && selectedContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] p-5 sm:p-6 text-center space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color,#56616D)]/60">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[var(--color-primary-blue,#2563EB)]" />
                <h3 className="text-sm font-bold text-white">QR Címke Nyomtatási Minta</h3>
              </div>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[var(--surface-bg,#465362)] text-[var(--text-sub,#B5BDC6)] cursor-pointer"
                aria-label="Bezárás"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl mx-auto inline-block shadow-lg">
              <QRCodeSVG
                value={`thingor://storage/${selectedContainer.code}`}
                size={160}
                level="H"
              />
              <div className="mt-2 text-slate-800 text-center font-mono font-bold text-xs tracking-wider">
                {selectedContainer.code}
              </div>
              <div className="text-slate-600 text-center text-[10px] font-medium truncate max-w-[200px]">
                {selectedContainer.name}
              </div>
            </div>

            <p className="text-[11px] sm:text-xs text-[var(--text-sub,#B5BDC6)] leading-relaxed">
              Ez a QR kód közvetlenül a tároló azonosítására szolgál. Fizikai címkeként nyomtatható és ragasztható a dobozra.
            </p>

            <button
              onClick={() => {
                window.print();
              }}
              className="w-full py-2.5 min-h-[42px] rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-[var(--color-primary-blue,#2563EB)]/90 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" /> Címke nyomtatása (Böngésző)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
