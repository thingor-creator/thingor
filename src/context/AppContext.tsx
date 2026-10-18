import React, { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import type {
  Item,
  Category,
  LocationItem,
  ItemDocument,
  UserProfile,
  ViewMode,
  FilterState,
  UserRole,
  UserStatus,
  SharePurpose,
  SharePermissions,
  ItemShare,
  SharedItemViewData,
  SiteSettings,
  AdminAuditLog,
  LegalSlug,
  LegalDocumentVersion,
  LandingBlock,
  FAQItem,
  UserDetailStats,
  ItemRepair,
  ItemFinancing,
  Household,
  HouseholdMember,
  HouseholdInvite,
  HouseholdRole,
  RepairStatus,
  ItemRelation,
  ItemRelationType,
  QuickNote,
  AppNotification,
  UserNotificationSettings,
  UserPreferences,
  DashboardMetrics,
  ItemLoan,
  Collection,
  CollectionItem,
  PantryItem,
  VaultSettings,
  StorageContainer,
  ContainerItem,
  LendingContact,
  HouseholdMemberAllowedModules,
  DEFAULT_HOUSEHOLD_MODULES
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateSalt, hashPin, verifyPin } from '../lib/vault';
import { deleteFileFromStorage } from '../lib/storage';
import { translations, type Language, type TranslationKeys } from '../i18n/translations';
import { isAdmin, isSuspended } from '../lib/permissions';

export const isUUID = (str: string | null | undefined): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

// Default categories in Hungarian
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Elektronika', is_custom: false },
  { id: 'cat-2', name: 'Szerszámok', is_custom: false },
  { id: 'cat-3', name: 'Otthon & Háztartás', is_custom: false },
  { id: 'cat-4', name: 'Kert', is_custom: false },
  { id: 'cat-5', name: 'Járművek', is_custom: false },
  { id: 'cat-6', name: 'Sport & Szabadidő', is_custom: false },
  { id: 'cat-7', name: 'Könyvek', is_custom: false },
  { id: 'cat-8', name: 'Gyűjtemények', is_custom: false },
  { id: 'cat-9', name: 'Ruházat', is_custom: false },
  { id: 'cat-10', name: 'Háztartási gépek', is_custom: false },
  { id: 'cat-11', name: 'Egyéb tárgyak', is_custom: false },
];

export const DEFAULT_LOCATIONS: LocationItem[] = [];
export const DEFAULT_ITEMS: Item[] = [];
export const DEFAULT_DOCUMENTS: ItemDocument[] = [];

export type AuthModalMode = 'login' | 'signup' | 'reset' | 'update_password';

