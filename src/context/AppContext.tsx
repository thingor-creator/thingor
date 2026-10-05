import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
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
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { translations, type Language, type TranslationKeys } from '../i18n/translations';
import { isAdmin, isSuspended } from '../lib/permissions';

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
    const saved = localStorage.getItem('thingor_items');
    if (saved) {
      try {
        const parsed: Item[] = JSON.parse(saved);
        return parsed.filter(i => !i.id.startsWith('item-1') && !i.id.startsWith('item-2') && !i.id.startsWith('item-3') && !i.id.startsWith('item-4') && !i.id.startsWith('item-5') && !i.id.startsWith('item-6'));
      } catch (e) {}
    }
    return [];
  });

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
        return parsed.filter(l => !l.id.startsWith('loc-'));
      } catch (e) {}
    }
    return [];
  });

  const [documents, setDocuments] = useState<ItemDocument[]>(() => {
    const saved = localStorage.getItem('thingor_documents');
    if (saved) {
      try {
        const parsed: ItemDocument[] = JSON.parse(saved);
        return parsed.filter(d => !d.id.startsWith('doc-'));
      } catch (e) {}
    }
    return [];
  });

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

  const isAnyModalOpen = Boolean(
    selectedItemId ||
    isAddEditItemModalOpen ||
    isLocationModalOpen ||
    isCategoryModalOpen ||
    isAuthModalOpen ||
    isSupabaseInfoOpen
  );

  // Push history entry when any modal opens so device Back button closes modal first instead of exiting PWA
  useEffect(() => {
    if (isAnyModalOpen && !prevModalRef.current) {
      window.history.pushState({ view: currentView, isModal: true }, '');
    } else if (!isAnyModalOpen && prevModalRef.current) {
      if (!isPoppingRef.current && window.history.state && window.history.state.isModal) {
        window.history.back();
      }
    }
    prevModalRef.current = isAnyModalOpen;
  }, [isAnyModalOpen, currentView]);

  // Handle popstate (Device Back Button / Browser Back Arrow / PWA Swipe Back)
  useEffect(() => {
    if (!window.history.state || !window.history.state.view) {
      window.history.replaceState({ view: currentView, isModal: false }, '');
    }

    const handlePopState = (e: PopStateEvent) => {
      isPoppingRef.current = true;
      setTimeout(() => {
        isPoppingRef.current = false;
      }, 100);

      // 1. Close open modals first
      if (selectedItemId) {
        setSelectedItemId(null);
        return;
      }
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
      if (isSupabaseInfoOpen) {
        setIsSupabaseInfoOpen(false);
        return;
      }

      // 2. Change view if history state contains a view
      if (e.state && e.state.view) {
        setCurrentView(e.state.view);
      } else {
        const savedUser = localStorage.getItem('thingor_user');
        if (savedUser && currentView !== 'dashboard' && currentView !== 'landing') {
          setCurrentView('dashboard');
        }
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
    isSupabaseInfoOpen
  ]);

  // Custom view changer that pushes history entries when navigating views
  const handleSetCurrentView = (view: ViewMode) => {
    if (view !== currentView) {
      setSelectedItemId(null);
      setIsAddEditItemModalOpen(false);
      setIsLocationModalOpen(false);
      setIsCategoryModalOpen(false);
      setIsAuthModalOpen(false);
      setIsSupabaseInfoOpen(false);

      window.history.pushState({ view, isModal: false }, '');
      setCurrentView(view);
    }
  };

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('thingor_current_view', currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem('thingor_items', JSON.stringify(items));
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
        .select('role, status, display_name')
        .eq('user_id', userId)
        .maybeSingle();

      const role: UserRole = profileData?.role === 'admin' ? 'admin' : 'user';
      const status: UserStatus = (profileData?.status as UserStatus) || 'active';
      const displayName = profileData?.display_name || fallbackDisplayName;

      return {
        id: userId,
        user_id: userId,
        display_name: displayName,
        email: cleanEmail,
        role,
        status,
        is_admin: role === 'admin',
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

  // Update browser tab favicon dynamically when favicon_url changes
  useEffect(() => {
    if (siteSettings.favicon_url) {
      const favicons = document.querySelectorAll("link[rel*='icon']");
      favicons.forEach(el => {
        (el as HTMLLinkElement).href = siteSettings.favicon_url!;
      });
    }
  }, [siteSettings.favicon_url]);

  // Handle Supabase Auth state if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
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
      } else {
        setUser(null);
        localStorage.removeItem('thingor_user');
      }
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
      } else if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setItems([]);
        setDocuments([]);
        setLocations([]);
        localStorage.removeItem('thingor_user');
        localStorage.removeItem('thingor_items');
        localStorage.removeItem('thingor_documents');
        localStorage.removeItem('thingor_locations');
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

    // Controlled LocalStorage One-Time Migration to Supabase Cloud (M16)
    const migrationKey = `thingor_migrated_${user.id}`;
    const hasMigrated = localStorage.getItem(migrationKey) === 'true';

    async function runControlledMigration() {
      if (hasMigrated || !supabase || !user?.id) return;

      try {
        const savedItems = localStorage.getItem('thingor_items');
        if (savedItems) {
          const parsed: Item[] = JSON.parse(savedItems);
          const itemsToInsert = parsed
            .filter(i => !i.id.startsWith('item-'))
            .map(i => ({
              name: i.name,
              description: i.description,
              photo_url: i.photo_url,
              purchase_date: i.purchase_date,
              purchase_price: i.purchase_price,
              current_value: i.current_value,
              store_seller: i.store_seller,
              condition: i.condition,
              warranty_start: i.warranty_start,
              warranty_end: i.warranty_end,
              notes: i.notes,
              user_id: user.id,
              category_id: isUUID(i.category_id) ? i.category_id : null,
              location_id: isUUID(i.location_id) ? i.location_id : null,
            }));

          if (itemsToInsert.length > 0) {
            await supabase.from('items').insert(itemsToInsert);
          }
        }
      } catch (e) {
        console.error('Migration error:', e);
      } finally {
        localStorage.setItem(migrationKey, 'true');
      }
    }

    runControlledMigration();

    // Load categories
    supabase
      .from('categories')
      .select('*')
      .then(({ data, error }) => {
        if (!error && data && data.length > 0 && isMounted) {
          setCategories(data as Category[]);
        }
      });

    // Load user locations
    supabase
      .from('locations')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setLocations(data as LocationItem[]);
        }
      });

    // Load user items (M8)
    supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setItems(data as Item[]);
        }
      });

    // Load user item documents (M9)
    supabase
      .from('item_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && isMounted) {
          setDocuments(data as ItemDocument[]);
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
    localStorage.removeItem('thingor_items');
    localStorage.removeItem('thingor_documents');
    localStorage.removeItem('thingor_locations');

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: pass });

      if (error) return { success: false, error: formatAuthError(error.message) };

      if (data.user) {
        setUser({
          id: data.user.id,
          user_id: data.user.id,
          display_name: data.user.user_metadata?.display_name || (cleanEmail === 'mythingor@gmail.com' ? 'Admin (Thingor)' : cleanEmail.split('@')[0]),
          email: cleanEmail,
          is_admin: Boolean(data.user.user_metadata?.is_admin) || cleanEmail === 'mythingor@gmail.com',
        });
      }
      setIsAuthModalOpen(false);
      return { success: true };
    }

    const savedRegs = localStorage.getItem('thingor_registered_users');
    const registeredUsers: Array<{ email: string; pass: string; name: string; id: string }> = savedRegs ? JSON.parse(savedRegs) : [];
    const matched = registeredUsers.find(u => u.email.toLowerCase() === cleanEmail && u.pass === pass);

    if (!matched) {
      return {
        success: false,
        error: language === 'hu'
          ? 'Hibás e-mail cím vagy jelszó. Csak regisztrált fiókkal lehet belépni.'
          : 'Invalid credentials. Only registered users can log in.'
      };
    }

    setUser({
      id: matched.id,
      user_id: matched.id,
      display_name: matched.name,
      email: matched.email,
      is_admin: matched.email.toLowerCase() === 'mythingor@gmail.com',
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
    localStorage.removeItem('thingor_items');
    localStorage.removeItem('thingor_documents');
    localStorage.removeItem('thingor_locations');

    const currentIsAdmin = !!user && (user.email?.toLowerCase() === 'mythingor@gmail.com' || !!user.is_admin);
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
        setUser({
          id: data.user.id,
          user_id: data.user.id,
          display_name: name || data.user.user_metadata?.display_name || cleanEmail.split('@')[0],
          email: cleanEmail
        });
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
      email: newUser.email
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
    localStorage.removeItem('thingor_user');
    localStorage.removeItem('thingor_items');
    localStorage.removeItem('thingor_documents');
    localStorage.removeItem('thingor_locations');
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

    if (isSupabaseConfigured && supabase && user?.id) {
      const payload = {
        ...itemData,
        user_id: user.id,
        category_id: safeCategoryId,
        location_id: safeLocationId,
      };

      const { data, error } = await supabase
        .from('items')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        setItems(prev => [data as Item, ...prev]);
        return data as Item;
      }
    }

    const newItem: Item = {
      ...itemData,
      id: 'item-' + Date.now(),
      user_id: user?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setItems(prev => [newItem, ...prev]);
    return newItem;
  };

  const updateItem = async (id: string, updates: Partial<Item>): Promise<void> => {
    if (isSupabaseConfigured && supabase && user?.id && isUUID(id)) {
      const cleanUpdates: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };
      if ('category_id' in cleanUpdates && !isUUID(cleanUpdates.category_id)) {
        cleanUpdates.category_id = null;
      }
      if ('location_id' in cleanUpdates && !isUUID(cleanUpdates.location_id)) {
        cleanUpdates.location_id = null;
      }
      delete cleanUpdates.id;
      delete cleanUpdates.created_at;

      await supabase
        .from('items')
        .update(cleanUpdates)
        .eq('id', id)
        .eq('user_id', user.id);
    }

    setItems(prev => prev.map(item => item.id === id ? {
      ...item,
      ...updates,
      updated_at: new Date().toISOString()
    } : item));
  };

  const deleteItem = async (id: string): Promise<void> => {
    if (isSupabaseConfigured && supabase && user?.id && isUUID(id)) {
      await supabase.from('items').delete().eq('id', id).eq('user_id', user.id);
    }

    setItems(prev => prev.filter(item => item.id !== id));
    setDocuments(prev => prev.filter(doc => doc.item_id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
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
    if (isSupabaseConfigured && supabase && user?.id && isUUID(docId)) {
      await supabase.from('item_documents').delete().eq('id', docId).eq('user_id', user.id);
    }
    setDocuments(prev => prev.filter(d => d.id !== docId));
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
        const { error } = await supabase.from('site_settings').upsert({
          id: 'default',
          ...updates,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        });
        if (error) {
          console.warn('Supabase site_settings upsert error:', error.message);
          // If schema cache error occurs, try upserting base columns as fallback
          const baseUpdates = {
            id: 'default',
            site_name: updated.site_name,
            hero_title: updated.hero_title,
            hero_subtitle: updated.hero_subtitle,
            announcement: updated.announcement,
            registration_enabled: updated.registration_enabled,
            maintenance_mode: updated.maintenance_mode,
            maintenance_message: updated.maintenance_message,
            updated_at: new Date().toISOString(),
            updated_by: user?.id
          };
          await supabase.from('site_settings').upsert(baseUpdates);
        }
      } catch (err) {
        console.warn('Supabase site_settings fallback:', err);
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
        console.warn('RPC get_shared_item fallback:', e);
      }

      // Manual fallback query
      const { data: shareData } = await supabase
        .from('item_shares')
        .select('*, items(*)')
        .eq('token', token)
        .is('revoked_at', null)
        .maybeSingle();

      if (shareData && shareData.items) {
        const item = shareData.items;
        const perms: SharePermissions = shareData.permissions || {};
        if (shareData.expires_at && new Date(shareData.expires_at).getTime() < Date.now()) {
          return { success: false, error: 'Ez a megosztási link lejárt.' };
        }

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
        selectedItemId,
        setSelectedItemId,

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