interface AppContextType {
  // Language / i18n
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationKeys) => string;

  // Auth state
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isRegistrationSuspended: boolean;
  setIsRegistrationSuspended: (suspended: boolean) => void;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, pass: string, name: string) => Promise<{ success: boolean; error?: string; emailConfirmationRequired?: boolean }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // Navigation & Modals
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  goBack: () => void;
  registerModalCloseHandler: (id: string, onClose: () => void) => () => void;
  showExitToast: boolean;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;

  isAddEditItemModalOpen: boolean;
  setIsAddEditItemModalOpen: (open: boolean) => void;
  editingItem: Item | null;
  setEditingItem: (item: Item | null) => void;

  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: AuthModalMode;
  setAuthModalMode: (mode: AuthModalMode) => void;

  isLocationModalOpen: boolean;
  setIsLocationModalOpen: (open: boolean) => void;

  isCategoryModalOpen: boolean;
  setIsCategoryModalOpen: (open: boolean) => void;

  isSupabaseInfoOpen: boolean;
  setIsSupabaseInfoOpen: (open: boolean) => void;

  // Filter state
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;

  // Data collections
  items: Item[];
  itemsVersion: number;
  refreshItems: () => void;
  dashboardMetrics: DashboardMetrics | null;
  refreshDashboardMetrics: () => Promise<void>;
  userPreferences: UserPreferences;
  updateUserPreferences: (prefs: Partial<UserPreferences>) => Promise<boolean>;
  categories: Category[];
  locations: LocationItem[];
  documents: ItemDocument[];

  // CRUD actions
  addItem: (item: Omit<Item, 'id' | 'created_at'>) => Promise<Item>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  addCategory: (name: string) => Promise<Category>;
  addLocation: (name: string, parentId?: string | null) => Promise<LocationItem>;
  deleteLocation: (id: string) => Promise<void>;

  addDocument: (itemId: string, fileName: string, fileUrl: string, docType: ItemDocument['document_type']) => Promise<ItemDocument>;
  deleteDocument: (docId: string) => Promise<void>;

  // Repairs & Maintenance
  repairs: ItemRepair[];
  addRepair: (repair: Omit<ItemRepair, 'id' | 'created_at'>) => Promise<ItemRepair>;
  updateRepairStatus: (repairId: string, status: RepairStatus, details?: Partial<ItemRepair>) => Promise<void>;
  deleteRepair: (repairId: string) => Promise<void>;

  // Installments & Financing
  financings: ItemFinancing[];
  saveFinancing: (financing: Omit<ItemFinancing, 'id' | 'created_at'>) => Promise<ItemFinancing>;
  recordInstallmentPayment: (financingId: string) => Promise<void>;
  deleteFinancing: (financingId: string) => Promise<void>;

  // Lending & Borrowing Module
  loans: ItemLoan[];
  addLoan: (loan: Omit<ItemLoan, 'id' | 'created_at'>) => Promise<ItemLoan>;
  updateLoan: (id: string, updates: Partial<ItemLoan>) => Promise<void>;
  returnLoan: (id: string) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  lendingContacts: LendingContact[];
  addLendingContact: (contact: Omit<LendingContact, 'id' | 'created_at' | 'updated_at'>) => Promise<LendingContact>;
  updateLendingContact: (id: string, updates: Partial<LendingContact>) => Promise<void>;
  deleteLendingContact: (id: string) => Promise<void>;

  // Collections & Catalogs Module
  collections: Collection[];
  collectionItems: CollectionItem[];
  addCollection: (col: Omit<Collection, 'id' | 'created_at'>) => Promise<Collection>;
  updateCollection: (id: string, updates: Partial<Collection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  addItemToCollection: (collectionId: string, itemId?: string | null, details?: Partial<CollectionItem>) => Promise<CollectionItem>;
  removeItemFromCollection: (collectionId: string, itemIdOrCollectionItemId: string) => Promise<void>;
  deleteCollectionItem: (collectionItemId: string) => Promise<void>;
  updateCollectionItem: (collectionItemId: string, updates: Partial<CollectionItem>) => Promise<void>;
  getCollectionItems: (collectionId: string) => CollectionItem[];

  // Pantry & Consumables Module
  pantryItems: PantryItem[];
  addPantryItem: (item: Omit<PantryItem, 'id' | 'created_at'>) => Promise<PantryItem>;
  updatePantryItem: (id: string, updates: Partial<PantryItem>) => Promise<void>;
  deletePantryItem: (id: string) => Promise<void>;
  adjustPantryQuantity: (id: string, delta: number) => Promise<void>;

  // Physical Storage Containers & Bulk Items Module
  storageContainers: StorageContainer[];
  containerItems: ContainerItem[];
  fetchStorageContainers: () => Promise<void>;
  fetchContainerItems: (containerId?: string) => Promise<void>;
  createStorageContainer: (container: Omit<StorageContainer, 'id' | 'created_at' | 'updated_at'>) => Promise<StorageContainer>;
  updateStorageContainer: (id: string, updates: Partial<StorageContainer>) => Promise<void>;
  deleteStorageContainer: (id: string) => Promise<{ success: boolean; error?: string }>;
  addContainerItem: (item: Omit<ContainerItem, 'id' | 'created_at' | 'updated_at'>) => Promise<ContainerItem>;
  updateContainerItem: (id: string, updates: Partial<ContainerItem>) => Promise<void>;
  deleteContainerItem: (id: string) => Promise<void>;
  adjustContainerItemQuantity: (id: string, delta: number) => Promise<number>;
  assignItemToContainer: (itemId: string, containerId: string | null) => Promise<void>;

  // Vault & Secure Storage Module
  vaultSettings: VaultSettings | null;
  isVaultUnlocked: boolean;
  unlockVault: (pin: string) => Promise<{ success: boolean; error?: string }>;
  lockVault: () => void;
  setupVaultPin: (pin: string) => Promise<boolean>;
  changeVaultPin: (oldPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  setItemVaultProtection: (itemId: string, protectedStatus: boolean) => Promise<void>;
  setDocumentVaultProtection: (docId: string, protectedStatus: boolean) => Promise<void>;

  // Household & Family Sharing
  household: Household | null;
  householdMembers: HouseholdMember[];
  householdInvites: HouseholdInvite[];
  receivedInvites: HouseholdInvite[];
  createHousehold: (name: string) => Promise<Household>;
  inviteHouseholdMember: (email: string, title?: string, role?: HouseholdRole) => Promise<{ success: boolean; invite?: HouseholdInvite; isRegistered?: boolean; message?: string; error?: string }>;
  acceptHouseholdInvite: (token: string) => Promise<{ success: boolean; error?: string }>;
  declineHouseholdInvite: (token: string) => Promise<{ success: boolean; error?: string }>;
  cancelHouseholdInvite: (inviteId: string) => Promise<void>;
  removeHouseholdMember: (memberId: string) => Promise<void>;
  updateHouseholdMember: (memberId: string, updates: Partial<HouseholdMember>) => Promise<void>;
  updateMemberAllowedLocations: (memberId: string, allowedLocationIds: string[] | null) => Promise<void>;
  updateMemberAllowedCategories: (memberId: string, allowedCategoryIds: string[] | null) => Promise<void>;
  updateMemberRole: (memberId: string, role: HouseholdRole) => Promise<void>;
  leaveHousehold: () => Promise<void>;
  updateHouseholdSharedLocations: (locationIds: string[]) => Promise<void>;
  updateHouseholdSharedCategories: (categoryIds: string[]) => Promise<void>;
  updateHouseholdName: (newName: string) => Promise<boolean>;
  isHouseholdModuleAllowed: (moduleKey: keyof HouseholdMemberAllowedModules) => boolean;

  // Item Relationships
  itemRelations: ItemRelation[];
  addItemRelation: (sourceItemId: string, targetItemId: string, relationType: ItemRelationType) => Promise<ItemRelation>;
  deleteItemRelation: (relationId: string) => Promise<void>;
  getItemRelations: (itemId: string) => ItemRelation[];

  // Quick Notes
  quickNotes: QuickNote[];
  addQuickNote: (note: Omit<QuickNote, 'id' | 'created_at'>) => Promise<QuickNote>;
  updateQuickNote: (id: string, updates: Partial<QuickNote>) => Promise<void>;
  deleteQuickNote: (id: string) => Promise<void>;

  // Notification Engine
  notifications: AppNotification[];
  unreadNotificationCount: number;
  userNotificationSettings: UserNotificationSettings | null;
  isNotificationModalOpen: boolean;
  setIsNotificationModalOpen: (open: boolean) => void;
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  updateNotificationSettings: (settings: Partial<UserNotificationSettings>) => Promise<void>;
  createNotification: (notification: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>) => Promise<void>;

  // QR Code Scanner Module
  isQRScannerOpen: boolean;
  setIsQRScannerOpen: (open: boolean) => void;
  convertNoteToItem: (noteId: string) => Promise<Item | null>;

  // Helper getters
  getLocationPath: (locationId: string) => string;
  getCategoryName: (categoryId: string) => string;

  // Site Settings & Admin Platform Control
  siteSettings: SiteSettings;
  updateSiteSettings: (settings: Partial<SiteSettings>) => Promise<{ success: boolean; error?: string }>;
  toggleRegistration: (enabled: boolean) => Promise<void>;
  toggleMaintenance: (enabled: boolean) => Promise<void>;

  // Legal Documents Versioning & Public View
  activeLegalSlug: LegalSlug;
  setActiveLegalSlug: (slug: LegalSlug) => void;
  legalDocumentVersions: LegalDocumentVersion[];
  fetchLegalDocumentVersions: (slug: LegalSlug) => Promise<LegalDocumentVersion[]>;
  saveLegalDocumentVersion: (slug: LegalSlug, title: string, content: string, publish: boolean) => Promise<{ success: boolean; error?: string }>;
  getPublishedLegalDoc: (slug: LegalSlug) => Promise<LegalDocumentVersion | null>;

  // Content & Landing Page Management
  landingBlocks: LandingBlock[];
  fetchLandingBlocks: () => Promise<LandingBlock[]>;
  saveLandingBlock: (block: LandingBlock) => Promise<{ success: boolean; error?: string }>;
  faqsList: FAQItem[];
  fetchFAQs: () => Promise<FAQItem[]>;
  saveFAQ: (faq: Partial<FAQItem>) => Promise<{ success: boolean; error?: string }>;
  deleteFAQ: (faqId: string) => Promise<boolean>;

  // Sharing System
  itemShares: ItemShare[];
  createItemShare: (itemId: string, purpose: SharePurpose, expirationDays: number | null, permissions: SharePermissions) => Promise<ItemShare | null>;
  revokeItemShare: (shareId: string) => Promise<boolean>;
  getItemShares: (itemId: string) => Promise<ItemShare[]>;
  getSharedItemByToken: (token: string) => Promise<{ success: boolean; data?: SharedItemViewData; error?: string }>;
  activeShareToken: string | null;
  setActiveShareToken: (token: string | null) => void;
  sharedItemData: SharedItemViewData | null;
  setSharedItemData: (data: SharedItemViewData | null) => void;

  // User Management & Admin Audit Logs
  usersList: UserProfile[];
  fetchUsersList: () => Promise<UserProfile[]>;
  fetchUserDetailStats: (targetUserId: string) => Promise<UserDetailStats | null>;
  toggleUserSuspension: (userId: string, targetStatus: UserStatus) => Promise<boolean>;
  deleteUserAccountByAdmin: (targetUserId: string) => Promise<{ success: boolean; error?: string }>;
  adminAuditLogs: AdminAuditLog[];
  logAdminAction: (action: string, target?: string, details?: any) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_FILTERS: FilterState = {
  search: '',
  categoryId: 'all',
  locationId: 'all',
  condition: 'all',
  sortBy: 'created_at',
  sortOrder: 'desc',
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default language is 'hu' (Hungarian) as requested by user
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('thingor_lang');
    return (saved === 'en' || saved === 'hu') ? saved : 'hu';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('thingor_lang', lang);
  };

  const [isRegistrationSuspended, setIsRegistrationSuspendedState] = useState<boolean>(() => {
    const saved = localStorage.getItem('thingor_registration_suspended');
    return saved === 'true';
  });

  const setIsRegistrationSuspended = (suspended: boolean) => {
    setIsRegistrationSuspendedState(suspended);
    localStorage.setItem('thingor_registration_suspended', String(suspended));
  };

  const t = (key: keyof TranslationKeys): string => {
    return translations[language]?.[key] || translations['en']?.[key] || String(key);
  };

  // Local storage persistence initialization
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('thingor_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [items, setItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem('thingor_items') || localStorage.getItem('thingor_items_backup');
    if (saved) {
      try {
        const parsed: Item[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [itemsVersion, setItemsVersion] = useState(0);
  const refreshItems = useCallback(() => setItemsVersion(v => v + 1), []);

  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(() => {
    const saved = localStorage.getItem('thingor_dashboard_metrics');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  const [userPreferences, setUserPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem('thingor_user_preferences');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      pinned_modules: ['dashboard', 'items', 'lending', 'locations'],
      module_order: [],
      hidden_modules: [],
      compact_mode: false,
    };
  });

  const refreshDashboardMetrics = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !user) return;
    try {
      const { data, error } = await supabase.rpc('get_dashboard_metrics');
      if (!error && data) {
        setDashboardMetrics(data as DashboardMetrics);
        localStorage.setItem('thingor_dashboard_metrics', JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Failed to load dashboard metrics RPC:', err);
    }
  }, [user]);

  const updateUserPreferences = async (newPrefs: Partial<UserPreferences>): Promise<boolean> => {
    const updated: UserPreferences = { ...userPreferences, ...newPrefs };
    setUserPreferences(updated);
    localStorage.setItem('thingor_user_preferences', JSON.stringify(updated));

    if (user) {
      setUser(prev => prev ? { ...prev, preferences: updated } : null);
      localStorage.setItem('thingor_user', JSON.stringify({ ...user, preferences: updated }));
    }

    if (isSupabaseConfigured && supabase && user) {
      try {
        await supabase
          .from('profiles')
          .update({ preferences: updated })
          .eq('user_id', user.id);
        return true;
      } catch (e) {
        console.warn('Failed to save preferences to Supabase:', e);
      }
    }
    return true;
  };

  useEffect(() => {
    if (user && isSupabaseConfigured && supabase) {
      refreshDashboardMetrics();
    }
  }, [user?.id, itemsVersion, refreshDashboardMetrics]);

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('thingor_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.some((c: Category) => c.name === 'Electronics' || c.name === 'Tools')) {
          return DEFAULT_CATEGORIES;
        }
        return parsed;
      } catch (e) {}
    }
    return DEFAULT_CATEGORIES;
  });

  const [locations, setLocations] = useState<LocationItem[]>(() => {
    const saved = localStorage.getItem('thingor_locations');
    if (saved) {
      try {
        const parsed: LocationItem[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [documents, setDocuments] = useState<ItemDocument[]>(() => {
    const saved = localStorage.getItem('thingor_documents');
    if (saved) {
      try {
        const parsed: ItemDocument[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  // Module state: Repairs, Financing, Household
  const [repairs, setRepairs] = useState<ItemRepair[]>(() => {
    const saved = localStorage.getItem('thingor_repairs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [financings, setFinancings] = useState<ItemFinancing[]>(() => {
    const saved = localStorage.getItem('thingor_financings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [loans, setLoans] = useState<ItemLoan[]>(() => {
    const saved = localStorage.getItem('thingor_loans');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('thingor_loans', JSON.stringify(loans));
  }, [loans]);

  const [lendingContacts, setLendingContacts] = useState<LendingContact[]>(() => {
    const saved = localStorage.getItem('thingor_lending_contacts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('thingor_lending_contacts', JSON.stringify(lendingContacts));
  }, [lendingContacts]);

  const [collections, setCollections] = useState<Collection[]>(() => {
    const saved = localStorage.getItem('thingor_collections');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>(() => {
    const saved = localStorage.getItem('thingor_collection_items');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('thingor_collections', JSON.stringify(collections));
  }, [collections]);

  useEffect(() => {
    localStorage.setItem('thingor_collection_items', JSON.stringify(collectionItems));
  }, [collectionItems]);

  const [pantryItems, setPantryItems] = useState<PantryItem[]>(() => {
    const saved = localStorage.getItem('thingor_pantry_items');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('thingor_pantry_items', JSON.stringify(pantryItems));
  }, [pantryItems]);

  // Vault & Secure Storage State
  const [vaultSettings, setVaultSettings] = useState<VaultSettings | null>(() => {
    const saved = localStorage.getItem('thingor_vault_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('thingor_vault_unlocked') === 'true';
  });
  const [vaultFailedAttempts, setVaultFailedAttempts] = useState<number>(0);
  const [vaultLockoutUntil, setVaultLockoutUntil] = useState<number>(0);

  useEffect(() => {
    if (vaultSettings) {
      localStorage.setItem('thingor_vault_settings', JSON.stringify(vaultSettings));
    } else {
      localStorage.removeItem('thingor_vault_settings');
    }
  }, [vaultSettings]);

  useEffect(() => {
    if (isVaultUnlocked) {
      sessionStorage.setItem('thingor_vault_unlocked', 'true');
    } else {
      sessionStorage.removeItem('thingor_vault_unlocked');
    }
  }, [isVaultUnlocked]);

  // Auto-lock vault on 5 minutes inactivity
  useEffect(() => {
    if (!isVaultUnlocked) return;
    const timeoutMs = (vaultSettings?.auto_lock_minutes || 5) * 60 * 1000;
    const timer = setTimeout(() => {
      setIsVaultUnlocked(false);
      sessionStorage.removeItem('thingor_vault_unlocked');
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [isVaultUnlocked, vaultSettings?.auto_lock_minutes]);

  const [household, setHousehold] = useState<Household | null>(() => {
    const saved = localStorage.getItem('thingor_household');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>(() => {
    const saved = localStorage.getItem('thingor_household_members');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [householdInvites, setHouseholdInvites] = useState<HouseholdInvite[]>(() => {
    const saved = localStorage.getItem('thingor_household_invites');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('thingor_notifications');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [userNotificationSettings, setUserNotificationSettings] = useState<UserNotificationSettings | null>(() => {
    const saved = localStorage.getItem('thingor_notification_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      user_id: '',
      warranty_enabled: true,
      financing_enabled: true,
      repair_enabled: true,
      email_enabled: true,
      inapp_enabled: true,
      shopping_cart_enabled: true,
    };
  });

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  const [receivedInvites, setReceivedInvites] = useState<HouseholdInvite[]>([]);

  // LocalStorage Sync Effects for new modules
  useEffect(() => { localStorage.setItem('thingor_repairs', JSON.stringify(repairs)); }, [repairs]);
  useEffect(() => { localStorage.setItem('thingor_financings', JSON.stringify(financings)); }, [financings]);
  useEffect(() => {
    if (household) localStorage.setItem('thingor_household', JSON.stringify(household));
    else localStorage.removeItem('thingor_household');
  }, [household]);
  useEffect(() => { localStorage.setItem('thingor_household_members', JSON.stringify(householdMembers)); }, [householdMembers]);
  useEffect(() => { localStorage.setItem('thingor_household_invites', JSON.stringify(householdInvites)); }, [householdInvites]);

  // Item Relations & Quick Notes State
  const [itemRelations, setItemRelations] = useState<ItemRelation[]>(() => {
    const saved = localStorage.getItem('thingor_item_relations');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [quickNotes, setQuickNotes] = useState<QuickNote[]>(() => {
    const saved = localStorage.getItem('thingor_quick_notes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  useEffect(() => { localStorage.setItem('thingor_item_relations', JSON.stringify(itemRelations)); }, [itemRelations]);
  useEffect(() => { localStorage.setItem('thingor_quick_notes', JSON.stringify(quickNotes)); }, [quickNotes]);

  // Physical Storage Containers State
  const [storageContainers, setStorageContainers] = useState<StorageContainer[]>(() => {
    const saved = localStorage.getItem('thingor_storage_containers');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [containerItems, setContainerItems] = useState<ContainerItem[]>(() => {
    const saved = localStorage.getItem('thingor_container_items');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  useEffect(() => { localStorage.setItem('thingor_storage_containers', JSON.stringify(storageContainers)); }, [storageContainers]);
  useEffect(() => { localStorage.setItem('thingor_container_items', JSON.stringify(containerItems)); }, [containerItems]);

  // UI state
  const [currentView, setCurrentView] = useState<ViewMode>(() => {
    const savedUser = localStorage.getItem('thingor_user');
    const savedView = localStorage.getItem('thingor_current_view') as ViewMode;
    if (savedUser) {
      return (savedView && savedView !== 'landing') ? savedView : 'dashboard';
    }
    return 'landing';
  });

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isAddEditItemModalOpen, setIsAddEditItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSupabaseInfoOpen, setIsSupabaseInfoOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  // PWA History & Back Navigation Handler
  const isPoppingRef = useRef(false);
  const prevModalRef = useRef(false);
  const viewHistoryRef = useRef<ViewMode[]>([]);
  const notificationTablesAvailableRef = useRef<boolean>(true);

  // Registered active modals stack (for local and subview modals like shopping list, lightbox, item form)
  const activeModalsRef = useRef<Array<{ id: string; onClose: () => void }>>([]);
  const [showExitToast, setShowExitToast] = useState(false);
  const exitToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBackPressRef = useRef<number>(0);

  const currentViewRef = useRef<ViewMode>(currentView);
  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  // Universal modal registration: any modal registers its close callback so the device back button closes it without view change
  const registerModalCloseHandler = useCallback((id: string, onClose: () => void) => {
    const existingIdx = activeModalsRef.current.findIndex(m => m.id === id);
    if (existingIdx !== -1) {
      activeModalsRef.current[existingIdx] = { id, onClose };
    } else {
      activeModalsRef.current.push({ id, onClose });
      window.history.pushState({ isModal: true, modalId: id, view: currentViewRef.current }, '');
    }

    return () => {
      const idx = activeModalsRef.current.findIndex(m => m.id === id);
      if (idx !== -1) {
        activeModalsRef.current.splice(idx, 1);
      }
      // If modal was closed via UI [X] button and current history state is this modal's state, pop it cleanly
      if (!isPoppingRef.current && typeof window !== 'undefined' && window.history.state && window.history.state.isModal && window.history.state.modalId === id) {
        isPoppingRef.current = true;
        window.history.back();
        setTimeout(() => {
          isPoppingRef.current = false;
        }, 120);
      }
    };
  }, []);

  // Initial root history trap so mobile back button doesn't immediately close the PWA on first press
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentState = window.history.state;
      if (!currentState || !currentState.hasRootGuard) {
        window.history.replaceState({ ...currentState, hasRootGuard: true, view: currentView }, '');
        window.history.pushState({ view: currentView, isTrap: true }, '');
      }
    }
  }, []);

  const isOverlayModalOpen = Boolean(
    isAddEditItemModalOpen ||
    isLocationModalOpen ||
    isCategoryModalOpen ||
    isAuthModalOpen ||
    isNotificationModalOpen ||
    isQRScannerOpen ||
    isSupabaseInfoOpen
  );

  // Push history entry when a global overlay modal opens so device Back button closes modal first
  useEffect(() => {
    if (isOverlayModalOpen && !prevModalRef.current) {
      window.history.pushState({ view: currentView, selectedItemId, isModal: true }, '');
    } else if (!isOverlayModalOpen && prevModalRef.current) {
      if (!isPoppingRef.current && window.history.state && window.history.state.isModal) {
        isPoppingRef.current = true;
        window.history.back();
        setTimeout(() => {
          isPoppingRef.current = false;
        }, 120);
      }
    }
    prevModalRef.current = isOverlayModalOpen;
  }, [isOverlayModalOpen, currentView, selectedItemId]);

  // Handle popstate (Device Back Button / Browser Back Arrow / PWA Swipe Back)
  useEffect(() => {
    if (!window.history.state || !window.history.state.view) {
      window.history.replaceState({ view: currentView, selectedItemId, isModal: false }, '');
    }

    const handlePopState = (e: PopStateEvent) => {
      if (isPoppingRef.current) {
        return;
      }
      isPoppingRef.current = true;
      setTimeout(() => {
        isPoppingRef.current = false;
      }, 120);

      const state = e.state;

      // 1. If any registered modal/panel is open, close the topmost registered modal and STAY on current view!
      if (activeModalsRef.current.length > 0) {
        const topModal = activeModalsRef.current.pop();
        if (topModal) {
          topModal.onClose();
          return;
        }
      }

      // 2. Close overlay modals
      if (isAddEditItemModalOpen) {
        setIsAddEditItemModalOpen(false);
        return;
      }
      if (isLocationModalOpen) {
        setIsLocationModalOpen(false);
        return;
      }
      if (isCategoryModalOpen) {
        setIsCategoryModalOpen(false);
        return;
      }
      if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
        return;
      }
      if (isNotificationModalOpen) {
        setIsNotificationModalOpen(false);
        return;
      }
      if (isQRScannerOpen) {
        setIsQRScannerOpen(false);
        return;
      }
      if (isSupabaseInfoOpen) {
        setIsSupabaseInfoOpen(false);
        return;
      }

      // 3. Storage hash or storage view
      if (typeof window !== 'undefined' && (currentView === 'storage' || window.location.hash.includes('storage'))) {
        window.location.hash = '';
        if (currentView === 'storage') {
          const prev = viewHistoryRef.current.pop() || (user ? 'dashboard' : 'landing');
          setCurrentView(prev);
        }
        return;
      }

      // 4. Item detail
      if (selectedItemId && (!state || !state.selectedItemId)) {
        setSelectedItemId(null);
        return;
      }

      // 5. In-memory view history stack
      if (viewHistoryRef.current.length > 0) {
        const prev = viewHistoryRef.current.pop();
        if (prev && prev !== currentView) {
          setCurrentView(prev);
          return;
        }
      }

      // 6. History state view change
      if (state && state.view && state.view !== currentView) {
        if (state.selectedItemId !== undefined) {
          setSelectedItemId(state.selectedItemId);
        } else {
          setSelectedItemId(null);
        }
        setCurrentView(state.view);
        return;
      }

      if (selectedItemId) {
        setSelectedItemId(null);
        return;
      }

      // 7. DOUBLE-BACK TO EXIT (When at root view, no modals open, no history stack)
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        // Double press within 2000ms: allow exit!
        setShowExitToast(false);
        window.history.back();
      } else {
        // First back press: show toast, re-push trap state to stay in app!
        lastBackPressRef.current = now;
        window.history.pushState({ view: currentView, isTrap: true }, '', '#' + currentView);
        setShowExitToast(true);
        if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
        exitToastTimerRef.current = setTimeout(() => {
          setShowExitToast(false);
        }, 2000);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    currentView,
    selectedItemId,
    isAddEditItemModalOpen,
    isLocationModalOpen,
    isCategoryModalOpen,
    isAuthModalOpen,
    isNotificationModalOpen,
    isQRScannerOpen,
    isSupabaseInfoOpen
  ]);

  // Custom view changer that pushes history entries when navigating views
  const handleSetCurrentView = (view: ViewMode) => {
    if (view !== currentView || selectedItemId !== null) {
      if (currentView && currentView !== view) {
        viewHistoryRef.current.push(currentView);
      }
      setSelectedItemId(null);
      setIsAddEditItemModalOpen(false);
      setIsLocationModalOpen(false);
      setIsCategoryModalOpen(false);
      setIsAuthModalOpen(false);
      setIsNotificationModalOpen(false);
      setIsQRScannerOpen(false);
      setIsSupabaseInfoOpen(false);

      window.history.pushState({ view, selectedItemId: null, isModal: false }, '', '#' + view);
      setCurrentView(view);
    }
  };

  const goBack = useCallback(() => {
    // 1. Registered modals in stack
    if (activeModalsRef.current.length > 0) {
      const topModal = activeModalsRef.current.pop();
      if (topModal) {
        topModal.onClose();
        return;
      }
    }

    // 2. Overlay modals
    if (isAddEditItemModalOpen) { setIsAddEditItemModalOpen(false); return; }
    if (isLocationModalOpen) { setIsLocationModalOpen(false); return; }
    if (isCategoryModalOpen) { setIsCategoryModalOpen(false); return; }
    if (isAuthModalOpen) { setIsAuthModalOpen(false); return; }
    if (isNotificationModalOpen) { setIsNotificationModalOpen(false); return; }
    if (isQRScannerOpen) { setIsQRScannerOpen(false); return; }
    if (isSupabaseInfoOpen) { setIsSupabaseInfoOpen(false); return; }

    // 3. Storage view hash or view
    if (typeof window !== 'undefined' && (currentView === 'storage' || window.location.hash.includes('storage'))) {
      window.location.hash = '';
      if (currentView === 'storage') {
        const prev = viewHistoryRef.current.pop() || (user ? 'dashboard' : 'landing');
        setCurrentView(prev);
      }
      return;
    }

    // 4. Item detail
    if (selectedItemId) {
      setSelectedItemId(null);
      return;
    }

    // 5. In-memory history stack fallback
    if (viewHistoryRef.current.length > 0) {
      const prev = viewHistoryRef.current.pop();
      if (prev && prev !== currentView) {
        window.history.replaceState({ view: prev, selectedItemId: null, isModal: false }, '', '#' + prev);
        setCurrentView(prev);
        return;
      }
    }

    // 6. At root view: trigger double-back logic
    const now = Date.now();
    if (now - lastBackPressRef.current < 2000) {
      setShowExitToast(false);
      if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
      }
    } else {
      lastBackPressRef.current = now;
      setShowExitToast(true);
      if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
      exitToastTimerRef.current = setTimeout(() => {
        setShowExitToast(false);
      }, 2000);
    }
  }, [
    isAddEditItemModalOpen,
    isLocationModalOpen,
    isCategoryModalOpen,
    isAuthModalOpen,
    isNotificationModalOpen,
    isQRScannerOpen,
    isSupabaseInfoOpen,
    selectedItemId,
    currentView
  ]);

  const handleSetSelectedItemId = (itemId: string | null) => {
    if (itemId !== selectedItemId) {
      if (itemId) {
        window.history.pushState({ view: currentView, selectedItemId: itemId, isModal: false }, '');
        setSelectedItemId(itemId);
      } else {
        if (!isPoppingRef.current && window.history.state && (window.history.state.selectedItemId || window.history.state.isModal)) {
          window.history.back();
        } else {
          setSelectedItemId(null);
        }
      }
    }
  };

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('thingor_current_view', currentView);
  }, [currentView]);

  useEffect(() => {
    if (items.length > 0) {
      try {
        const cacheItems = items.slice(0, 50);
        localStorage.setItem('thingor_items', JSON.stringify(cacheItems));
        localStorage.setItem('thingor_items_backup', JSON.stringify(cacheItems));
      } catch {
        console.warn('LocalStorage quota limit reached, skipping full item serialization');
      }
    }
  }, [items]);

  useEffect(() => {
    localStorage.setItem('thingor_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('thingor_locations', JSON.stringify(locations));
  }, [locations]);

  useEffect(() => {
    localStorage.setItem('thingor_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('thingor_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('thingor_user');
    }
  }, [user]);

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    const saved = localStorage.getItem('thingor_site_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      id: 'default',
      site_name: 'Thingor',
      hero_title: 'Személyes leltár, tárgy- és dokumentumkezelő',
      hero_subtitle: 'Rendszerezd, dokumentáld és oszd meg értékeidet biztonságosan.',
      announcement: null,
      registration_enabled: !isRegistrationSuspended,
      maintenance_mode: false,
      maintenance_message: 'A rendszer jelenleg karbantartás alatt áll. Kérjük, látogass vissza később.',
    };
  });

  const [itemShares, setItemShares] = useState<ItemShare[]>(() => {
    const saved = localStorage.getItem('thingor_item_shares');
    return saved ? JSON.parse(saved) : [];
  });

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<AdminAuditLog[]>([]);
  const [activeShareToken, setActiveShareToken] = useState<string | null>(null);
  const [sharedItemData, setSharedItemData] = useState<SharedItemViewData | null>(null);

  useEffect(() => {
    localStorage.setItem('thingor_item_shares', JSON.stringify(itemShares));
  }, [itemShares]);

  const isUUID = (str?: string | null): boolean =>
    Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

  // Helper to fetch profile with role and status from Supabase
  const fetchUserProfile = async (userId: string, email: string, metadataDisplayName?: string): Promise<UserProfile> => {
    const cleanEmail = email.toLowerCase();
    const fallbackDisplayName = metadataDisplayName || cleanEmail.split('@')[0] || 'User';

    if (!isSupabaseConfigured || !supabase) {
      return {
        id: userId,
        user_id: userId,
        display_name: fallbackDisplayName,
        email: cleanEmail,
        role: 'user',
        status: 'active',
        is_admin: false,
      };
    }

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, status, display_name, preferences')
        .eq('user_id', userId)
        .maybeSingle();

      const role: UserRole = profileData?.role === 'admin' ? 'admin' : 'user';
      const status: UserStatus = (profileData?.status as UserStatus) || 'active';
      const displayName = profileData?.display_name || fallbackDisplayName;
      const preferences = (profileData as any)?.preferences as UserPreferences | undefined;
      if (preferences) {
        setUserPreferences(preferences);
        localStorage.setItem('thingor_user_preferences', JSON.stringify(preferences));
      }

      return {
        id: userId,
        user_id: userId,
        display_name: displayName,
        email: cleanEmail,
        role,
        status,
        is_admin: role === 'admin',
        preferences,
      };
    } catch (e) {
      return {
        id: userId,
        user_id: userId,
        display_name: fallbackDisplayName,
        email: cleanEmail,
        role: 'user',
        status: 'active',
        is_admin: false,
      };
    }
  };

  // Fetch site settings from Supabase
  const fetchSiteSettings = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data } = await supabase.from('site_settings').select('*').eq('id', 'default').maybeSingle();
      if (data) {
        const newSettings: SiteSettings = {
          id: data.id || 'default',
          site_name: data.site_name || 'Thingor',
          site_description: data.site_description || '',
          hero_title: data.hero_title || 'Személyes leltár, tárgy- és dokumentumkezelő',
          hero_subtitle: data.hero_subtitle || 'Rendszerezd, dokumentáld és oszd meg értékeidet biztonságosan.',
          announcement: data.announcement || null,
          registration_enabled: data.registration_enabled ?? true,
          registration_paused_title: data.registration_paused_title || 'A regisztráció jelenleg szünetel',
          registration_paused_message: data.registration_paused_message || 'A regisztráció átmenetileg fel van függesztve az adminisztrátor által. Kérjük, látogass vissza később.',
          maintenance_mode: data.maintenance_mode ?? false,
          maintenance_message: data.maintenance_message || 'A rendszer jelenleg karbantartás alatt áll. Kérjük, látogass vissza később.',
          contact_email: data.contact_email || 'info@thingor.com',
          support_email: data.support_email || 'support@thingor.com',
          primary_color: data.primary_color || '#10b981',
          logo_url: data.logo_url || '/logo.png',
          favicon_url: data.favicon_url || '/favicon.png',
          meta_description: data.meta_description || '',
          notifications_enabled: data.notifications_enabled ?? true,
          email_notifications_enabled: data.email_notifications_enabled ?? true,
        };
        setSiteSettings(newSettings);
        localStorage.setItem('thingor_site_settings', JSON.stringify(newSettings));
        setIsRegistrationSuspendedState(!newSettings.registration_enabled);
      }
    } catch (e) {
      console.error('Failed to fetch site settings:', e);
    }
  };

  useEffect(() => {
    fetchSiteSettings();
  }, []);

  // Update browser tab favicon, apple touch icon, og images, and PWA manifest dynamically
  useEffect(() => {
    const activeLogo = siteSettings.logo_url || '/logo.png';
    const activeFavicon = siteSettings.favicon_url || siteSettings.logo_url || '/favicon.png';

    // 1. Update all browser favicons
    const favicons = document.querySelectorAll("link[rel*='icon']");
    favicons.forEach(el => {
      (el as HTMLLinkElement).href = activeFavicon;
    });

    // 2. Update Apple Touch Icon
    const appleIcons = document.querySelectorAll("link[rel*='apple-touch-icon']");
    appleIcons.forEach(el => {
      (el as HTMLLinkElement).href = activeLogo;
    });

    // 3. Update OpenGraph & Social meta images
    const socialTags = [
      "meta[property='og:image']",
      "meta[property='og:image:secure_url']",
      "meta[property='og:logo']",
      "meta[name='twitter:image']",
      "meta[name='thumbnail']"
    ];
    socialTags.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', activeLogo);
    });

    // Ensure link[rel="manifest"] points to the valid static webmanifest
    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (manifestLink && manifestLink.href.startsWith('blob:')) {
      manifestLink.href = '/manifest.webmanifest';
    }
  }, [siteSettings.logo_url, siteSettings.favicon_url]);

  // Handle Supabase Auth state if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.warn('Supabase auth session invalid or expired:', error.message);
        // Only purge local auth storage if an actual invalid token error was received
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setUser(null);
        localStorage.removeItem('thingor_user');
        return;
      }

      if (!session) {
        // Normal anonymous visitor state (no session) - do NOT invoke signOut
        setUser(null);
        return;
      }

      if (session?.user) {
        const profile = await fetchUserProfile(
          session.user.id,
          session.user.email || '',
          session.user.user_metadata?.display_name
        );
        if (isSuspended(profile)) {
          await supabase.auth.signOut();
          setUser(null);
          localStorage.removeItem('thingor_user');
          alert('Fiókod fel van függesztve. Kérjük, lépj kapcsolatba a rendszeradminisztrátorral.');
          return;
        }
        setUser(profile);
      }
    }).catch(async (err) => {
      console.warn('Supabase getSession exception:', err);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      setUser(null);
      localStorage.removeItem('thingor_user');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthModalMode('update_password');
        setIsAuthModalOpen(true);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthModalOpen(false);
      }

      if (session?.user) {
        const profile = await fetchUserProfile(
          session.user.id,
          session.user.email || '',
          session.user.user_metadata?.display_name
        );
        if (isSuspended(profile)) {
          await supabase.auth.signOut();
          setUser(null);
          localStorage.removeItem('thingor_user');
          alert('Fiókod fel van függesztve. Kérjük, lépj kapcsolatba a rendszeradminisztrátorral.');
          return;
        }
        setUser(profile);
      } else if (event === 'SIGNED_OUT') {
        // Explicit sign out: clear local state without recursively calling signOut()
        setUser(null);
        setItems([]);
        setDocuments([]);
        setLocations([]);
        setHousehold(null);
        setHouseholdMembers([]);
        setHouseholdInvites([]);
        setReceivedInvites([]);
        setStorageContainers([]);
        setContainerItems([]);
        localStorage.removeItem('thingor_user');
        localStorage.removeItem('thingor_items');
        localStorage.removeItem('thingor_documents');
        localStorage.removeItem('thingor_locations');
        localStorage.removeItem('thingor_household');
        localStorage.removeItem('thingor_household_members');
        localStorage.removeItem('thingor_household_invites');
        localStorage.removeItem('thingor_storage_containers');
        localStorage.removeItem('thingor_container_items');
        localStorage.removeItem('thingor_current_view');
        setCurrentView('landing');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync Categories, Locations, Items & Documents from Supabase when user is authenticated (M6-M9, M14-M16)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user?.id) return;

    let isMounted = true;

    // Load categories
    supabase
      .from('categories')
      .select('*')
      .then(({ data, error }) => {
        if (!error && data && data.length > 0 && isMounted) {
          setCategories(data as Category[]);
        }
      });

    // Load user locations (own + shared household locations)
    supabase
      .from('locations')
      .select('*')
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setLocations(data as LocationItem[]);
        } else if (error) {
          console.warn('Full locations fetch failed, falling back to user_id:', error.message);
          supabase.from('locations').select('*').eq('user_id', user.id).then(({ data: fbLocs }) => {
            if (fbLocs && isMounted) setLocations(fbLocs as LocationItem[]);
          });
        }
      });

    // Load user items & household shared items (M8)
    supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setItems(data as Item[]);
        } else if (error) {
          console.warn('Full items fetch failed, falling back to user_id:', error.message);
          supabase.from('items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data: fbItems }) => {
            if (fbItems && isMounted) setItems(fbItems as Item[]);
          });
        }
      });

    // Load item documents (own + household)
    supabase
      .from('item_documents')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setDocuments(data as ItemDocument[]);
        }
      });

    // Load repairs
    supabase
      .from('item_repairs')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setRepairs(data as ItemRepair[]);
        }
      });

    // Load financings
    supabase
      .from('item_financings')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setFinancings(data as ItemFinancing[]);
        }
      });

    // Load item loans
    supabase
      .from('item_loans')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setLoans(data as ItemLoan[]);
        }
      });

    // Load lending contacts
    supabase
      .from('lending_contacts')
      .select('*')
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setLendingContacts(data as LendingContact[]);
        }
      });

    // Load collections & collection items
    supabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setCollections(data as Collection[]);
        }
      });

    supabase
      .from('collection_items')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setCollectionItems(data as CollectionItem[]);
        }
      });

    // Load pantry items
    supabase
      .from('pantry_items')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setPantryItems(data as PantryItem[]);
        }
      });

    // Load physical storage containers & bulk items
    supabase
      .from('storage_containers')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setStorageContainers(data as StorageContainer[]);
        }
      });

    supabase
      .from('container_items')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setContainerItems(data as ContainerItem[]);
        }
      });

    // Load household data & members (syncing across devices by user_id or email)
    supabase
      .from('household_members')
      .select('*')
      .or(`user_id.eq.${user.id},user_email.ilike.${user.email}`)
      .then(async ({ data: memberList }) => {
        const savedHhId = localStorage.getItem('thingor_active_household_id');
        const memberData = memberList?.find(m => m.household_id === savedHhId) || memberList?.[0];
        if (memberData && isMounted) {
          const { data: hhData } = await supabase.from('households').select('*').eq('id', memberData.household_id).maybeSingle();
          if (hhData && isMounted) {
            setHousehold(hhData as Household);
            localStorage.setItem('thingor_active_household_id', hhData.id);

            // AUTO-HEAL: Ensure only unassigned items owned by user with ownership_scope = 'household' have this valid household_id in Supabase
            if (hhData.id && isUUID(hhData.id)) {
              await supabase
                .from('items')
                .update({ household_id: hhData.id })
                .eq('user_id', user.id)
                .eq('ownership_scope', 'household')
                .is('household_id', null);
            }

            const { data: allMembers } = await supabase.from('household_members').select('*').eq('household_id', memberData.household_id);
            if (allMembers && isMounted) setHouseholdMembers(allMembers as HouseholdMember[]);

            const { data: allInvites } = await supabase.from('household_invites').select('*').eq('household_id', memberData.household_id);
            if (allInvites && isMounted) setHouseholdInvites(allInvites as HouseholdInvite[]);

            // Re-sync locations and items once household context is established
            const { data: freshLocations } = await supabase.from('locations').select('*');
            if (freshLocations && isMounted) setLocations(freshLocations as LocationItem[]);

            const { data: freshItems } = await supabase.from('items').select('*').order('created_at', { ascending: false });
            if (freshItems && isMounted) {
              setItems(prev => {
                const itemMap = new Map<string, Item>();
                for (const item of prev) {
                  if (item && item.name) itemMap.set(item.id, item);
                }
                for (const item of (freshItems as Item[])) {
                  if (item && item.name) itemMap.set(item.id, item);
                }
                return Array.from(itemMap.values()).sort((a, b) => 
                  (b.created_at || '').localeCompare(a.created_at || '')
                );
              });
            }
          }
        } else if (isMounted && household && !isUUID(household.id)) {
          ensureValidHousehold(household);
        }
      });

    // Load pending invites sent to this user's email
    if (user?.email && isSupabaseConfigured && supabase) {
      supabase
        .from('household_invites')
        .select('*, households(name)')
        .ilike('invited_email', user.email.trim())
        .eq('status', 'pending')
        .then(({ data: rData }) => {
          if (rData && isMounted) {
            const formatted = rData.map(inv => ({
              ...inv,
              household_name: (inv.households as any)?.name || 'Családi Háztartás'
            })) as HouseholdInvite[];
            setReceivedInvites(formatted);
          }
        });
    }

    // Load item relations
    supabase
      .from('item_relations')
      .select('*')
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setItemRelations(data as ItemRelation[]);
        }
      });

    // Load quick notes
    supabase
      .from('quick_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setQuickNotes(data as QuickNote[]);
        }
      });

    // Load vault settings
    supabase
      .from('vault_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && isMounted) {
          if (data) {
            setVaultSettings(data as VaultSettings);
          } else {
            setVaultSettings(null);
          }
        }
      });

    // Load physical storage containers
    supabase
      .from('storage_containers')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setStorageContainers(data as StorageContainer[]);
        }
      });

    // Load container bulk items
    supabase
      .from('container_items')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setContainerItems(data as ContainerItem[]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const formatAuthError = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes('invalid login credentials')) {
      return language === 'hu'
        ? 'Hibás e-mail cím vagy jelszó. Csak regisztrált és visszaigazolt fiókkal lehet belépni.'
        : 'Invalid login credentials. Only registered accounts can log in.';
    }
    if (lower.includes('email not confirmed')) {
      return language === 'hu'
        ? 'Az e-mail cím még nincs visszaigazolva! Kérjük, ellenőrizd az e-mail fiókodat a visszaigazoló linkért.'
        : 'Email address not confirmed! Please check your inbox to activate your account.';
    }
    if (lower.includes('user not found')) {
      return language === 'hu'
        ? 'Nincs ilyen regisztrált e-mail cím a rendszerben.'
        : 'No account found with this email address.';
    }
    if (lower.includes('already registered') || lower.includes('already exists') || lower.includes('user_already_exists')) {
      return language === 'hu'
        ? 'Ez az e-mail cím már regisztrálva van a rendszerben.'
        : 'This email address is already registered.';
    }
    if (lower.includes('at least 6 characters') || lower.includes('too short') || lower.includes('password_too_short')) {
      return language === 'hu'
        ? 'A jelszónak legalább 6 karakter hosszúnak kell lennie.'
        : 'Password must be at least 6 characters long.';
    }
    if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('over email send rate limit')) {
      return language === 'hu'
        ? 'Túl sok próbálkozás történt! Kérjük, várj egy keveset, mielőtt újra próbálkozol.'
        : 'Too many attempts! Please wait a moment before trying again.';
    }
    if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
      return language === 'hu'
        ? 'Kérjük, érvényes e-mail címet adj meg.'
        : 'Please enter a valid email address.';
    }
    return msg;
  };

  const login = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // Clear any previous user state before logging in
    setItems([]);
    setDocuments([]);
    setLocations([]);
    setHousehold(null);
    setHouseholdMembers([]);
    setHouseholdInvites([]);
    setReceivedInvites([]);
    setStorageContainers([]);
    setContainerItems([]);
    setDashboardMetrics(null);
    localStorage.removeItem('thingor_items');
    localStorage.removeItem('thingor_items_backup');
    localStorage.removeItem('thingor_dashboard_metrics');
    localStorage.removeItem('thingor_documents');
    localStorage.removeItem('thingor_locations');
    localStorage.removeItem('thingor_household');
    localStorage.removeItem('thingor_household_members');
    localStorage.removeItem('thingor_household_invites');
    localStorage.removeItem('thingor_storage_containers');
    localStorage.removeItem('thingor_container_items');

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: pass });

      if (error) return { success: false, error: formatAuthError(error.message) };

      if (data.user) {
        const profile = await fetchUserProfile(
          data.user.id,
          cleanEmail,
          data.user.user_metadata?.display_name
        );
        if (isSuspended(profile)) {
          await supabase.auth.signOut();
          setUser(null);
          localStorage.removeItem('thingor_user');
          return {
            success: false,
            error: language === 'hu'
              ? 'Fiókod fel van függesztve. Kérjük, lépj kapcsolatba a rendszeradminisztrátorral.'
              : 'Your account is suspended. Please contact system administrator.'
          };
        }
        setUser(profile);
      }
      setIsAuthModalOpen(false);
      return { success: true };
    }

    const savedRegs = localStorage.getItem('thingor_registered_users');
    const registeredUsers: Array<{ email: string; pass: string; name: string; id: string; role?: string }> = savedRegs ? JSON.parse(savedRegs) : [];
    const matched = registeredUsers.find(u => u.email.toLowerCase() === cleanEmail && u.pass === pass);

    if (!matched) {
      return {
        success: false,
        error: language === 'hu'
          ? 'Hibás e-mail cím vagy jelszó. Csak regisztrált fiókkal lehet belépni.'
          : 'Invalid credentials. Only registered users can log in.'
      };
    }

    const isMatchedAdmin = matched.role === 'admin' || cleanEmail === 'mythingor@gmail.com';
    setUser({
      id: matched.id,
      user_id: matched.id,
      display_name: matched.name,
      email: matched.email,
      role: isMatchedAdmin ? 'admin' : 'user',
      status: 'active',
      is_admin: isMatchedAdmin,
    });
    setIsAuthModalOpen(false);
    return { success: true };
  };

  const getAuthRedirectUrl = (): string => {
    const customSiteUrl = import.meta.env.VITE_SITE_URL || import.meta.env.VITE_AUTH_REDIRECT_URL;
    if (customSiteUrl) return customSiteUrl.replace(/\/$/, '');
    return window.location.origin;
  };

  const signup = async (email: string, pass: string, name: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // Clear any previous user state before signing up
    setItems([]);
    setDocuments([]);
    setLocations([]);
    setHousehold(null);
    setHouseholdMembers([]);
    setHouseholdInvites([]);
    setReceivedInvites([]);
    setDashboardMetrics(null);
    localStorage.removeItem('thingor_items');
    localStorage.removeItem('thingor_items_backup');
    localStorage.removeItem('thingor_dashboard_metrics');
    localStorage.removeItem('thingor_documents');
    localStorage.removeItem('thingor_locations');
    localStorage.removeItem('thingor_household');
    localStorage.removeItem('thingor_household_members');
    localStorage.removeItem('thingor_household_invites');

    const currentIsAdmin = isAdmin(user);
    if (isRegistrationSuspended && !currentIsAdmin) {
      return {
        success: false,
        error: language === 'hu'
          ? 'Az új regisztrációk jelenleg fel vannak függesztve az adminisztrátor által.'
          : 'New user registrations are currently suspended by the administrator.'
      };
    }

    if (isSupabaseConfigured && supabase) {
      const redirectUrl = getAuthRedirectUrl();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: { display_name: name },
          emailRedirectTo: redirectUrl
        }
      });
      if (error) return { success: false, error: formatAuthError(error.message) };

      if (data.user && !data.session) {
        return { success: true, emailConfirmationRequired: true };
      }

      if (data.user && data.session) {
        const profile = await fetchUserProfile(
          data.user.id,
          cleanEmail,
          name || data.user.user_metadata?.display_name
        );
        setUser(profile);
        setIsAuthModalOpen(false);
      }
      return { success: true, emailConfirmationRequired: false };
    }

    const savedRegs = localStorage.getItem('thingor_registered_users');
    const registeredUsers: Array<{ email: string; pass: string; name: string; id: string }> = savedRegs ? JSON.parse(savedRegs) : [];

    if (registeredUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
      return {
        success: false,
        error: language === 'hu' ? 'Ez az e-mail cím már regisztrálva van!' : 'This email is already registered!'
      };
    }

    const newUser = {
      id: 'user-' + Date.now(),
      email: cleanEmail,
      pass: pass,
      name: name || cleanEmail.split('@')[0]
    };
    registeredUsers.push(newUser);
    localStorage.setItem('thingor_registered_users', JSON.stringify(registeredUsers));

    setUser({
      id: newUser.id,
      user_id: newUser.id,
      display_name: newUser.name,
      email: newUser.email,
      role: 'user',
      status: 'active',
      is_admin: false,
    });
    setIsAuthModalOpen(false);
    return { success: true, emailConfirmationRequired: false };
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (isSupabaseConfigured && supabase) {
      const redirectUrl = getAuthRedirectUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl
      });
      if (error) return { success: false, error: formatAuthError(error.message) };
      return { success: true };
    }
    return { success: true };
  };

  const updatePassword = async (newPassword: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error: formatAuthError(error.message) };
      setIsAuthModalOpen(false);
      return { success: true };
    }
    setIsAuthModalOpen(false);
    return { success: true };
  };

  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'No user session' };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('item_documents').delete().eq('user_id', user.id);
      await supabase.from('items').delete().eq('user_id', user.id);
      await supabase.from('locations').delete().eq('user_id', user.id);
      await supabase.from('categories').delete().eq('user_id', user.id).eq('is_custom', true);
      await supabase.from('profiles').delete().eq('user_id', user.id);
      await supabase.auth.signOut();
    }

    logout();
    return { success: true };
  };

  const logout = () => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(console.error);
    }
    setUser(null);
    setItems([]);
    setDocuments([]);
    setLocations([]);
    setHousehold(null);
    setHouseholdMembers([]);
    setHouseholdInvites([]);
    setReceivedInvites([]);
    setNotifications([]);
    setUserNotificationSettings(null);
    setVaultSettings(null);
    setIsVaultUnlocked(false);
    sessionStorage.removeItem('thingor_vault_unlocked');
    localStorage.removeItem('thingor_vault_settings');
    localStorage.removeItem('thingor_user');
    localStorage.removeItem('thingor_items');
    localStorage.removeItem('thingor_items_backup');
    localStorage.removeItem('thingor_dashboard_metrics');
    setDashboardMetrics(null);
    localStorage.removeItem('thingor_documents');
    localStorage.removeItem('thingor_locations');
    localStorage.removeItem('thingor_household');
    localStorage.removeItem('thingor_household_members');
    localStorage.removeItem('thingor_household_invites');
    localStorage.removeItem('thingor_notifications');
    localStorage.removeItem('thingor_notification_settings');
    localStorage.removeItem('thingor_storage_containers');
    localStorage.removeItem('thingor_container_items');
    setStorageContainers([]);
    setContainerItems([]);
    localStorage.removeItem('thingor_current_view');
    setIsAuthModalOpen(false);
    setCurrentView('landing');
  };

  const resetFilters = () => setFilters(INITIAL_FILTERS);

  // Helper location path builder
  const getLocationPath = (locationId: string): string => {
    const locMap = new Map(locations.map(l => [l.id, l]));
    const parts: string[] = [];
    const visited = new Set<string>();
    let currentId: string | null | undefined = locationId;

    while (currentId && locMap.has(currentId) && !visited.has(currentId)) {
      visited.add(currentId);
      const locObj: LocationItem = locMap.get(currentId)!;
      parts.unshift(locObj.name);
      currentId = locObj.parent_id;
    }

    return parts.length > 0 ? parts.join(' → ') : (language === 'hu' ? 'Nincs megadva' : 'Unspecified');
  };

  const getCategoryName = (categoryId: string): string => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return language === 'hu' ? 'Kategorizálatlan' : 'Uncategorized';

    if (language === 'en' && !cat.is_custom) {
      const enMap: Record<string, string> = {
        'Elektronika': 'Electronics',
        'Szerszámok': 'Tools',
        'Otthon & Háztartás': 'Home',
        'Kert': 'Garden',
        'Járművek': 'Vehicles',
        'Sport & Szabadidő': 'Sports',
        'Könyvek': 'Books',
        'Gyűjtemények': 'Collectibles',
        'Ruházat': 'Clothing',
        'Háztartási gépek': 'Appliances',
        'Egyéb tárgyak': 'Other',
      };
      return enMap[cat.name] || cat.name;
    } else if (language === 'hu' && !cat.is_custom) {
      const huMap: Record<string, string> = {
        'Electronics': 'Elektronika',
        'Tools': 'Szerszámok',
        'Home': 'Otthon & Háztartás',
        'Garden': 'Kert',
        'Vehicles': 'Járművek',
        'Sports': 'Sport & Szabadidő',
        'Books': 'Könyvek',
        'Collectibles': 'Gyűjtemények',
        'Clothing': 'Ruházat',
        'Appliances': 'Háztartási gépek',
        'Other': 'Egyéb tárgyak',
      };
      return huMap[cat.name] || cat.name;
    }

    return cat.name;
  };

  // CRUD Items (M8 Cloud Integration)
  const addItem = async (itemData: Omit<Item, 'id' | 'created_at'>): Promise<Item> => {
    const safeCategoryId = isUUID(itemData.category_id) ? itemData.category_id : null;
    const safeLocationId = isUUID(itemData.location_id) ? itemData.location_id : null;

    let targetHouseholdId: string | null = null;
    if (itemData.ownership_scope === 'household') {
      if (household && isUUID(household.id)) {
        targetHouseholdId = household.id;
      } else {
        const validHh = await ensureValidHousehold(household);
        if (validHh && isUUID(validHh.id)) {
          targetHouseholdId = validHh.id;
        }
      }
    }

    if (isSupabaseConfigured && supabase && user?.id) {
      const cleanPayload: Record<string, any> = {
        name: itemData.name.trim(),
        description: itemData.description?.trim() || null,
        category_id: safeCategoryId,
        location_id: safeLocationId,
        photo_url: itemData.photo_url?.trim() || null,
        additional_photos: itemData.additional_photos || [],
        purchase_date: itemData.purchase_date || null,
        purchase_price: itemData.purchase_price ?? null,
        current_value: itemData.current_value ?? null,
        store_seller: itemData.store_seller?.trim() || null,
        condition: itemData.condition || 'Good',
        status: itemData.status || 'Working',
        ownership_scope: itemData.ownership_scope || 'private',
        warranty_start: itemData.warranty_start || null,
        warranty_end: itemData.warranty_end || null,
        notes: itemData.notes?.trim() || null,
        user_id: user.id,
        household_id: targetHouseholdId,
      };

      const { data, error } = await supabase
        .from('items')
        .insert([cleanPayload])
        .select()
        .single();

      if (!error && data) {
        const addedItem = data as Item;
        setItems(prev => [addedItem, ...prev.filter(i => i.id !== addedItem.id)]);
        refreshItems();
        return addedItem;
      }

      if (error) {
        console.error('Supabase items insert failed:', error.message || error);
        // Retry insert without status field in case database table hasn't added status column yet
        if (error.message && error.message.includes('status')) {
          const fallbackPayload = { ...cleanPayload };
          delete fallbackPayload.status;
          const { data: fbData, error: fbError } = await supabase
            .from('items')
            .insert([fallbackPayload])
            .select()
            .single();
          if (!fbError && fbData) {
            const addedItem = fbData as Item;
            setItems(prev => [addedItem, ...prev.filter(i => i.id !== addedItem.id)]);
            refreshItems();
            return addedItem;
          }
        }
      }
    }

    const newItem: Item = {
      ...itemData,
      id: 'item-' + Date.now(),
      user_id: user?.id,
      household_id: targetHouseholdId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setItems(prev => [newItem, ...prev]);
    refreshItems();
    return newItem;
  };

  const updateItem = async (id: string, updates: Partial<Item>): Promise<void> => {
    let targetHouseholdId: string | null | undefined = undefined;
    if (updates.ownership_scope === 'household') {
      if (household && isUUID(household.id)) {
        targetHouseholdId = household.id;
      } else {
        const validHh = await ensureValidHousehold(household);
        if (validHh && isUUID(validHh.id)) {
          targetHouseholdId = validHh.id;
        }
      }
    } else if (updates.ownership_scope === 'private') {
      targetHouseholdId = null;
    }

    if (isSupabaseConfigured && supabase && user?.id && isUUID(id)) {
      const cleanUpdates: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };
      if ('category_id' in cleanUpdates && !isUUID(cleanUpdates.category_id)) {
        cleanUpdates.category_id = null;
      }
      if ('location_id' in cleanUpdates && !isUUID(cleanUpdates.location_id)) {
        cleanUpdates.location_id = null;
      }
      if (targetHouseholdId !== undefined) {
        cleanUpdates.household_id = targetHouseholdId;
      }

      // Convert empty strings to null for optional dates/fields
      if (cleanUpdates.purchase_date === '') cleanUpdates.purchase_date = null;
      if (cleanUpdates.warranty_start === '') cleanUpdates.warranty_start = null;
      if (cleanUpdates.warranty_end === '') cleanUpdates.warranty_end = null;
      if (cleanUpdates.description === '') cleanUpdates.description = null;
      if (cleanUpdates.notes === '') cleanUpdates.notes = null;

      delete cleanUpdates.id;
      delete cleanUpdates.created_at;

      const { error } = await supabase
        .from('items')
        .update(cleanUpdates)
        .eq('id', id);

      if (error) {
        console.error('Supabase items update failed:', error.message || error);
      }
    }

    setItems(prev => prev.map(item => item.id === id ? {
      ...item,
      ...updates,
      ...(targetHouseholdId !== undefined ? { household_id: targetHouseholdId } : {}),
      updated_at: new Date().toISOString()
    } : item));
    refreshItems();
  };

  const deleteItem = async (id: string): Promise<void> => {
    const targetItem = items.find(item => item.id === id);
    const relatedDocs = documents.filter(doc => doc.item_id === id);

    if (targetItem?.photo_url) {
      deleteFileFromStorage(targetItem.photo_url).catch(err => console.warn('Failed to delete item photo from storage:', err));
    }
    if (targetItem?.additional_photos && targetItem.additional_photos.length > 0) {
      targetItem.additional_photos.forEach(photo => {
        if (photo) deleteFileFromStorage(photo).catch(err => console.warn('Failed to delete additional photo from storage:', err));
      });
    }
    relatedDocs.forEach(doc => {
      if (doc.file_url) {
        deleteFileFromStorage(doc.file_url).catch(err => console.warn('Failed to delete doc file from storage:', err));
      }
    });

    if (isSupabaseConfigured && supabase && user?.id && isUUID(id)) {
      await supabase.from('items').delete().eq('id', id);
    }

    setItems(prev => prev.filter(item => item.id !== id));
    setDocuments(prev => prev.filter(doc => doc.item_id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
    refreshItems();
  };

  // CRUD Categories (M6 Cloud Integration)
  const addCategory = async (name: string): Promise<Category> => {
    if (isSupabaseConfigured && supabase && user?.id) {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name, is_custom: true, user_id: user.id }])
        .select()
        .single();

      if (!error && data) {
        setCategories(prev => [...prev, data as Category]);
        return data as Category;
      }
    }

    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name,
      is_custom: true,
      user_id: user?.id,
      created_at: new Date().toISOString(),
    };
    setCategories(prev => [...prev, newCat]);
    return newCat;
  };

  // CRUD Locations (M7 Cloud Integration)
  const addLocation = async (name: string, parentId?: string | null): Promise<LocationItem> => {
    const trimmed = name.trim();
    const safeParentId = parentId && parentId !== '' ? parentId : null;

    // Prevent duplicate location creation (case-insensitive check)
    const existing = locations.find(l => l.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      return existing;
    }

    if (isSupabaseConfigured && supabase && user?.id) {
      const { data, error } = await supabase
        .from('locations')
        .insert([{ name: trimmed, parent_id: safeParentId, user_id: user.id }])
        .select()
        .single();

      if (!error && data) {
        setLocations(prev => [...prev, data as LocationItem]);
        return data as LocationItem;
      }
    }

    const newLoc: LocationItem = {
      id: 'loc-' + Date.now(),
      name: trimmed,
      parent_id: safeParentId,
      user_id: user?.id,
      created_at: new Date().toISOString(),
    };
    setLocations(prev => [...prev, newLoc]);
    return newLoc;
  };

  const deleteLocation = async (id: string): Promise<void> => {
    if (isSupabaseConfigured && supabase && user?.id) {
      await supabase.from('locations').delete().eq('id', id).eq('user_id', user.id);
    }
    setLocations(prev => prev.filter(l => l.id !== id && l.parent_id !== id));
  };

  // CRUD Documents (M9 Cloud Integration)
  const addDocument = async (
    itemId: string,
    fileName: string,
    fileUrl: string,
    docType: ItemDocument['document_type']
  ): Promise<ItemDocument> => {
    if (isSupabaseConfigured && supabase && user?.id && isUUID(itemId)) {
      const { data, error } = await supabase
        .from('item_documents')
        .insert([{
          item_id: itemId,
          user_id: user.id,
          file_name: fileName,
          file_url: fileUrl,
          document_type: docType,
        }])
        .select()
        .single();

      if (!error && data) {
        setDocuments(prev => [data as ItemDocument, ...prev]);
        return data as ItemDocument;
      }
    }

    const newDoc: ItemDocument = {
      id: 'doc-' + Date.now(),
      item_id: itemId,
      user_id: user?.id,
      file_name: fileName,
      file_url: fileUrl,
      document_type: docType,
      created_at: new Date().toISOString(),
      size_bytes: Math.floor(Math.random() * 800000) + 100000,
    };
    setDocuments(prev => [newDoc, ...prev]);
    return newDoc;
  };

  const deleteDocument = async (docId: string): Promise<void> => {
    const docToDelete = documents.find(d => d.id === docId);
    if (docToDelete?.file_url) {
      deleteFileFromStorage(docToDelete.file_url).catch(err => console.warn('Failed to delete document from storage:', err));
    }

    if (isSupabaseConfigured && supabase && user?.id && isUUID(docId)) {
      await supabase.from('item_documents').delete().eq('id', docId).eq('user_id', user.id);
    }
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  // Notification Engine Helpers
  const createNotification = async (noteData: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>) => {
    if (userNotificationSettings && userNotificationSettings.inapp_enabled === false) {
      return;
    }
    if (noteData.type === 'warranty' && userNotificationSettings?.warranty_enabled === false) return;
    if (noteData.type === 'financing' && userNotificationSettings?.financing_enabled === false) return;
    if (noteData.type === 'repair' && userNotificationSettings?.repair_enabled === false) return;

    const newNote: AppNotification = {
      ...noteData,
      id: 'note-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      is_read: false,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase && user?.id) {
      // Map client-only notification types (e.g. 'pantry', 'lending') to 'system'
      // to avoid Postgres CHECK constraint violation: notifications_type_check
      const dbType = (['warranty', 'financing', 'repair', 'system'].includes(noteData.type))
        ? noteData.type
        : 'system';

      const { data, error } = await supabase
        .from('notifications')
        .insert([{ ...noteData, type: dbType, user_id: user.id }])
        .select()
        .single();

      if (!error && data) {
        setNotifications(prev => {
          if (prev.some(n => n.id === data.id || (data.dedup_key && n.dedup_key === data.dedup_key))) {
            return prev;
          }
          const updated = [data as AppNotification, ...prev];
          localStorage.setItem('thingor_notifications', JSON.stringify(updated));
          return updated;
        });
        return;
      }

      // If duplicate key error in Supabase (23505), the notification ALREADY EXISTS in database!
      // Do NOT create an unread local duplicate.
      if (error && (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint') || (error as any).details?.includes('already exists'))) {
        return;
      }
    }

    setNotifications(prev => {
      if (prev.some(n => noteData.dedup_key && n.dedup_key === noteData.dedup_key)) {
        return prev;
      }
      const updated = [newNote, ...prev];
      localStorage.setItem('thingor_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const fetchNotifications = async () => {
    if (!notificationTablesAvailableRef.current) return;
    if (isSupabaseConfigured && supabase && user?.id) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          if (error.code === 'PGRST301' || error.code === '42P01' || (error as any).status === 404 || error.message?.includes('404') || error.message?.includes('does not exist')) {
            notificationTablesAvailableRef.current = false;
            return;
          }
        }

        if (!error && data) {
          setNotifications(data as AppNotification[]);
          localStorage.setItem('thingor_notifications', JSON.stringify(data));
        }

        const { data: settingsData, error: settingsError } = await supabase
          .from('user_notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (settingsError) {
          if (settingsError.code === 'PGRST301' || settingsError.code === '42P01' || (settingsError as any).status === 404 || settingsError.message?.includes('404') || settingsError.message?.includes('does not exist')) {
            notificationTablesAvailableRef.current = false;
          }
        }

        if (!settingsError && settingsData) {
          setUserNotificationSettings(settingsData as UserNotificationSettings);
          localStorage.setItem('thingor_notification_settings', JSON.stringify(settingsData));
        }
      } catch (err) {
        console.warn('Temporary issue fetching notifications:', err);
      }
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    let previousNotifications: AppNotification[] = [];
    setNotifications(prev => {
      previousNotifications = prev;
      const updated = prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n);
      localStorage.setItem('thingor_notifications', JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured && supabase && user?.id && notificationTablesAvailableRef.current) {
      try {
        let query = supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id);

        if (isUUID(notificationId)) {
          query = query.eq('id', notificationId);
        } else {
          // If local ID, try matching by dedup_key from the notification object
          const target = previousNotifications.find(n => n.id === notificationId);
          if (target?.dedup_key) {
            query = query.eq('dedup_key', target.dedup_key);
          } else {
            return;
          }
        }

        const { error } = await query;
        if (error) {
          console.error('Failed to mark notification as read in Supabase:', error);
          setNotifications(previousNotifications);
          localStorage.setItem('thingor_notifications', JSON.stringify(previousNotifications));
        }
      } catch (err) {
        console.error('Exception marking notification as read in Supabase:', err);
        setNotifications(previousNotifications);
        localStorage.setItem('thingor_notifications', JSON.stringify(previousNotifications));
      }
    }
  };

  const markAllNotificationsAsRead = async () => {
    let previousNotifications: AppNotification[] = [];
    setNotifications(prev => {
      previousNotifications = prev;
      const updated = prev.map(n => ({ ...n, is_read: true }));
      localStorage.setItem('thingor_notifications', JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured && supabase && user?.id && notificationTablesAvailableRef.current) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id);

        if (error) {
          console.error('Failed to mark all notifications as read in Supabase:', error);
          setNotifications(previousNotifications);
          localStorage.setItem('thingor_notifications', JSON.stringify(previousNotifications));
        }
      } catch (err) {
        console.error('Exception marking all notifications as read in Supabase:', err);
        setNotifications(previousNotifications);
        localStorage.setItem('thingor_notifications', JSON.stringify(previousNotifications));
      }
    }
  };

  const deleteNotification = async (notificationId: string) => {
    let previousNotifications: AppNotification[] = [];
    setNotifications(prev => {
      previousNotifications = prev;
      const updated = prev.filter(n => n.id !== notificationId);
      localStorage.setItem('thingor_notifications', JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured && supabase && user?.id && notificationTablesAvailableRef.current) {
      try {
        let query = supabase.from('notifications').delete().eq('user_id', user.id);
        if (isUUID(notificationId)) {
          query = query.eq('id', notificationId);
        } else {
          const target = previousNotifications.find(n => n.id === notificationId);
          if (target?.dedup_key) {
            query = query.eq('dedup_key', target.dedup_key);
          } else {
            return;
          }
        }
        const { error } = await query;
        if (error) {
          console.error('Failed to delete notification in Supabase:', error);
          setNotifications(previousNotifications);
          localStorage.setItem('thingor_notifications', JSON.stringify(previousNotifications));
        }
      } catch (err) {
        console.error('Exception deleting notification in Supabase:', err);
        setNotifications(previousNotifications);
        localStorage.setItem('thingor_notifications', JSON.stringify(previousNotifications));
      }
    }
  };

  const updateNotificationSettings = async (settingsUpdates: Partial<UserNotificationSettings>) => {
    setUserNotificationSettings(prev => {
      const updated = prev ? { ...prev, ...settingsUpdates } : {
        user_id: user?.id || '',
        warranty_enabled: true,
        financing_enabled: true,
        repair_enabled: true,
        email_enabled: true,
        inapp_enabled: true,
        ...settingsUpdates,
      };
      localStorage.setItem('thingor_notification_settings', JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured && supabase && user?.id && notificationTablesAvailableRef.current) {
      await supabase.from('user_notification_settings').upsert({
        user_id: user.id,
        ...settingsUpdates,
        updated_at: new Date().toISOString(),
      });
    }
  };

  // Background evaluator for warranty & financing notifications
  const checkAndGenerateNotifications = () => {
    if (siteSettings.notifications_enabled === false) return;
    if (userNotificationSettings?.inapp_enabled === false) return;
    if (!user?.id) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    // 1. Warranty Checks (30, 14, 3, 0 days)
    if (userNotificationSettings?.warranty_enabled !== false) {
      for (const item of items) {
        if (!item.warranty_end) continue;
        const warrantyDate = new Date(item.warranty_end);
        const diffMs = warrantyDate.getTime() - today.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        let alertThreshold: number | null = null;
        if (diffDays === 30) alertThreshold = 30;
        else if (diffDays === 14) alertThreshold = 14;
        else if (diffDays === 3) alertThreshold = 3;
        else if (diffDays === 0) alertThreshold = 0;

        if (alertThreshold !== null) {
          const dedupKey = `warranty:${item.id}:${alertThreshold}d`;
          const title = alertThreshold === 0
            ? (language === 'hu' ? 'A garancia ma lejár!' : 'Warranty expires today!')
            : (language === 'hu' ? `Garancia lejárati figyelmeztetés (${alertThreshold} nap)` : `Warranty Expiry Alert (${alertThreshold} days)`);
          const description = alertThreshold === 0
            ? (language === 'hu' ? `A(z) "${item.name}" tárgy garanciája a mai napon (${item.warranty_end}) lejár.` : `The warranty for "${item.name}" expires today (${item.warranty_end}).`)
            : (language === 'hu' ? `A(z) "${item.name}" tárgy garanciája ${alertThreshold} nap múlva lejár (${item.warranty_end}).` : `The warranty for "${item.name}" expires in ${alertThreshold} days (${item.warranty_end}).`);

          createNotification({
            user_id: user.id,
            title,
            description,
            type: 'warranty',
            reference_id: item.id,
            dedup_key: dedupKey,
          });
        }
      }
    }

    // 2. Financing Checks (7, 3, 0 days)
    if (userNotificationSettings?.financing_enabled !== false) {
      for (const fin of financings) {
        if (!fin.next_payment_date) continue;
        const item = items.find(i => i.id === fin.item_id);
        const itemName = item?.name || 'Finanszírozott tárgy';

        const paymentDate = new Date(fin.next_payment_date);
        const diffMs = paymentDate.getTime() - today.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        let alertThreshold: number | null = null;
        if (diffDays === 7) alertThreshold = 7;
        else if (diffDays === 3) alertThreshold = 3;
        else if (diffDays === 0) alertThreshold = 0;

        if (alertThreshold !== null) {
          const dedupKey = `financing:${fin.id}:${fin.next_payment_date}:${alertThreshold}d`;
          const title = alertThreshold === 0
            ? (language === 'hu' ? 'Részletfizetés esedékes a mai napon!' : 'Financing payment due today!')
            : (language === 'hu' ? `Közelgő részletfizetés (${alertThreshold} nap)` : `Upcoming payment (${alertThreshold} days)`);
          const description = alertThreshold === 0
            ? (language === 'hu' ? `A(z) "${itemName}" mai napon fizetendő részlete: ${fin.monthly_installment} Ft (${fin.provider || 'Finanszírozás'}).` : `Payment due today for "${itemName}": ${fin.monthly_installment} (${fin.provider}).`)
            : (language === 'hu' ? `A(z) "${itemName}" esedékes havi részlete: ${fin.monthly_installment} Ft (${fin.next_payment_date} - ${fin.provider || 'Finanszírozás'}).` : `Monthly installment for "${itemName}": ${fin.monthly_installment} due on ${fin.next_payment_date}.`);

          createNotification({
            user_id: user.id,
            title,
            description,
            type: 'financing',
            reference_id: fin.id,
            dedup_key: dedupKey,
          });
        }
      }
    }

    // 3. Shopping Cart / Pantry Low Stock Checks
    if (userNotificationSettings?.shopping_cart_enabled !== false) {
      for (const pItem of pantryItems) {
        if (!pItem.is_staple) continue;
        const currentQty = Number(pItem.current_quantity);
        const minThreshold = Number(pItem.min_threshold);
        if (currentQty <= minThreshold) {
          const isOut = currentQty <= 0;
          const dedupKey = `shopping_cart:${pItem.id}:${todayStr}`;
          const title = isOut
            ? (language === 'hu' ? 'Elfogyott a készlet: Bevásárlólista!' : 'Out of stock: Shopping List!')
            : (language === 'hu' ? 'Fogyóban lévő készlet: Bevásárlólista!' : 'Low stock: Shopping List!');
          const description = isOut
            ? (language === 'hu'
                ? `A(z) "${pItem.name}" alapvető cikk elfogyott a spájzból (0 ${pItem.unit}). Ideje beszerezni!`
                : `Staple item "${pItem.name}" is completely out of stock (0 ${pItem.unit}). Time to restock!`)
            : (language === 'hu'
                ? `A(z) "${pItem.name}" elérte a minimális szintet (${currentQty} ${pItem.unit} maradt, minimum: ${minThreshold} ${pItem.unit}).`
                : `"${pItem.name}" is running low (${currentQty} ${pItem.unit} left, min: ${minThreshold} ${pItem.unit}).`);

          createNotification({
            user_id: user.id,
            title,
            description,
            type: 'pantry',
            reference_id: pItem.id,
            dedup_key: dedupKey,
          });
        }
      }
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && (items.length > 0 || financings.length > 0 || pantryItems.length > 0)) {
      checkAndGenerateNotifications();
    }
  }, [items, financings, pantryItems, user?.id]);

  // CRUD Repairs & Maintenance
  const addRepair = async (repairData: Omit<ItemRepair, 'id' | 'created_at'>): Promise<ItemRepair> => {
    const newRepair: ItemRepair = {
      ...repairData,
      id: 'repair-' + Date.now(),
      user_id: user?.id,
      created_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured && supabase && user?.id) {
      const { data, error } = await supabase.from('item_repairs').insert([{ ...repairData, user_id: user.id }]).select().single();
      if (!error && data) {
        setRepairs(prev => [data as ItemRepair, ...prev]);
        updateItem(repairData.item_id, { status: repairData.status === 'completed' ? 'Repaired' : 'UnderRepair' });
        createNotification({
          user_id: user.id,
          title: language === 'hu' ? 'Új javítás rögzítve' : 'New Repair Logged',
          description: language === 'hu' ? `Új javítás lett rögzítve: "${repairData.fault_title || 'Szerviz'}"` : `New repair logged: "${repairData.fault_title || 'Service'}"`,
          type: 'repair',
          reference_id: repairData.item_id,
          dedup_key: `repair:${data.id}:pending`,
        });
        return data as ItemRepair;
      }
    }
    setRepairs(prev => [newRepair, ...prev]);
    updateItem(repairData.item_id, { status: repairData.status === 'completed' ? 'Repaired' : 'UnderRepair' });
    createNotification({
      user_id: user?.id || '',
      title: language === 'hu' ? 'Új javítás rögzítve' : 'New Repair Logged',
      description: language === 'hu' ? `Új javítás lett rögzítve: "${repairData.fault_title || 'Szerviz'}"` : `New repair logged: "${repairData.fault_title || 'Service'}"`,
      type: 'repair',
      reference_id: repairData.item_id,
      dedup_key: `repair:${newRepair.id}:pending`,
    });
    return newRepair;
  };

  const updateRepairStatus = async (repairId: string, status: RepairStatus, details?: Partial<ItemRepair>): Promise<void> => {
    setRepairs(prev => prev.map(r => r.id === repairId ? { ...r, status, ...details, completed_at: status === 'completed' ? (details?.completed_at || new Date().toISOString().split('T')[0]) : r.completed_at } : r));
    const targetRepair = repairs.find(r => r.id === repairId);
    if (targetRepair) {
      const itemStatus = status === 'completed' ? 'Repaired' : status === 'in_progress' ? 'UnderRepair' : 'Faulty';
      updateItem(targetRepair.item_id, { status: itemStatus });
      const statusLabel = status === 'completed' ? (language === 'hu' ? 'elkészült' : 'completed') : status === 'in_progress' ? (language === 'hu' ? 'folyamatban' : 'in progress') : (language === 'hu' ? 'frissült' : 'updated');
      createNotification({
        user_id: user?.id || '',
        title: language === 'hu' ? `Javítás státusza: ${statusLabel}` : `Repair status: ${statusLabel}`,
        description: language === 'hu' ? `A(z) "${targetRepair.fault_title || 'tárgy'}" javítási státusza megváltozott.` : `Repair status for "${targetRepair.fault_title || 'item'}" was updated.`,
        type: 'repair',
        reference_id: targetRepair.item_id,
        dedup_key: `repair:${repairId}:${status}:${Date.now()}`,
      });
    }
    if (isSupabaseConfigured && supabase && isUUID(repairId)) {
      await supabase.from('item_repairs').update({ status, ...details }).eq('id', repairId);
    }
  };

  const deleteRepair = async (repairId: string): Promise<void> => {
    setRepairs(prev => prev.filter(r => r.id !== repairId));
    if (isSupabaseConfigured && supabase && isUUID(repairId)) {
      await supabase.from('item_repairs').delete().eq('id', repairId);
    }
  };

  // CRUD Installments & Financing
  const saveFinancing = async (finData: Omit<ItemFinancing, 'id' | 'created_at'>): Promise<ItemFinancing> => {
    const existing = financings.find(f => f.item_id === finData.item_id);
    const totalFinanced = finData.original_price - finData.down_payment;
    const remainingDebt = Math.max(0, totalFinanced - (finData.paid_installments * finData.monthly_installment));
    const remainingInstallments = Math.max(0, finData.total_installments - finData.paid_installments);

    const payload = {
      ...finData,
      financed_amount: totalFinanced,
      remaining_installments: remainingInstallments,
      remaining_debt: remainingDebt,
    };

    if (existing) {
      setFinancings(prev => prev.map(f => f.id === existing.id ? { ...f, ...payload } : f));
      if (isSupabaseConfigured && supabase && isUUID(existing.id)) {
        await supabase.from('item_financings').update(payload).eq('id', existing.id);
      }
      return { ...existing, ...payload };
    } else {
      const newFin: ItemFinancing = {
        ...payload,
        id: 'fin-' + Date.now(),
        user_id: user?.id,
        created_at: new Date().toISOString(),
      };
      if (isSupabaseConfigured && supabase && user?.id) {
        const { data, error } = await supabase.from('item_financings').insert([{ ...payload, user_id: user.id }]).select().single();
        if (!error && data) {
          setFinancings(prev => [data as ItemFinancing, ...prev]);
          return data as ItemFinancing;
        }
      }
      setFinancings(prev => [newFin, ...prev]);
      return newFin;
    }
  };

  const recordInstallmentPayment = async (financingId: string): Promise<void> => {
    setFinancings(prev => prev.map(f => {
      if (f.id !== financingId) return f;
      const newPaid = Math.min(f.total_installments, f.paid_installments + 1);
      const newRemainingInst = Math.max(0, f.total_installments - newPaid);
      const newRemainingDebt = Math.max(0, f.financed_amount - (newPaid * f.monthly_installment));
      
      let nextDate = f.next_payment_date;
      if (nextDate && newRemainingInst > 0) {
        const d = new Date(nextDate);
        d.setMonth(d.getMonth() + 1);
        nextDate = d.toISOString().split('T')[0];
      }

      const updated = {
        ...f,
        paid_installments: newPaid,
        remaining_installments: newRemainingInst,
        remaining_debt: newRemainingDebt,
        next_payment_date: nextDate,
      };

      if (isSupabaseConfigured && supabase && isUUID(financingId)) {
        supabase.from('item_financings').update({
          paid_installments: newPaid,
          remaining_installments: newRemainingInst,
          remaining_debt: newRemainingDebt,
          next_payment_date: nextDate,
        }).eq('id', financingId);
      }

      return updated;
    }));
  };

  const deleteFinancing = async (financingId: string): Promise<void> => {
    setFinancings(prev => prev.filter(f => f.id !== financingId));
    if (isSupabaseConfigured && supabase && isUUID(financingId)) {
      await supabase.from('item_financings').delete().eq('id', financingId);
    }
  };

  // CRUD Lending & Borrowing Module
  const addLoan = async (loanData: Omit<ItemLoan, 'id' | 'created_at'>): Promise<ItemLoan> => {
    const newLoan: ItemLoan = {
      ...loanData,
      id: 'loan-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase && user?.id) {
      try {
        const { data, error } = await supabase
          .from('item_loans')
          .insert([{
            user_id: user.id,
            item_id: loanData.item_id,
            borrower_name: loanData.borrower_name,
            borrower_contact: loanData.borrower_contact,
            borrower_email: loanData.borrower_email,
            lent_date: loanData.lent_date,
            expected_return_date: loanData.expected_return_date,
            actual_return_date: loanData.actual_return_date,
            status: loanData.status || 'active',
            notes: loanData.notes,
          }])
          .select()
          .single();

        if (!error && data) {
          setLoans(prev => [data as ItemLoan, ...prev]);
          return data as ItemLoan;
        }
      } catch (e) {
        console.warn('Failed to insert loan in Supabase, saving locally:', e);
      }
    }

    setLoans(prev => [newLoan, ...prev]);
    return newLoan;
  };

  const updateLoan = async (id: string, updates: Partial<ItemLoan>): Promise<void> => {
    setLoans(prev => prev.map(l => l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l));

    if (isSupabaseConfigured && supabase && isUUID(id)) {
      try {
        await supabase
          .from('item_loans')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (e) {
        console.warn('Failed to update loan in Supabase:', e);
      }
    }
  };

  const returnLoan = async (id: string): Promise<void> => {
    const today = new Date().toISOString().split('T')[0];
    await updateLoan(id, {
      status: 'returned',
      actual_return_date: today,
    });
  };

  const deleteLoan = async (id: string): Promise<void> => {
    setLoans(prev => prev.filter(l => l.id !== id));

    if (isSupabaseConfigured && supabase && isUUID(id)) {
      try {
        await supabase
          .from('item_loans')
          .delete()
          .eq('id', id);
      } catch (e) {
        console.warn('Failed to delete loan from Supabase:', e);
      }
    }
  };

  // Lending Contacts CRUD
  const addLendingContact = async (contactData: Omit<LendingContact, 'id' | 'created_at' | 'updated_at'>): Promise<LendingContact> => {
    const newContact: LendingContact = {
      ...contactData,
      id: 'lc-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase && user?.id) {
      try {
        const { data, error } = await supabase
          .from('lending_contacts')
          .insert([{
            user_id: user.id,
            name: contactData.name,
            contact_info: contactData.contact_info,
            relationship: contactData.relationship,
            notes: contactData.notes,
          }])
          .select()
          .single();

        if (!error && data) {
          setLendingContacts(prev => [...prev, data as LendingContact].sort((a, b) => a.name.localeCompare(b.name)));
          return data as LendingContact;
        }
      } catch (e) {
        console.warn('Failed to insert lending contact in Supabase:', e);
      }
    }

    setLendingContacts(prev => [...prev, newContact].sort((a, b) => a.name.localeCompare(b.name)));
    return newContact;
  };

  const updateLendingContact = async (id: string, updates: Partial<LendingContact>): Promise<void> => {
    setLendingContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c));

    if (isSupabaseConfigured && supabase && isUUID(id)) {
      try {
        await supabase
          .from('lending_contacts')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (e) {
        console.warn('Failed to update lending contact in Supabase:', e);
      }
    }
  };

  const deleteLendingContact = async (id: string): Promise<void> => {
    setLendingContacts(prev => prev.filter(c => c.id !== id));

    if (isSupabaseConfigured && supabase && isUUID(id)) {
      try {
        await supabase.from('lending_contacts').delete().eq('id', id);
      } catch (e) {
        console.warn('Failed to delete lending contact from Supabase:', e);
      }
    }
  };

  // CRUD Collections & Curated Catalogs Module
  const addCollection = async (colData: Omit<Collection, 'id' | 'created_at'>): Promise<Collection> => {
    const newCol: Collection = {
      ...colData,
      id: 'col-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase && user?.id) {
      try {
        const { data, error } = await supabase
          .from('collections')
          .insert([{
            user_id: user.id,
            name: colData.name,
            description: colData.description,
            collection_type: colData.collection_type || 'general',
            cover_image_url: colData.cover_image_url,
            is_public: colData.is_public ?? false,
          }])
          .select()
          .single();

        if (!error && data) {
          setCollections(prev => [data as Collection, ...prev]);
          return data as Collection;
        }
      } catch (e) {
        console.warn('Failed to insert collection in Supabase, saving locally:', e);
      }
    }

    setCollections(prev => [newCol, ...prev]);
    return newCol;
  };

  const updateCollection = async (id: string, updates: Partial<Collection>): Promise<void> => {
    setCollections(prev => prev.map(c => c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c));

    if (isSupabaseConfigured && supabase && isUUID(id)) {
      try {
        await supabase
          .from('collections')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (e) {
        console.warn('Failed to update collection in Supabase:', e);
      }
    }
  };

  const deleteCollection = async (id: string): Promise<void> => {
    setCollections(prev => prev.filter(c => c.id !== id));
    setCollectionItems(prev => prev.filter(ci => ci.collection_id !== id));

    if (isSupabaseConfigured && supabase && isUUID(id)) {
      try {
        await supabase.from('collections').delete().eq('id', id);
      } catch (e) {
        console.warn('Failed to delete collection from Supabase:', e);
      }
    }
  };

  const addItemToCollection = async (
    collectionId: string,
    itemId?: string | null,
    details?: Partial<CollectionItem>
  ): Promise<CollectionItem> => {
    if (itemId) {
      const existing = collectionItems.find(ci => ci.collection_id === collectionId && ci.item_id === itemId);
      if (existing) {
        const updated = { ...existing, ...details };
        setCollectionItems(prev => prev.map(ci => ci.id === existing.id ? updated : ci));
        if (isSupabaseConfigured && supabase && isUUID(existing.id)) {
          await supabase.from('collection_items').update(details || {}).eq('id', existing.id);
        }
        return updated;
      }
    }

    const newItem: CollectionItem = {
      id: 'ci-' + Date.now(),
      collection_id: collectionId,
      item_id: itemId || null,
      name: details?.name,
      description: details?.description,
      photo_url: details?.photo_url,
      additional_photos: details?.additional_photos || [],
      quantity: details?.quantity ?? 1,
      collector_grade: details?.collector_grade,
      rarity: details?.rarity,
      acquired_year: details?.acquired_year,
      catalog_number: details?.catalog_number,
      estimated_collector_value: details?.estimated_collector_value,
      custom_attributes: details?.custom_attributes || {},
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase && isUUID(collectionId)) {
      try {
        const insertPayload: any = {
          collection_id: collectionId,
          collector_grade: details?.collector_grade,
          rarity: details?.rarity,
          acquired_year: details?.acquired_year,
          catalog_number: details?.catalog_number,
          estimated_collector_value: details?.estimated_collector_value,
          custom_attributes: details?.custom_attributes || {},
        };
        if (itemId && isUUID(itemId)) {
          insertPayload.item_id = itemId;
        } else {
          insertPayload.item_id = null;
        }
        if (details?.name) insertPayload.name = details.name;
        if (details?.description) insertPayload.description = details.description;
        if (details?.photo_url) insertPayload.photo_url = details.photo_url;
        if (details?.additional_photos) insertPayload.additional_photos = details.additional_photos;
        if (details?.quantity !== undefined) insertPayload.quantity = details.quantity;

        const { data, error } = await supabase
          .from('collection_items')
          .insert([insertPayload])
          .select()
          .single();

        if (!error && data) {
          setCollectionItems(prev => [...prev, data as CollectionItem]);
          return data as CollectionItem;
        }
      } catch (e) {
        console.warn('Failed to insert collection_item in Supabase:', e);
      }
    }

    setCollectionItems(prev => [...prev, newItem]);
    return newItem;
  };

  const updateCollectionItem = async (collectionItemId: string, updates: Partial<CollectionItem>): Promise<void> => {
    setCollectionItems(prev => prev.map(ci => ci.id === collectionItemId ? { ...ci, ...updates } : ci));

    if (isSupabaseConfigured && supabase && isUUID(collectionItemId)) {
      try {
        await supabase
          .from('collection_items')
          .update(updates)
          .eq('id', collectionItemId);
      } catch (e) {
        console.warn('Failed to update collection item in Supabase:', e);
      }
    }
  };

  const deleteCollectionItem = async (collectionItemId: string): Promise<void> => {
    setCollectionItems(prev => prev.filter(ci => ci.id !== collectionItemId));

    if (isSupabaseConfigured && supabase && isUUID(collectionItemId)) {
      try {
        await supabase
          .from('collection_items')
          .delete()
          .eq('id', collectionItemId);
      } catch (e) {
        console.warn('Failed to delete collection item in Supabase:', e);
      }
    }
  };

  const removeItemFromCollection = async (collectionId: string, itemIdOrCollectionItemId: string): Promise<void> => {
    setCollectionItems(prev => prev.filter(ci =>
      !(ci.collection_id === collectionId && (ci.item_id === itemIdOrCollectionItemId || ci.id === itemIdOrCollectionItemId))
    ));

    if (isSupabaseConfigured && supabase && isUUID(collectionId)) {
      try {
        if (isUUID(itemIdOrCollectionItemId)) {
          await supabase
            .from('collection_items')
            .delete()
            .or(`id.eq.${itemIdOrCollectionItemId},and(collection_id.eq.${collectionId},item_id.eq.${itemIdOrCollectionItemId})`);
        }
      } catch (e) {
        console.warn('Failed to remove item from collection in Supabase:', e);
      }
    }
  };

  const getCollectionItems = useCallback((collectionId: string): CollectionItem[] => {
    return collectionItems.filter(ci => ci.collection_id === collectionId);
  }, [collectionItems]);

  // CRUD Pantry & Consumables Module
  const addPantryItem = async (pantryData: Omit<PantryItem, 'id' | 'created_at'>): Promise<PantryItem> => {
    const newItem: PantryItem = {
      ...pantryData,
      id: 'pantry-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase && user?.id) {
      try {
        const { data, error } = await supabase
          .from('pantry_items')
          .insert([{
            user_id: user.id,
            household_id: pantryData.household_id || household?.id || null,
            name: pantryData.name,
            category: pantryData.category,
            current_quantity: pantryData.current_quantity,
            unit: pantryData.unit || 'db',
            min_threshold: pantryData.min_threshold,
            expiration_date: pantryData.expiration_date,
            location_id: pantryData.location_id,
            notes: pantryData.notes,
            is_staple: pantryData.is_staple ?? true,
          }])
          .select()
          .single();

        if (!error && data) {
          setPantryItems(prev => [data as PantryItem, ...prev]);
          return data as PantryItem;
        }
      } catch (e) {
        console.warn('Failed to insert pantry_item in Supabase:', e);
      }
    }

    setPantryItems(prev => [newItem, ...prev]);
    return newItem;
  };

  const updatePantryItem = async (id: string, updates: Partial<PantryItem>): Promise<void> => {
    setPantryItems(prev => prev.map(p => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p));

    if (isSupabaseConfigured && supabase && isUUID(id)) {
      try {
        await supabase
          .from('pantry_items')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (e) {
        console.warn('Failed to update pantry_item in Supabase:', e);
      }
    }
  };

  const deletePantryItem = async (id: string): Promise<void> => {
    setPantryItems(prev => prev.filter(p => p.id !== id));

    if (isSupabaseConfigured && supabase && isUUID(id)) {
      try {
        await supabase.from('pantry_items').delete().eq('id', id);
      } catch (e) {
        console.warn('Failed to delete pantry_item from Supabase:', e);
      }
    }
  };

  const adjustPantryQuantity = async (id: string, delta: number): Promise<void> => {
    const item = pantryItems.find(p => p.id === id);
    if (!item) return;

    const newQty = Math.max(0, Number(item.current_quantity) + delta);
    await updatePantryItem(id, { current_quantity: newQty });
  };

  // Physical Storage Containers & Bulk Items Module CRUD
  const fetchStorageContainers = useCallback(async (): Promise<void> => {
    if (!isSupabaseConfigured || !supabase || !user?.id) return;
    try {
      const { data, error } = await supabase
        .from('storage_containers')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data) {
        setStorageContainers(data as StorageContainer[]);
      } else if (error) {
        throw error;
      }
    } catch (e) {
      console.warn('Failed to fetch storage containers:', e);
      throw e;
    }
  }, [user?.id]);

  const fetchContainerItems = useCallback(async (containerId?: string): Promise<void> => {
    if (!isSupabaseConfigured || !supabase || !user?.id) return;
    try {
      let query = supabase.from('container_items').select('*').order('created_at', { ascending: true });
      if (containerId) query = query.eq('container_id', containerId);
      const { data, error } = await query;
      if (!error && data) {
        if (containerId) {
          setContainerItems(prev => {
            const others = prev.filter(ci => ci.container_id !== containerId);
            return [...others, ...(data as ContainerItem[])];
          });
        } else {
          setContainerItems(data as ContainerItem[]);
        }
      } else if (error) {
        throw error;
      }
    } catch (e) {
      console.warn('Failed to fetch container items:', e);
      throw e;
    }
  }, [user?.id]);

  const createStorageContainer = async (
    containerData: Omit<StorageContainer, 'id' | 'created_at' | 'updated_at'>
  ): Promise<StorageContainer> => {
    const newContainer: StorageContainer = {
      ...containerData,
      id: 'container-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase && user?.id) {
      try {
        const payload = {
          user_id: user.id,
          name: containerData.name.trim(),
          container_type: containerData.container_type,
          ownership_scope: containerData.ownership_scope || 'private',
          household_id: containerData.ownership_scope === 'household' ? (containerData.household_id || household?.id || null) : null,
          location_id: containerData.location_id || null,
          parent_container_id: containerData.parent_container_id || null,
          color: containerData.color || null,
          notes: containerData.notes || null,
          qr_code: containerData.qr_code || null,
          photo_url: containerData.photo_url || null,
        };
        const { data, error } = await supabase
          .from('storage_containers')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('Failed to create storage_container in Supabase:', error);
          throw error;
        }
        if (data) {
          setStorageContainers(prev => [...prev, data as StorageContainer]);
          return data as StorageContainer;
        }
      } catch (e) {
        console.error('Error creating storage container in Supabase:', e);
        throw e;
      }
    }

    setStorageContainers(prev => [...prev, newContainer]);
    return newContainer;
  };

  const updateStorageContainer = async (id: string, updates: Partial<StorageContainer>): Promise<void> => {
    const previousContainers = storageContainers;
    setStorageContainers(prev => prev.map(c => c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c));

    if (isSupabaseConfigured && supabase && isUUID(id)) {
      try {
        const allowedUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (updates.name !== undefined) allowedUpdates.name = updates.name.trim();
        if (updates.container_type !== undefined) allowedUpdates.container_type = updates.container_type;
        if (updates.location_id !== undefined) allowedUpdates.location_id = updates.location_id || null;
        if (updates.parent_container_id !== undefined) allowedUpdates.parent_container_id = updates.parent_container_id || null;
        if (updates.notes !== undefined) allowedUpdates.notes = updates.notes ? updates.notes.trim() : null;
        if (updates.color !== undefined) allowedUpdates.color = updates.color || null;
        if (updates.photo_url !== undefined) allowedUpdates.photo_url = updates.photo_url || null;
        if (updates.qr_code !== undefined) allowedUpdates.qr_code = updates.qr_code || null;

        const { data, error } = await supabase
          .from('storage_containers')
          .update(allowedUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          setStorageContainers(previousContainers);
          throw error;
        }

        if (data) {
          setStorageContainers(prev => prev.map(c => c.id === id ? (data as StorageContainer) : c));
        }
      } catch (e) {
        setStorageContainers(previousContainers);
        console.error('Failed to update storage container in Supabase:', e);
        throw e;
      }
    }
  };

  const deleteStorageContainer = async (id: string): Promise<{ success: boolean; error?: string }> => {
    // Check if container has children or items locally first
    const hasChildContainers = storageContainers.some(c => c.parent_container_id === id);
    const hasAssignedItems = items.some(item => item.container_id === id);
    const hasBulkItems = containerItems.some(ci => ci.container_id === id);

    if (hasChildContainers) {
      return { success: false, error: language === 'hu' ? 'A tároló nem törölhető, mert belső altárolókat tartalmaz! Előbb ürítsd ki vagy töröld az altárolókat.' : 'Cannot delete container because it contains child containers!' };
    }
    if (hasAssignedItems) {
      return { success: false, error: language === 'hu' ? 'A tároló nem törölhető, mert tárgyak vannak hozzárendelve! Előbb helyezd át vagy vedd ki a tárgyakat.' : 'Cannot delete container because it contains items!' };
    }
    if (hasBulkItems) {
      return { success: false, error: language === 'hu' ? 'A tároló nem törölhető, mert készlettételeket tartalmaz! Előbb töröld vagy helyezd át a tételeket.' : 'Cannot delete container because it contains bulk items!' };
    }

    if (isSupabaseConfigured && supabase && isUUID(id)) {
      try {
        const { error } = await supabase.from('storage_containers').delete().eq('id', id);
        if (error) {
          return { success: false, error: error.message };
        }
      } catch (e: any) {
        return { success: false, error: e?.message || 'Törlési hiba' };
      }
    }

    setStorageContainers(prev => prev.filter(c => c.id !== id));
    return { success: true };
  };

  const addContainerItem = async (
    itemData: Omit<ContainerItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ContainerItem> => {
    const newItem: ContainerItem = {
      ...itemData,
      id: 'bulk-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase && user?.id) {
      try {
        const payload = {
          container_id: itemData.container_id,
          user_id: user.id,
          ownership_scope: itemData.ownership_scope || 'private',
          household_id: itemData.ownership_scope === 'household' ? (itemData.household_id || household?.id || null) : null,
          name: itemData.name.trim(),
          quantity: itemData.quantity >= 0 ? itemData.quantity : 0,
          unit: itemData.unit || 'db',
          min_quantity: itemData.min_quantity ?? null,
          notes: itemData.notes || null,
        };
        const { data, error } = await supabase
          .from('container_items')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setContainerItems(prev => [data as ContainerItem, ...prev]);
          return data as ContainerItem;
        }
      } catch (e) {
        console.error('Failed to create container_item in Supabase:', e);
        throw e;
      }
    }

    setContainerItems(prev => [newItem, ...prev]);
    return newItem;
  };

  const updateContainerItem = async (id: string, updates: Partial<ContainerItem>): Promise<void> => {
    setContainerItems(prev => prev.map(ci => ci.id === id ? { ...ci, ...updates, updated_at: new Date().toISOString() } : ci));

    if (isSupabaseConfigured && supabase && isUUID(id)) {
      try {
        const { error } = await supabase
          .from('container_items')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Failed to update container item in Supabase:', e);
        throw e;
      }
    }
  };

  const deleteContainerItem = async (id: string): Promise<void> => {
    setContainerItems(prev => prev.filter(ci => ci.id !== id));

    if (isSupabaseConfigured && supabase && isUUID(id)) {
      try {
        await supabase.from('container_items').delete().eq('id', id);
      } catch (e) {
        console.error('Failed to delete container item in Supabase:', e);
      }
    }
  };

  const adjustContainerItemQuantity = async (id: string, delta: number): Promise<number> => {
    let finalQty = 0;
    setContainerItems(prev => prev.map(ci => {
      if (ci.id === id) {
        finalQty = Math.max(0, Number(ci.quantity) + delta);
        return { ...ci, quantity: finalQty, updated_at: new Date().toISOString() };
      }
      return ci;
    }));

    if (isSupabaseConfigured && supabase && isUUID(id)) {
      try {
        const { data, error } = await supabase.rpc('adjust_container_item_quantity', {
          p_item_id: id,
          p_delta: delta
        });
        if (!error && typeof data === 'number') {
          finalQty = data;
          setContainerItems(prev => prev.map(ci => ci.id === id ? { ...ci, quantity: data } : ci));
        } else if (error) {
          await supabase.from('container_items').update({ quantity: finalQty, updated_at: new Date().toISOString() }).eq('id', id);
        }
      } catch (e) {
        console.warn('Failed RPC adjust_container_item_quantity, fallback applied:', e);
      }
    }

    return finalQty;
  };

  const assignItemToContainer = async (itemId: string, containerId: string | null): Promise<void> => {
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, container_id: containerId } : it));

    if (isSupabaseConfigured && supabase && isUUID(itemId)) {
      try {
        const { error } = await supabase
          .from('items')
          .update({ container_id: containerId, updated_at: new Date().toISOString() })
          .eq('id', itemId);
        if (error) {
          console.error('Failed to update item container_id in Supabase:', error);
          throw error;
        }
      } catch (e) {
        console.error('assignItemToContainer error:', e);
        throw e;
      }
    }
  };

  // Vault & Secure Storage Module CRUD & Crypto Logic
  const unlockVault = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    if (!vaultSettings) {
      return { success: false, error: language === 'hu' ? 'A széf nincs konfigurálva. Állíts be PIN kódot!' : 'The vault is not configured. Please set up a PIN!' };
    }

    const now = Date.now();
    if (vaultLockoutUntil > now) {
      const remainingSec = Math.ceil((vaultLockoutUntil - now) / 1000);
      return {
        success: false,
        error: language === 'hu'
          ? `Túl sok hibás próbálkozás! Kérjük, várj még ${remainingSec} másodpercet.`
          : `Too many failed attempts! Please wait ${remainingSec} seconds.`
      };
    }

    const isValid = await verifyPin(pin, vaultSettings.salt, vaultSettings.pin_hash);
    if (isValid) {
      setVaultFailedAttempts(0);
      setVaultLockoutUntil(0);
      setIsVaultUnlocked(true);
      sessionStorage.setItem('thingor_vault_unlocked', 'true');
      return { success: true };
    } else {
      const newAttempts = vaultFailedAttempts + 1;
      setVaultFailedAttempts(newAttempts);
      if (newAttempts >= 5) {
        const lockoutTime = now + 60 * 1000; // 60 seconds lockout
        setVaultLockoutUntil(lockoutTime);
        return {
          success: false,
          error: language === 'hu'
            ? 'Túl sok hibás próbálkozás! A széf 60 másodpercre zárolva.'
            : 'Too many failed attempts! Vault locked for 60 seconds.'
        };
      }
      const attemptsLeft = 5 - newAttempts;
      return {
        success: false,
        error: language === 'hu'
          ? `Helytelen PIN kód! (${attemptsLeft} próbálkozás maradt)`
          : `Incorrect PIN! (${attemptsLeft} attempts remaining)`
      };
    }
  };

  const lockVault = () => {
    setIsVaultUnlocked(false);
    sessionStorage.removeItem('thingor_vault_unlocked');
  };

  const setupVaultPin = async (pin: string): Promise<boolean> => {
    if (!pin || pin.length < 4) return false;
    const salt = generateSalt();
    const pin_hash = await hashPin(pin, salt);
    const newSettings: VaultSettings = {
      id: 'vault-' + Date.now(),
      user_id: user?.id || 'local-user',
      pin_hash,
      salt,
      auto_lock_minutes: 5,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase && user?.id) {
      try {
        const { data, error } = await supabase
          .from('vault_settings')
          .upsert({
            user_id: user.id,
            pin_hash,
            salt,
            auto_lock_minutes: 5,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
          .select()
          .single();

        if (!error && data) {
          setVaultSettings(data as VaultSettings);
          setIsVaultUnlocked(true);
          sessionStorage.setItem('thingor_vault_unlocked', 'true');
          return true;
        }
      } catch (e) {
        console.warn('Failed to upsert vault_settings in Supabase:', e);
      }
    }

    setVaultSettings(newSettings);
    setIsVaultUnlocked(true);
    sessionStorage.setItem('thingor_vault_unlocked', 'true');
    return true;
  };

  const changeVaultPin = async (oldPin: string, newPin: string): Promise<{ success: boolean; error?: string }> => {
    if (!vaultSettings) {
      return { success: false, error: 'A széf nincs konfigurálva.' };
    }
    const isOldValid = await verifyPin(oldPin, vaultSettings.salt, vaultSettings.pin_hash);
    if (!isOldValid) {
      return { success: false, error: 'A jelenlegi PIN kód helytelen.' };
    }
    if (!newPin || newPin.length < 4) {
      return { success: false, error: 'Az új PIN kódnak legalább 4 számjegyből kell állnia.' };
    }

    const salt = generateSalt();
    const pin_hash = await hashPin(newPin, salt);

    if (isSupabaseConfigured && supabase && user?.id) {
      try {
        const { data, error } = await supabase
          .from('vault_settings')
          .update({
            pin_hash,
            salt,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (!error && data) {
          setVaultSettings(data as VaultSettings);
          return { success: true };
        }
      } catch (e) {
        console.warn('Failed to update vault PIN in Supabase:', e);
      }
    }

    setVaultSettings(prev => prev ? { ...prev, pin_hash, salt, updated_at: new Date().toISOString() } : null);
    return { success: true };
  };

  const setItemVaultProtection = async (itemId: string, protectedStatus: boolean): Promise<void> => {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, is_vault_protected: protectedStatus } : item));

    if (isSupabaseConfigured && supabase && isUUID(itemId)) {
      try {
        await supabase
          .from('items')
          .update({ is_vault_protected: protectedStatus, updated_at: new Date().toISOString() })
          .eq('id', itemId);
      } catch (e) {
        console.warn('Failed to update item vault protection status in Supabase:', e);
      }
    }
    refreshItems();
  };

  const setDocumentVaultProtection = async (docId: string, protectedStatus: boolean): Promise<void> => {
    setDocuments(prev => prev.map(doc => doc.id === docId ? { ...doc, is_vault_protected: protectedStatus } : doc));

    if (isSupabaseConfigured && supabase && isUUID(docId)) {
      try {
        await supabase
          .from('item_documents')
          .update({ is_vault_protected: protectedStatus })
          .eq('id', docId);
      } catch (e) {
        console.warn('Failed to update document vault protection status in Supabase:', e);
      }
    }
  };

  // Helper to guarantee a valid UUID household record in Supabase
  const ensureValidHousehold = async (currentHh?: Household | null): Promise<Household | null> => {
    const targetHh = currentHh || household;
    if (!isSupabaseConfigured || !supabase || !user?.id) return targetHh;

    if (targetHh && isUUID(targetHh.id)) {
      return targetHh;
    }

    // 1. Check if user is already in a household in Supabase
    const { data: memberList } = await supabase
      .from('household_members')
      .select('*')
      .or(`user_id.eq.${user.id},user_email.ilike.${user.email}`);

    let realHh: Household | null = null;

    if (memberList && memberList.length > 0) {
      const { data: hhData } = await supabase
        .from('households')
        .select('*')
        .eq('id', memberList[0].household_id)
        .maybeSingle();

      if (hhData) {
        realHh = hhData as Household;
      }
    }

    // 2. If no household row exists in Supabase, create one
    if (!realHh) {
      const hhName = targetHh?.name || `${user.display_name || 'Családi'} Háztartása`;
      const { data: createdHh, error: hhErr } = await supabase
        .from('households')
        .insert([{ name: hhName, owner_id: user.id, created_by: user.id }])
        .select()
        .single();

      if (!hhErr && createdHh) {
        realHh = createdHh as Household;
        await supabase.from('household_members').insert([{
          household_id: realHh.id,
          user_id: user.id,
          user_email: user.email,
          user_name: user.display_name || user.email,
          role: 'owner'
        }]);
      }
    }

    if (realHh && isUUID(realHh.id)) {
      setHousehold(realHh);

      // Backfill user items in Supabase to link with real household ID
      await supabase
        .from('items')
        .update({ household_id: realHh.id })
        .eq('user_id', user.id)
        .eq('ownership_scope', 'household');

      return realHh;
    }

    return targetHh;
  };

  // CRUD Household & Family Sharing
  const createHousehold = async (name: string): Promise<Household> => {
    const newHh: Household = {
      id: 'hh-' + Date.now(),
      name,
      owner_id: user?.id || 'guest',
      created_at: new Date().toISOString(),
    };

    const newMember: HouseholdMember = {
      id: 'hm-' + Date.now(),
      household_id: newHh.id,
      user_id: user?.id || 'guest',
      user_email: user?.email || '',
      user_name: user?.display_name || user?.email || 'Tulajdonos',
      role: 'owner',
      sharing_mode: 'all',
      allowed_modules: DEFAULT_HOUSEHOLD_MODULES,
      joined_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase && user?.id) {
      // First check if user is already a member of an existing household in Supabase
      const { data: existingMembers } = await supabase
        .from('household_members')
        .select('*')
        .or(`user_id.eq.${user.id},user_email.ilike.${user.email}`);

      if (existingMembers && existingMembers.length > 0) {
        const { data: existingHh } = await supabase
          .from('households')
          .select('*')
          .eq('id', existingMembers[0].household_id)
          .maybeSingle();

        if (existingHh) {
          setHousehold(existingHh as Household);
          const { data: allMembers } = await supabase.from('household_members').select('*').eq('household_id', existingHh.id);
          if (allMembers) setHouseholdMembers(allMembers as HouseholdMember[]);
          return existingHh as Household;
        }
      }

      const { data: hhData, error: hhErr } = await supabase.from('households').insert([{ name, owner_id: user.id, created_by: user.id }]).select().single();
      if (!hhErr && hhData) {
        const { data: mData } = await supabase.from('household_members').insert([{
          household_id: hhData.id,
          user_id: user.id,
          user_email: user.email,
          user_name: user.display_name,
          role: 'owner',
          sharing_mode: 'all',
          allowed_modules: DEFAULT_HOUSEHOLD_MODULES
        }]).select().single();

        setHousehold(hhData as Household);
        if (mData) setHouseholdMembers([mData as HouseholdMember]);
        return hhData as Household;
      }
    }

    setHousehold(newHh);
    setHouseholdMembers([newMember]);
    return newHh;
  };

  const inviteHouseholdMember = async (
    email: string,
    title?: string,
    role: HouseholdRole = 'member'
  ): Promise<{ success: boolean; invite?: HouseholdInvite; isRegistered?: boolean; message?: string; error?: string }> => {
    if (!household) return { success: false, error: language === 'hu' ? 'Nincs aktív háztartás' : 'No active household' };
    const cleanEmail = email.trim().toLowerCase();
    const cleanTitle = title?.trim() || '';

    if (user?.email && cleanEmail === user.email.toLowerCase()) {
      return { success: false, error: language === 'hu' ? 'Saját magadat nem hívhatod meg!' : 'You cannot invite yourself!' };
    }

    const existingInvite = householdInvites.find(i => (i.invited_email?.toLowerCase() === cleanEmail || i.email?.toLowerCase() === cleanEmail) && i.status === 'pending');
    if (existingInvite) {
      return { success: false, error: language === 'hu' ? 'Ennek az e-mail címnek már küldtél függőben lévő meghívót!' : 'A pending invite already exists for this email address!' };
    }

    const existingMember = householdMembers.find(m => m.user_email?.toLowerCase() === cleanEmail);
    if (existingMember) {
      return { success: false, error: language === 'hu' ? 'Ez a felhasználó már a háztartás tagja!' : 'This user is already a household member!' };
    }

    // Ensure we have a valid Supabase UUID for household.id if Supabase is active
    let activeHousehold = household;
    if (isSupabaseConfigured && supabase && user?.id && (!activeHousehold.id || !isUUID(activeHousehold.id))) {
      const { data: realHh, error: realHhErr } = await supabase
        .from('households')
        .insert([{ name: activeHousehold.name, owner_id: user.id, created_by: user.id }])
        .select()
        .single();

      if (!realHhErr && realHh) {
        const { data: mData } = await supabase
          .from('household_members')
          .insert([{
            household_id: realHh.id,
            user_id: user.id,
            user_email: user.email,
            user_name: user.display_name,
            role: 'owner'
          }])
          .select()
          .single();

        activeHousehold = realHh as Household;
        setHousehold(activeHousehold);
        if (mData) {
          setHouseholdMembers(prev => [mData as HouseholdMember, ...prev.filter(m => m.user_id !== user.id)]);
        }
      } else if (realHhErr) {
        console.error('Failed to create real household in Supabase:', realHhErr);
        return {
          success: false,
          error: language === 'hu'
            ? `Szerver oldali háztartási hiba: ${realHhErr.message}`
            : realHhErr.message
        };
      }
    }

    // Check if the invited email belongs to a registered user
    let isRegisteredUser = false;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: regProfile } = await supabase
          .from('profiles')
          .select('id, email')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (regProfile) {
          isRegisteredUser = true;
        }
      } catch (e) {}
    } else {
      const savedRegs = localStorage.getItem('thingor_registered_users');
      const registeredUsers: Array<{ email: string }> = savedRegs ? JSON.parse(savedRegs) : [];
      if (registeredUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
        isRegisteredUser = true;
      }
    }

    const expiresAtDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const generatedToken = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : ('inv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10));

    const newInvite: HouseholdInvite = {
      id: 'inv-' + Date.now(),
      household_id: activeHousehold.id,
      invited_email: cleanEmail,
      title: cleanTitle,
      role,
      invited_by: user?.id || 'guest',
      token: generatedToken,
      status: 'pending',
      expires_at: expiresAtDate,
      created_at: new Date().toISOString(),
      household_name: activeHousehold.name
    };

    let createdInvite: HouseholdInvite = newInvite;

    if (isSupabaseConfigured && supabase && user?.id && isUUID(activeHousehold.id)) {
      // 1. First attempt insert with title and expires_at columns
      let { data, error } = await supabase.from('household_invites').insert([{
        household_id: activeHousehold.id,
        invited_email: cleanEmail,
        title: cleanTitle || null,
        role,
        invited_by: user.id,
        token: newInvite.token,
        status: 'pending',
        expires_at: expiresAtDate
      }]).select().single();

      // 2. Fallback if 'title' column missing in Supabase schema cache
      if (error && error.message && error.message.includes('title')) {
        console.warn("Schema cache warning: 'title' column missing on household_invites. Fallback insert without title column...");
        const retry = await supabase.from('household_invites').insert([{
          household_id: activeHousehold.id,
          invited_email: cleanEmail,
          role,
          invited_by: user.id,
          token: newInvite.token,
          status: 'pending',
          expires_at: expiresAtDate
        }]).select().single();

        if (retry.error) {
          return { success: false, error: retry.error.message };
        }
        data = retry.data;
      } else if (error) {
        return { success: false, error: error.message };
      }

      createdInvite = { ...data, title: cleanTitle || data?.title, household_name: activeHousehold.name } as HouseholdInvite;
    }

    setHouseholdInvites(prev => [...prev, createdInvite]);

    const statusMsg = isRegisteredUser
      ? (language === 'hu'
          ? `A(z) ${cleanEmail} e-mail cím regisztrált felhasználó a Thingorban! A meghívás megjelent a fiókjában (felugró ablakban azonnal elfogadhatja).`
          : `User ${cleanEmail} is registered! Invite delivered to their in-app modal window.`)
      : (language === 'hu'
          ? `Meghívás sikeresen rögzítve a(z) ${cleanEmail} címre (14 napig érvényes). Amint a meghívott regisztrál ezzel az e-mail címmel, azonnal csatlakozhat a háztartáshoz!`
          : `Invite created for ${cleanEmail} (valid for 14 days). Once registered with this email, they will be prompted to join!`);

    return {
      success: true,
      invite: createdInvite,
      isRegistered: isRegisteredUser,
      message: statusMsg
    };
  };

  const acceptHouseholdInvite = async (inviteIdOrToken: string): Promise<{ success: boolean; error?: string }> => {
    const invite = [...householdInvites, ...receivedInvites].find(
      i => (i.id === inviteIdOrToken || i.token === inviteIdOrToken) && i.status === 'pending'
    );
    if (!invite) return { success: false, error: language === 'hu' ? 'Érvénytelen vagy nem található meghívó' : 'Invalid or missing invite' };

    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return { success: false, error: language === 'hu' ? 'Ez a meghívó már lejárt' : 'This invite has expired' };
    }

    if (isSupabaseConfigured && supabase && user?.id) {
      const memberUserName = invite.title ? `${user.display_name || user.email} (${invite.title})` : (user.display_name || user.email);
      let { error: mErr } = await supabase.from('household_members').insert([{
        household_id: invite.household_id,
        user_id: user.id,
        user_email: user.email,
        user_name: memberUserName,
        title: invite.title || null,
        role: invite.role,
        sharing_mode: 'all',
        allowed_modules: DEFAULT_HOUSEHOLD_MODULES,
      }]).select().single();

      if (mErr && mErr.message && mErr.message.includes('title')) {
        const retry = await supabase.from('household_members').insert([{
          household_id: invite.household_id,
          user_id: user.id,
          user_email: user.email,
          user_name: memberUserName,
          role: invite.role,
          sharing_mode: 'all',
          allowed_modules: DEFAULT_HOUSEHOLD_MODULES,
        }]).select().single();
        mErr = retry.error;
      }

      if (mErr && !mErr.message.includes('duplicate')) {
        return { success: false, error: mErr.message };
      }

      await supabase.from('household_invites').update({ status: 'accepted' }).eq('id', invite.id);

      const { data: hh } = await supabase.from('households').select('*').eq('id', invite.household_id).single();
      if (hh) setHousehold(hh as Household);

      const { data: allMembers } = await supabase.from('household_members').select('*').eq('household_id', invite.household_id);
      if (allMembers) setHouseholdMembers(allMembers as HouseholdMember[]);

      // Re-fetch locations & items for newly joined household member
      const { data: freshLocations } = await supabase.from('locations').select('*');
      if (freshLocations) setLocations(freshLocations as LocationItem[]);

      const { data: freshItems } = await supabase.from('items').select('*').order('created_at', { ascending: false });
      if (freshItems) setItems(freshItems as Item[]);

      setHouseholdInvites(prev => prev.map(i => i.id === invite.id ? { ...i, status: 'accepted' } : i));
      setReceivedInvites(prev => prev.filter(i => i.id !== invite.id));
      return { success: true };
    }

    // Offline / Demo mode fallback
    const memberName = invite.title ? `${user?.display_name || user?.email || 'Családtag'} (${invite.title})` : (user?.display_name || user?.email || 'Családtag');
    const newMember: HouseholdMember = {
      id: 'hm-' + Date.now(),
      household_id: invite.household_id,
      user_id: user?.id || 'guest',
      user_email: user?.email || '',
      user_name: memberName,
      title: invite.title,
      role: invite.role,
      sharing_mode: 'all',
      allowed_modules: DEFAULT_HOUSEHOLD_MODULES,
      joined_at: new Date().toISOString(),
    };

    setHouseholdMembers(prev => [...prev, newMember]);
    setHouseholdInvites(prev => prev.map(i => i.id === invite.id ? { ...i, status: 'accepted' } : i));
    setReceivedInvites(prev => prev.filter(i => i.id !== invite.id));

    if (!household) {
      setHousehold({
        id: invite.household_id,
        name: invite.household_name || 'Családi Háztartás',
        created_by: invite.invited_by,
        created_at: new Date().toISOString()
      });
    }

    return { success: true };
  };

  const declineHouseholdInvite = async (inviteIdOrToken: string): Promise<{ success: boolean; error?: string }> => {
    const invite = [...householdInvites, ...receivedInvites].find(
      i => (i.id === inviteIdOrToken || i.token === inviteIdOrToken) && i.status === 'pending'
    );
    if (!invite) return { success: false };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('household_invites').update({ status: 'declined' }).eq('id', invite.id);
    }

    setHouseholdInvites(prev => prev.map(i => i.id === invite.id ? { ...i, status: 'declined' } : i));
    setReceivedInvites(prev => prev.filter(i => i.id !== invite.id));
    return { success: true };
  };

  const cancelHouseholdInvite = async (inviteId: string): Promise<void> => {
    setHouseholdInvites(prev => prev.filter(i => i.id !== inviteId));
    if (isSupabaseConfigured && supabase && isUUID(inviteId)) {
      await supabase.from('household_invites').delete().eq('id', inviteId);
    }
  };

  const removeHouseholdMember = async (memberId: string): Promise<void> => {
    setHouseholdMembers(prev => prev.filter(m => m.id !== memberId));
    if (isSupabaseConfigured && supabase && isUUID(memberId)) {
      await supabase.from('household_members').delete().eq('id', memberId);
    }
  };

  const updateHouseholdMember = async (memberId: string, updates: Partial<HouseholdMember>): Promise<void> => {
    setHouseholdMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...updates } : m));
    if (isSupabaseConfigured && supabase && isUUID(memberId)) {
      let { error } = await supabase.from('household_members').update(updates).eq('id', memberId);
      if (error && error.message && error.message.includes('title') && updates.title !== undefined) {
        const { title, ...fallbackUpdates } = updates;
        await supabase.from('household_members').update(fallbackUpdates).eq('id', memberId);
      }
    }
  };

  const updateMemberAllowedLocations = async (memberId: string, allowedLocationIds: string[] | null): Promise<void> => {
    setHouseholdMembers(prev => prev.map(m => m.id === memberId ? { ...m, allowed_location_ids: allowedLocationIds } : m));
    if (isSupabaseConfigured && supabase && isUUID(memberId)) {
      await supabase.from('household_members').update({ allowed_location_ids: allowedLocationIds }).eq('id', memberId);
      const { data: locData } = await supabase.from('locations').select('*');
      if (locData) setLocations(locData as LocationItem[]);
      const { data: itemData } = await supabase.from('items').select('*').order('created_at', { ascending: false });
      if (itemData) setItems(itemData as Item[]);
    }
  };

  const updateMemberAllowedCategories = async (memberId: string, allowedCategoryIds: string[] | null): Promise<void> => {
    setHouseholdMembers(prev => prev.map(m => m.id === memberId ? { ...m, allowed_category_ids: allowedCategoryIds } : m));
    if (isSupabaseConfigured && supabase && isUUID(memberId)) {
      await supabase.from('household_members').update({ allowed_category_ids: allowedCategoryIds }).eq('id', memberId);
      const { data: catData } = await supabase.from('categories').select('*');
      if (catData) setCategories(catData as Category[]);
      const { data: itemData } = await supabase.from('items').select('*').order('created_at', { ascending: false });
      if (itemData) setItems(itemData as Item[]);
    }
  };

  const updateMemberRole = async (memberId: string, role: HouseholdRole): Promise<void> => {
    setHouseholdMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
    if (isSupabaseConfigured && supabase && isUUID(memberId)) {
      await supabase.from('household_members').update({ role }).eq('id', memberId);
    }
  };

  const leaveHousehold = async (): Promise<void> => {
    if (!household || !user?.id) return;
    setHouseholdMembers(prev => prev.filter(m => m.user_id !== user.id));
    setHousehold(null);
    if (isSupabaseConfigured && supabase && isUUID(household.id)) {
      await supabase.from('household_members').delete().eq('user_id', user.id).eq('household_id', household.id);
    }
  };

  const updateHouseholdSharedLocations = async (locationIds: string[]): Promise<void> => {
    let activeHh = household;
    if (activeHh && !isUUID(activeHh.id)) {
      const validHh = await ensureValidHousehold(activeHh);
      if (validHh) activeHh = validHh;
    }
    if (!activeHh) return;

    setHousehold(prev => prev ? { ...prev, id: activeHh.id, shared_location_ids: locationIds } : null);
    if (isSupabaseConfigured && supabase && isUUID(activeHh.id)) {
      await supabase.from('households').update({ shared_location_ids: locationIds }).eq('id', activeHh.id);
      const { data: locData } = await supabase.from('locations').select('*');
      if (locData) setLocations(locData as LocationItem[]);
      const { data: itemData } = await supabase.from('items').select('*').order('created_at', { ascending: false });
      if (itemData) setItems(itemData as Item[]);
    }
  };

  const updateHouseholdSharedCategories = async (categoryIds: string[]): Promise<void> => {
    let activeHh = household;
    if (activeHh && !isUUID(activeHh.id)) {
      const validHh = await ensureValidHousehold(activeHh);
      if (validHh) activeHh = validHh;
    }
    if (!activeHh) return;

    setHousehold(prev => prev ? { ...prev, id: activeHh.id, shared_category_ids: categoryIds } : null);
    if (isSupabaseConfigured && supabase && isUUID(activeHh.id)) {
      await supabase.from('households').update({ shared_category_ids: categoryIds }).eq('id', activeHh.id);
      const { data: catData } = await supabase.from('categories').select('*');
      if (catData) setCategories(catData as Category[]);
      const { data: itemData } = await supabase.from('items').select('*').order('created_at', { ascending: false });
      if (itemData) setItems(itemData as Item[]);
    }
  };

  const updateHouseholdName = async (newName: string): Promise<boolean> => {
    if (!household || !user?.id || !newName.trim()) return false;
    const trimmed = newName.trim();
    setHousehold(prev => prev ? { ...prev, name: trimmed } : null);
    if (isSupabaseConfigured && supabase && isUUID(household.id)) {
      const { error } = await supabase.from('households').update({ name: trimmed }).eq('id', household.id);
      if (error) {
        console.error('Failed to update household name in Supabase:', error);
        return false;
      }
    }
    return true;
  };

  const isHouseholdModuleAllowed = useCallback((moduleKey: keyof HouseholdMemberAllowedModules): boolean => {
    // In personal / offline mode without household, everything is allowed
    if (!household || !user) return true;
    // Household owner always has full access to all household modules
    if (household.owner_id === user.id) return true;
    const currentMember = householdMembers.find(m => m.user_id === user.id);
    if (!currentMember) return true;
    if (currentMember.role === 'owner') return true;
    // When sharing_mode is 'all' (or not explicitly 'custom'), full module access is granted
    if (!currentMember.sharing_mode || currentMember.sharing_mode === 'all') return true;
    // In custom mode, consult allowed_modules
    if (currentMember.allowed_modules && currentMember.allowed_modules[moduleKey] !== undefined) {
      return Boolean(currentMember.allowed_modules[moduleKey]);
    }
    return true;
  }, [household, user, householdMembers]);

  // CRUD Item Relations
  const addItemRelation = async (sourceItemId: string, targetItemId: string, relationType: ItemRelationType): Promise<ItemRelation> => {
    const newRel: ItemRelation = {
      id: 'rel-' + Date.now(),
      source_item_id: sourceItemId,
      target_item_id: targetItemId,
      relation_type: relationType,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('item_relations').insert([{
        source_item_id: sourceItemId,
        target_item_id: targetItemId,
        relation_type: relationType
      }]).select().single();

      if (!error && data) {
        setItemRelations(prev => [...prev, data as ItemRelation]);
        return data as ItemRelation;
      }
    }

    setItemRelations(prev => [...prev, newRel]);
    return newRel;
  };

  const deleteItemRelation = async (relationId: string): Promise<void> => {
    setItemRelations(prev => prev.filter(r => r.id !== relationId));
    if (isSupabaseConfigured && supabase && isUUID(relationId)) {
      await supabase.from('item_relations').delete().eq('id', relationId);
    }
  };

  const getItemRelations = (itemId: string): ItemRelation[] => {
    return itemRelations.filter(r => r.source_item_id === itemId || r.target_item_id === itemId);
  };

  // CRUD Quick Notes
  const addQuickNote = async (noteData: Omit<QuickNote, 'id' | 'created_at'>): Promise<QuickNote> => {
    const newNote: QuickNote = {
      ...noteData,
      id: 'note-' + Date.now(),
      user_id: user?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase && user?.id) {
      const { data, error } = await supabase.from('quick_notes').insert([{
        ...noteData,
        user_id: user.id
      }]).select().single();

      if (!error && data) {
        setQuickNotes(prev => [data as QuickNote, ...prev]);
        return data as QuickNote;
      }
    }

    setQuickNotes(prev => [newNote, ...prev]);
    return newNote;
  };

  const updateQuickNote = async (id: string, updates: Partial<QuickNote>): Promise<void> => {
    const updatedAt = new Date().toISOString();
    setQuickNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updated_at: updatedAt } : n));

    if (isSupabaseConfigured && supabase && isUUID(id)) {
      await supabase.from('quick_notes').update({ ...updates, updated_at: updatedAt }).eq('id', id);
    }
  };

  const deleteQuickNote = async (id: string): Promise<void> => {
    setQuickNotes(prev => prev.filter(n => n.id !== id));
    if (isSupabaseConfigured && supabase && isUUID(id)) {
      await supabase.from('quick_notes').delete().eq('id', id);
    }
  };

  const convertNoteToItem = async (noteId: string): Promise<Item | null> => {
    const note = quickNotes.find(n => n.id === noteId);
    if (!note) return null;

    // Smart location matching based on note.location_hint
    let matchedLocationId = locations[0]?.id || null;
    if (note.location_hint && note.location_hint.trim()) {
      const hint = note.location_hint.trim().toLowerCase();
      const exactLoc = locations.find(l => l.name.trim().toLowerCase() === hint);
      if (exactLoc) {
        matchedLocationId = exactLoc.id;
      }
    }

    const defaultCategoryId = categories[0]?.id || null;

    // Create full item pre-filled from note
    const createdItem = await addItem({
      name: note.title.trim(),
      description: `${note.content}\n\n[Átalakítva jegyzetből] ${note.location_hint ? `Hely: ${note.location_hint}` : ''}`.trim(),
      category_id: matchedLocationId ? (defaultCategoryId || undefined) : undefined,
      location_id: matchedLocationId || undefined,
      condition: 'Good',
      status: 'Working',
      ownership_scope: 'private',
    });

    // Enforce strict validation: ONLY mark converted if a real database UUID was produced!
    if (!createdItem || !createdItem.id || !isUUID(createdItem.id)) {
      console.error('convertNoteToItem: Item creation failed to return a valid UUID:', createdItem);
      throw new Error(language === 'hu' ? 'Nem sikerült elmenteni a tárgyat az adatbázisban.' : 'Failed to persist item to the database.');
    }

    // Mark note as converted with verified item UUID
    await updateQuickNote(noteId, {
      is_converted: true,
      converted_item_id: createdItem.id,
    });

    return createdItem;
  };

  // Admin Audit Log logger
  const logAdminAction = async (action: string, target?: string, details?: any) => {
    if (!user || !isAdmin(user)) return;
    const newLog: AdminAuditLog = {
      id: 'log-' + Date.now(),
      admin_id: user.id,
      admin_email: user.email,
      action,
      target,
      details,
      created_at: new Date().toISOString(),
    };
    setAdminAuditLogs(prev => [newLog, ...prev]);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('admin_audit_logs').insert([{
        admin_id: user.id,
        action,
        target,
        details,
      }]);
    }
  };

  // Legal Documents Versioning State & Methods
  const [activeLegalSlug, setActiveLegalSlug] = useState<LegalSlug>('privacy');
  const [legalDocumentVersions, setLegalDocumentVersions] = useState<LegalDocumentVersion[]>([
    {
      id: 'leg-1',
      document_slug: 'privacy',
      version: 1,
      title: 'Adatvédelmi Tájékoztató (v1.0)',
      content: 'A Thingor elkötelezett a felhasználók személyes adatainak védelme mellett. Az Ön által megadott adatokat bizalmasan kezeljük, és harmadik félnek nem adjuk át.',
      status: 'published',
      created_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    },
    {
      id: 'leg-2',
      document_slug: 'terms',
      version: 1,
      title: 'Felhasználási Feltételek (v1.0)',
      content: 'A Thingor szolgáltatás használatával Ön elfogadja a jelen felhasználási feltételeket. A platform személyes tárgyak nyomon követésére szolgál.',
      status: 'published',
      created_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    },
    {
      id: 'leg-3',
      document_slug: 'cookies',
      version: 1,
      title: 'Cookie Tájékoztató (v1.0)',
      content: 'A Thingor kizárólag a működéshez elengedhetetlen munkamenet sütiket (session cookies) használja.',
      status: 'published',
      created_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    },
    {
      id: 'leg-4',
      document_slug: 'imprint',
      version: 1,
      title: 'Impresszum (v1.0)',
      content: 'Thingor Personal Inventory Platform. Elérhetőség: info@thingor.com',
      status: 'published',
      created_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    }
  ]);

  const fetchLegalDocumentVersions = async (slug: LegalSlug): Promise<LegalDocumentVersion[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('legal_document_versions')
        .select('*')
        .eq('document_slug', slug)
        .order('version', { ascending: false });
      if (data && data.length > 0) {
        setLegalDocumentVersions(prev => {
          const filtered = prev.filter(v => v.document_slug !== slug);
          return [...data as LegalDocumentVersion[], ...filtered];
        });
        return data as LegalDocumentVersion[];
      }
    }
    return legalDocumentVersions.filter(v => v.document_slug === slug);
  };

  const saveLegalDocumentVersion = async (
    slug: LegalSlug,
    title: string,
    content: string,
    publish: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user || !isAdmin(user)) {
      return { success: false, error: 'Access Denied: Only administrators can modify legal documents' };
    }

    const currentVersions = legalDocumentVersions.filter(v => v.document_slug === slug);
    const maxVer = currentVersions.reduce((max, v) => Math.max(max, v.version), 0);
    const newVersionNum = maxVer + 1;
    const now = new Date().toISOString();

    const newDocVer: LegalDocumentVersion = {
      id: 'ver-' + Date.now(),
      document_slug: slug,
      version: newVersionNum,
      title: title || `${slug.toUpperCase()} (v${newVersionNum}.0)`,
      content,
      status: publish ? 'published' : 'draft',
      created_by: user.id,
      created_at: now,
      published_at: publish ? now : null,
    };

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('legal_document_versions')
        .insert([{
          document_slug: slug,
          version: newVersionNum,
          title: newDocVer.title,
          content,
          status: newDocVer.status,
          created_by: user.id,
          published_at: newDocVer.published_at,
        }]);

      if (error) return { success: false, error: error.message };
    }

    setLegalDocumentVersions(prev => [newDocVer, ...prev]);
    await logAdminAction(publish ? 'LEGAL_DOCUMENT_PUBLISHED' : 'LEGAL_DOCUMENT_DRAFT_SAVED', `slug=${slug}, version=${newVersionNum}`);
    return { success: true };
  };

  const getPublishedLegalDoc = async (slug: LegalSlug): Promise<LegalDocumentVersion | null> => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('legal_document_versions')
        .select('*')
        .eq('document_slug', slug)
        .eq('status', 'published')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) return data as LegalDocumentVersion;
    }
    const match = legalDocumentVersions
      .filter(v => v.document_slug === slug && v.status === 'published')
      .sort((a, b) => b.version - a.version)[0];
    return match || null;
  };

  // Content & Landing Page Management State & Methods
  const [landingBlocks, setLandingBlocks] = useState<LandingBlock[]>([
    { id: 'blk-hero', section_key: 'hero', title: 'Személyes tárgynyilvántartó platform', subtitle: 'Rendszerezd az összes tárgyadat', description: 'Tartsd nyilván a tulajdonodban lévő tárgyakat, hol vannak, mennyit érnek és mi tartozik hozzájuk.', button_text: 'Kezdés most', button_url: '#', is_enabled: true, display_order: 1 },
    { id: 'blk-categories', section_key: 'categories', title: 'Minden tárgyad egy helyen', subtitle: 'Sokoldalú leltár', description: 'Legyen szó a műhelyben lévő szerszámokról, az íróasztalon lévő elektronikáról vagy a raktárban tárolt berendezésekről.', button_text: '', button_url: '', is_enabled: true, display_order: 2 },
    { id: 'blk-locations', section_key: 'locations', title: 'Tudd, hol van', subtitle: 'Helyszín fa struktúra', description: 'Soha többé ne pazarolj időt fiókok vagy dobozok keresgélésére.', button_text: '', button_url: '', is_enabled: true, display_order: 3 },
  ]);

  const [faqsList, setFaqsList] = useState<FAQItem[]>([
    { id: 'faq-1', question: 'Mi az a Thingor?', answer: 'A Thingor egy személyes tárgynyilvántartó és leltározó platform, amellyel rendszerezheted, dokumentálhatod és nyomon követheted az értékeidet.', display_order: 1, is_published: true },
    { id: 'faq-2', question: 'Biztonságban vannak az adataim?', answer: 'Igen! Minden adatod privát és titkosított, a csatolt dokumentumok és képek pedig védett Cloudflare R2 tárolóban helyezkednek el.', display_order: 2, is_published: true },
    { id: 'faq-3', question: 'Hogyan működik a tárgymegosztás?', answer: 'Egyedi, biztonságos megosztási hivatkozást hozhatsz létre tárgyaidhoz, amin beállíthatod, hogy mennyi ideig érvényes és milyen részletek láthatók.', display_order: 3, is_published: true },
  ]);

  const fetchLandingBlocks = async (): Promise<LandingBlock[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('site_contents').select('*').order('display_order', { ascending: true });
      if (data && data.length > 0) {
        setLandingBlocks(data as LandingBlock[]);
        return data as LandingBlock[];
      }
    }
    return landingBlocks;
  };

  const saveLandingBlock = async (block: LandingBlock): Promise<{ success: boolean; error?: string }> => {
    if (!user || !isAdmin(user)) return { success: false, error: 'Access Denied' };
    setLandingBlocks(prev => prev.map(b => b.id === block.id ? block : b));
    if (isSupabaseConfigured && supabase) {
      await supabase.from('site_contents').upsert(block);
    }
    await logAdminAction('CONTENT_UPDATED', `block_id=${block.id}`);
    return { success: true };
  };

  const fetchFAQs = async (): Promise<FAQItem[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('faqs').select('*').order('display_order', { ascending: true });
      if (data) {
        setFaqsList(data as FAQItem[]);
        return data as FAQItem[];
      }
    }
    return faqsList;
  };

  const saveFAQ = async (faq: Partial<FAQItem>): Promise<{ success: boolean; error?: string }> => {
    if (!user || !isAdmin(user)) return { success: false, error: 'Access Denied' };
    const id = faq.id || 'faq-' + Date.now();
    const updatedFaq: FAQItem = {
      id,
      question: faq.question || '',
      answer: faq.answer || '',
      display_order: faq.display_order ?? faqsList.length + 1,
      is_published: faq.is_published ?? true,
    };
    setFaqsList(prev => {
      const exists = prev.some(f => f.id === id);
      return exists ? prev.map(f => f.id === id ? updatedFaq : f) : [...prev, updatedFaq];
    });
    if (isSupabaseConfigured && supabase) {
      await supabase.from('faqs').upsert([updatedFaq]);
    }
    await logAdminAction('FAQ_UPDATED', `faq_id=${id}`);
    return { success: true };
  };

  const deleteFAQ = async (faqId: string): Promise<boolean> => {
    if (!user || !isAdmin(user)) return false;
    setFaqsList(prev => prev.filter(f => f.id !== faqId));
    if (isSupabaseConfigured && supabase && isUUID(faqId)) {
      await supabase.from('faqs').delete().eq('id', faqId);
    }
    await logAdminAction('FAQ_DELETED', `faq_id=${faqId}`);
    return true;
  };

  // Fetch User Detail Stats for Admin
  const fetchUserDetailStats = async (targetUserId: string): Promise<UserDetailStats | null> => {
    if (!user || !isAdmin(user)) return null;

    const targetUser = usersList.find(u => u.user_id === targetUserId || u.id === targetUserId);
    if (!targetUser) return null;

    let itemCount = items.filter(i => i.user_id === targetUserId).length;
    let locationCount = locations.filter(l => l.user_id === targetUserId).length;
    let categoryCount = categories.filter(c => c.user_id === targetUserId).length;
    let documentCount = documents.filter(d => d.user_id === targetUserId).length;
    let totalValue = items.filter(i => i.user_id === targetUserId).reduce((sum, i) => sum + (i.current_value || i.purchase_price || 0), 0);
    let storageFilesCount = itemCount + documentCount;

    if (isSupabaseConfigured && supabase && isUUID(targetUserId)) {
      try {
        const [itemsRes, locsRes, docsRes] = await Promise.all([
          supabase.from('items').select('current_value, purchase_price', { count: 'exact' }).eq('user_id', targetUserId),
          supabase.from('locations').select('id', { count: 'exact' }).eq('user_id', targetUserId),
          supabase.from('item_documents').select('id', { count: 'exact' }).eq('user_id', targetUserId),
        ]);

        itemCount = itemsRes.count || itemCount;
        locationCount = locsRes.count || locationCount;
        documentCount = docsRes.count || documentCount;

        if (itemsRes.data) {
          totalValue = itemsRes.data.reduce((acc, row) => acc + (Number(row.current_value) || Number(row.purchase_price) || 0), 0);
        }
        storageFilesCount = itemCount + documentCount;
      } catch (e) {
        console.warn('Failed to fetch user detail stats from Supabase:', e);
      }
    }

    return {
      user_id: targetUserId,
      email: targetUser.email,
      display_name: targetUser.display_name,
      role: targetUser.role || 'user',
      status: targetUser.status || 'active',
      created_at: targetUser.created_at,
      item_count: itemCount,
      location_count: locationCount,
      category_count: categoryCount,
      document_count: documentCount,
      total_value: totalValue,
      storage_files_count: storageFilesCount,
    };
  };

  // Delete User Account by Admin (Full Cascade Cleanup)
  const deleteUserAccountByAdmin = async (targetUserId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user || !isAdmin(user)) return { success: false, error: 'Access Denied: Only admins can delete user accounts' };

    if (isSupabaseConfigured && supabase && isUUID(targetUserId)) {
      try {
        await supabase.from('item_documents').delete().eq('user_id', targetUserId);
        await supabase.from('items').delete().eq('user_id', targetUserId);
        await supabase.from('locations').delete().eq('user_id', targetUserId);
        await supabase.from('categories').delete().eq('user_id', targetUserId).eq('is_custom', true);
        await supabase.from('profiles').update({ status: 'deleted' }).eq('user_id', targetUserId);
      } catch (e: any) {
        return { success: false, error: e.message || 'Failed to delete user account' };
      }
    }

    setUsersList(prev => prev.filter(u => u.user_id !== targetUserId && u.id !== targetUserId));
    await logAdminAction('USER_DELETED_BY_ADMIN', `target_user_id=${targetUserId}`);
    return { success: true };
  };

  // Toggle Registration
  const toggleRegistration = async (enabled: boolean) => {
    setIsRegistrationSuspended(!enabled);
    const updated = { ...siteSettings, registration_enabled: enabled };
    setSiteSettings(updated);
    localStorage.setItem('thingor_site_settings', JSON.stringify(updated));

    if (isSupabaseConfigured && supabase) {
      await supabase.from('site_settings').upsert({
        id: 'default',
        registration_enabled: enabled,
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      });
    }
    await logAdminAction('toggle_registration', `registration_enabled=${enabled}`);
  };

  // Toggle Maintenance Mode
  const toggleMaintenance = async (enabled: boolean) => {
    const updated = { ...siteSettings, maintenance_mode: enabled };
    setSiteSettings(updated);
    localStorage.setItem('thingor_site_settings', JSON.stringify(updated));

    if (isSupabaseConfigured && supabase) {
      await supabase.from('site_settings').upsert({
        id: 'default',
        maintenance_mode: enabled,
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      });
    }
    await logAdminAction('toggle_maintenance', `maintenance_mode=${enabled}`);
  };

  // Update Site Settings
  const updateSiteSettings = async (updates: Partial<SiteSettings>): Promise<{ success: boolean; error?: string }> => {
    const updated = { ...siteSettings, ...updates };
    setSiteSettings(updated);
    localStorage.setItem('thingor_site_settings', JSON.stringify(updated));

    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, any> = {
          id: 'default',
          ...updates,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        };
        const { error } = await supabase.from('site_settings').upsert(payload);
        if (error) {
          console.warn('Supabase site_settings upsert error:', error.message);
          // If upsert with partial keys fails, try full updated record
          const fullRecord = {
            id: 'default',
            site_name: updated.site_name,
            site_description: updated.site_description || '',
            hero_title: updated.hero_title,
            hero_subtitle: updated.hero_subtitle,
            announcement: updated.announcement,
            registration_enabled: updated.registration_enabled,
            maintenance_mode: updated.maintenance_mode,
            maintenance_message: updated.maintenance_message,
            logo_url: updated.logo_url,
            favicon_url: updated.favicon_url,
            primary_color: updated.primary_color,
            contact_email: updated.contact_email,
            support_email: updated.support_email,
            registration_paused_title: updated.registration_paused_title,
            registration_paused_message: updated.registration_paused_message,
            notifications_enabled: updated.notifications_enabled ?? true,
            email_notifications_enabled: updated.email_notifications_enabled ?? true,
            updated_at: new Date().toISOString(),
            updated_by: user?.id
          };
          const fallbackRes = await supabase.from('site_settings').upsert(fullRecord);
          if (fallbackRes.error) {
            console.error('Supabase site_settings fallback error:', fallbackRes.error.message);
            return { success: false, error: fallbackRes.error.message };
          }
        }
      } catch (err: any) {
        console.error('Supabase site_settings exception:', err);
        return { success: false, error: err?.message || 'Hiba történt a mentés során.' };
      }
    }
    await logAdminAction('update_site_settings', undefined, updates);
    return { success: true };
  };

  // Create Item Share Link
  const createItemShare = async (
    itemId: string,
    purpose: SharePurpose,
    expirationDays: number | null,
    permissions: SharePermissions
  ): Promise<ItemShare | null> => {
    if (!user?.id) return null;

    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    let expiresAt: string | null = null;
    if (expirationDays && expirationDays > 0) {
      const exp = new Date();
      exp.setDate(exp.getDate() + expirationDays);
      expiresAt = exp.toISOString();
    }

    const newShare: ItemShare = {
      id: 'share-' + Date.now(),
      item_id: itemId,
      created_by: user.id,
      token,
      purpose,
      expires_at: expiresAt,
      revoked_at: null,
      permissions,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase && isUUID(itemId)) {
      const { data, error } = await supabase
        .from('item_shares')
        .insert([{
          item_id: itemId,
          created_by: user.id,
          token,
          purpose,
          expires_at: expiresAt,
          permissions,
        }])
        .select()
        .single();

      if (!error && data) {
        const created = data as ItemShare;
        setItemShares(prev => [created, ...prev]);
        return created;
      }
    }

    setItemShares(prev => [newShare, ...prev]);
    return newShare;
  };

  // Revoke Item Share Link
  const revokeItemShare = async (shareId: string): Promise<boolean> => {
    const revokedAt = new Date().toISOString();
    if (isSupabaseConfigured && supabase && isUUID(shareId)) {
      await supabase
        .from('item_shares')
        .update({ revoked_at: revokedAt })
        .eq('id', shareId)
        .eq('created_by', user?.id);
    }

    setItemShares(prev => prev.map(s => s.id === shareId ? { ...s, revoked_at: revokedAt } : s));
    return true;
  };

  // Get Active Item Shares
  const getItemShares = async (itemId: string): Promise<ItemShare[]> => {
    if (isSupabaseConfigured && supabase && isUUID(itemId)) {
      const { data } = await supabase
        .from('item_shares')
        .select('*')
        .eq('item_id', itemId)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });
      if (data) return data as ItemShare[];
    }
    return itemShares.filter(s => s.item_id === itemId && !s.revoked_at);
  };

  // Get Shared Item by Cryptographic Token for Guest View
  const getSharedItemByToken = async (token: string): Promise<{ success: boolean; data?: SharedItemViewData; error?: string }> => {
    if (!token) return { success: false, error: 'Hiányzó megosztási token' };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('get_shared_item', { share_token: token });
        if (!error && data) {
          return { success: true, data: data as SharedItemViewData };
        }
      } catch (e) {
        // Fallback silently if RPC function is missing on Supabase
      }

      // Manual fallback query
      try {
        const { data: shareData } = await supabase
          .from('item_shares')
          .select('*, items(*)')
          .eq('token', token)
          .is('revoked_at', null)
          .maybeSingle();

        if (shareData) {
          if (shareData.expires_at && new Date(shareData.expires_at).getTime() < Date.now()) {
            return { success: false, error: 'Ez a megosztási link lejárt.' };
          }

          let item = shareData.items;

          // If items join returned null due to RLS, fetch item directly or check local items
          if (!item && shareData.item_id) {
            const { data: directItem } = await supabase
              .from('items')
              .select('*')
              .eq('id', shareData.item_id)
              .maybeSingle();
            item = directItem;
          }

          if (!item && shareData.item_id) {
            item = items.find(i => i.id === shareData.item_id) || null;
          }

          if (item) {
            const perms: SharePermissions = shareData.permissions || {};
            const sharedPayload: SharedItemViewData = {
              share_id: shareData.id,
              purpose: shareData.purpose,
              expires_at: shareData.expires_at,
              permissions: perms,
              created_at: shareData.created_at,
              item_id: item.id,
              name: item.name,
              description: item.description,
              condition: item.condition,
              photo_url: item.photo_url,
              additional_photos: perms.include_additional_images ? item.additional_photos : undefined,
              purchase_date: perms.include_purchase_date ? item.purchase_date : undefined,
              warranty_start: perms.include_warranty ? item.warranty_start : undefined,
              warranty_end: perms.include_warranty ? item.warranty_end : undefined,
              current_value: perms.include_value ? item.current_value : undefined,
              purchase_price: perms.include_purchase_price ? item.purchase_price : undefined,
            };
            return { success: true, data: sharedPayload };
          }
        }
      } catch (err) {
        console.warn('Fallback query error:', err);
      }
    }

    // Local state fallback
    const localShare = itemShares.find(s => s.token === token && !s.revoked_at);
    if (localShare) {
      if (localShare.expires_at && new Date(localShare.expires_at).getTime() < Date.now()) {
        return { success: false, error: 'Ez a megosztási link lejárt.' };
      }
      const targetItem = items.find(i => i.id === localShare.item_id);
      if (targetItem) {
        const perms = localShare.permissions || {};
        const payload: SharedItemViewData = {
          share_id: localShare.id,
          purpose: localShare.purpose,
          expires_at: localShare.expires_at,
          permissions: perms,
          created_at: localShare.created_at,
          item_id: targetItem.id,
          name: targetItem.name,
          description: targetItem.description,
          condition: targetItem.condition,
          photo_url: targetItem.photo_url,
          additional_photos: perms.include_additional_images ? targetItem.additional_photos : undefined,
          purchase_date: perms.include_purchase_date ? targetItem.purchase_date : undefined,
          warranty_start: perms.include_warranty ? targetItem.warranty_start : undefined,
          warranty_end: perms.include_warranty ? targetItem.warranty_end : undefined,
          current_value: perms.include_value ? targetItem.current_value : undefined,
          purchase_price: perms.include_purchase_price ? targetItem.purchase_price : undefined,
        };
        return { success: true, data: payload };
      }
    }

    return { success: false, error: 'Ez a megosztási link már nem érhető el.' };
  };

  // Fetch Users List for Admin
  const fetchUsersList = async (): Promise<UserProfile[]> => {
    if (!user || !isAdmin(user)) return [];
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (data) {
        const mapped = data.map((p: any) => ({
          id: p.id || p.user_id,
          user_id: p.user_id,
          display_name: p.display_name || p.email?.split('@')[0] || 'User',
          email: p.email || '',
          role: (p.role === 'admin' ? 'admin' : 'user') as UserRole,
          status: (p.status as UserStatus) || 'active',
          is_admin: p.role === 'admin',
          created_at: p.created_at,
        }));
        setUsersList(mapped);
        return mapped;
      }
    }
    return usersList;
  };

  // Toggle User Suspension for Admin
  const toggleUserSuspension = async (targetUserId: string, targetStatus: UserStatus): Promise<boolean> => {
    if (!user || !isAdmin(user)) return false;
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({ status: targetStatus })
        .eq('user_id', targetUserId);
      if (error) return false;
    }
    setUsersList(prev => prev.map(u => (u.user_id === targetUserId || u.id === targetUserId) ? { ...u, status: targetStatus } : u));
    await logAdminAction(targetStatus === 'suspended' ? 'USER_SUSPENDED' : 'USER_REACTIVATED', `user_id=${targetUserId}`);
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,

        user,
        isAuthenticated: !!user,
        isAdmin: isAdmin(user),
        isRegistrationSuspended,
        setIsRegistrationSuspended,
        login,
        signup,
        resetPassword,
        updatePassword,
        deleteAccount,
        logout,

        currentView,
        setCurrentView: handleSetCurrentView,
        goBack,
        registerModalCloseHandler,
        showExitToast,
        selectedItemId,
        setSelectedItemId: handleSetSelectedItemId,

        isAddEditItemModalOpen,
        setIsAddEditItemModalOpen,
        editingItem,
        setEditingItem,

        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,

        isLocationModalOpen,
        setIsLocationModalOpen,

        isCategoryModalOpen,
        setIsCategoryModalOpen,

        isSupabaseInfoOpen,
        setIsSupabaseInfoOpen,

        filters,
        setFilters,
        resetFilters,

        items,
        itemsVersion,
        refreshItems,
        dashboardMetrics,
        refreshDashboardMetrics,
        userPreferences,
        updateUserPreferences,
        categories,
        locations,
        documents,

        addItem,
        updateItem,
        deleteItem,
        addCategory,
        addLocation,
        deleteLocation,
        addDocument,
        deleteDocument,

        repairs,
        addRepair,
        updateRepairStatus,
        deleteRepair,

        financings,
        saveFinancing,
        recordInstallmentPayment,
        deleteFinancing,

        loans,
        addLoan,
        updateLoan,
        returnLoan,
        deleteLoan,
        lendingContacts,
        addLendingContact,
        updateLendingContact,
        deleteLendingContact,

        collections,
        collectionItems,
        addCollection,
        updateCollection,
        deleteCollection,
        addItemToCollection,
        removeItemFromCollection,
        deleteCollectionItem,
        updateCollectionItem,
        getCollectionItems,

        pantryItems,
        addPantryItem,
        updatePantryItem,
        deletePantryItem,
        adjustPantryQuantity,

        vaultSettings,
        isVaultUnlocked,
        unlockVault,
        lockVault,
        setupVaultPin,
        changeVaultPin,
        setItemVaultProtection,
        setDocumentVaultProtection,

        household,
        householdMembers,
        householdInvites,
        receivedInvites,
        createHousehold,
        inviteHouseholdMember,
        acceptHouseholdInvite,
        declineHouseholdInvite,
        cancelHouseholdInvite,
        removeHouseholdMember,
        updateHouseholdMember,
        updateMemberAllowedLocations,
        updateMemberAllowedCategories,
        updateMemberRole,
        leaveHousehold,
        updateHouseholdSharedLocations,
        updateHouseholdSharedCategories,
        updateHouseholdName,
        isHouseholdModuleAllowed,

        itemRelations,
        addItemRelation,
        deleteItemRelation,
        getItemRelations,

        quickNotes,
        addQuickNote,
        updateQuickNote,
        deleteQuickNote,
        convertNoteToItem,

        notifications,
        unreadNotificationCount: notifications.filter(n => !n.is_read).length,
        userNotificationSettings,
        isNotificationModalOpen,
        setIsNotificationModalOpen,
        isQRScannerOpen,
        setIsQRScannerOpen,
        fetchNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        updateNotificationSettings,
        createNotification,

        getLocationPath,
        getCategoryName,

        siteSettings,
        updateSiteSettings,
        toggleRegistration,
        toggleMaintenance,

        activeLegalSlug,
        setActiveLegalSlug,
        legalDocumentVersions,
        fetchLegalDocumentVersions,
        saveLegalDocumentVersion,
        getPublishedLegalDoc,

        landingBlocks,
        fetchLandingBlocks,
        saveLandingBlock,
        faqsList,
        fetchFAQs,
        saveFAQ,
        deleteFAQ,

        itemShares,
        createItemShare,
        revokeItemShare,
        getItemShares,
        getSharedItemByToken,
        activeShareToken,
        setActiveShareToken,
        sharedItemData,
        setSharedItemData,

        usersList,
        fetchUsersList,
        fetchUserDetailStats,
        toggleUserSuspension,
        deleteUserAccountByAdmin,
        adminAuditLogs,
        logAdminAction,

        storageContainers,
        containerItems,
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

export const useModalBack = (isOpen: boolean, onClose: () => void, modalId?: string) => {
  const { registerModalCloseHandler } = useApp();
  useEffect(() => {
    if (!isOpen) return;
    const id = modalId || `modal-${Math.random().toString(36).slice(2, 9)}`;
    return registerModalCloseHandler(id, onClose);
  }, [isOpen, onClose, modalId, registerModalCloseHandler]);
};

