import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type {
  Item,
  Category,
  LocationItem,
  ItemDocument,
  UserProfile,
  ViewMode,
  FilterState,
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { translations, type Language, type TranslationKeys } from '../i18n/translations';

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

export const DEFAULT_LOCATIONS: LocationItem[] = [
  { id: 'loc-1', name: 'Otthon', parent_id: null },
  { id: 'loc-2', name: 'Garázs', parent_id: 'loc-1' },
  { id: 'loc-3', name: 'Műhely', parent_id: 'loc-2' },
  { id: 'loc-4', name: 'Szerszámos szekrény', parent_id: 'loc-3' },
  { id: 'loc-5', name: 'Konyha', parent_id: 'loc-1' },
  { id: 'loc-6', name: '3. fiók', parent_id: 'loc-5' },
  { id: 'loc-7', name: 'Dolgozó szoba', parent_id: 'loc-1' },
  { id: 'loc-8', name: 'Íróasztal', parent_id: 'loc-7' },
  { id: 'loc-9', name: 'Hálószoba', parent_id: 'loc-1' },
  { id: 'loc-10', name: 'Éjjeliszekrény', parent_id: 'loc-9' },
];

export const DEFAULT_ITEMS: Item[] = [
  {
    id: 'item-1',
    name: 'Makita DHP486',
    description: '18V LXT Akkus ütvefúró-csavarbehajtó kefe nélküli motorral.',
    category_id: 'cat-2',
    location_id: 'loc-4',
    photo_url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80',
    additional_photos: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
    ],
    purchase_date: '2024-03-15',
    purchase_price: 180,
    current_value: 180,
    store_seller: 'Makita Hivatalos Műszaki Áruház',
    condition: 'Good',
    warranty_start: '2024-03-15',
    warranty_end: '2028-03-12',
    notes: 'Tartalmaz 2x 5.0Ah akkumulátort és DC18RC gyorstöltőt Mbox kofferben.',
    created_at: '2024-03-15T10:00:00Z',
  },
  {
    id: 'item-2',
    name: 'Apple MacBook Pro 16" M3 Max',
    description: 'Asztrofekete, 36GB Egyesített memória, 1TB SSD. Elsődleges munkaállomás.',
    category_id: 'cat-1',
    location_id: 'loc-8',
    photo_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
    purchase_date: '2024-01-10',
    purchase_price: 3499,
    current_value: 3200,
    store_seller: 'Apple Store Central',
    condition: 'Excellent',
    warranty_start: '2024-01-10',
    warranty_end: '2026-11-15',
    notes: 'AppleCare+ aktív 2027 januárig. Sorozatszám: C02FX089Q05N',
    created_at: '2024-01-10T14:30:00Z',
  },
  {
    id: 'item-3',
    name: 'Trek FX 3 Disc Fitness Kerékpár',
    description: 'Matte Dnister Black könnyű alumínium váz hidraulikus tárcsafékekkel.',
    category_id: 'cat-6',
    location_id: 'loc-2',
    photo_url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
    purchase_date: '2023-06-20',
    purchase_price: 980,
    current_value: 750,
    store_seller: 'Trek Kerékpár Szaküzlet',
    condition: 'Good',
    warranty_start: '2023-06-20',
    warranty_end: '2026-10-25',
    notes: 'Szervizelve 2024 áprilisában. Új lánc és hátsó fogaskoszorú.',
    created_at: '2023-06-20T09:15:00Z',
  },
  {
    id: 'item-4',
    name: 'Sony WH-1000XM5 Vezeték Nélküli Fejhallgató',
    description: 'Zajszűrős fejhallgató 8 mikrofonnal és Auto NC Optimizer funkcióval.',
    category_id: 'cat-1',
    location_id: 'loc-10',
    photo_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    purchase_date: '2023-11-25',
    purchase_price: 380,
    current_value: 290,
    store_seller: 'Elektronikai Műszaki Áruház',
    condition: 'Good',
    warranty_start: '2023-11-25',
    warranty_end: '2025-11-25',
    notes: 'Fekete kiadás. Audio kábellel és kemény védőtokkal.',
    created_at: '2023-11-25T16:45:00Z',
  },
  {
    id: 'item-5',
    name: 'DeWalt DWE7492 Asztali Körfűrész 250mm',
    description: 'Professzionális asztali fűrész fogaskerekes párhuzamvezetővel, 2000W motor.',
    category_id: 'cat-2',
    location_id: 'loc-3',
    photo_url: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=800&q=80',
    purchase_date: '2022-09-05',
    purchase_price: 720,
    current_value: 580,
    store_seller: 'Szerszám és Barkács Szaküzlet',
    condition: 'Fair',
    warranty_start: '2022-09-05',
    warranty_end: '2025-09-05',
    notes: 'Fűrészlap cserélve 2024 januárban Freud 60T finomvágó lapra.',
    created_at: '2022-09-05T11:20:00Z',
  },
  {
    id: 'item-6',
    name: 'Kärcher K5 Premium Smart Control',
    description: '145 bar magasnyomású mosó Bluetooth kapcsolattal és tömlődobbal.',
    category_id: 'cat-4',
    location_id: 'loc-2',
    photo_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    purchase_date: '2024-04-10',
    purchase_price: 420,
    current_value: 390,
    store_seller: 'Kert és Otthon Áruház',
    condition: 'New',
    warranty_start: '2024-04-10',
    warranty_end: '2029-04-10',
    notes: '5 év gyári kiterjesztött garancia online regisztrálva.',
    created_at: '2024-04-10T08:30:00Z',
  }
];

export const DEFAULT_DOCUMENTS: ItemDocument[] = [
  {
    id: 'doc-1',
    item_id: 'item-1',
    file_name: 'Szamla_Makita_DHP486.pdf',
    file_url: '#',
    document_type: 'Invoice',
    created_at: '2024-03-15T10:00:00Z',
    size_bytes: 420000,
  },
  {
    id: 'doc-2',
    item_id: 'item-1',
    file_name: 'Garanciajegy_Makita.pdf',
    file_url: '#',
    document_type: 'Warranty',
    created_at: '2024-03-15T10:05:00Z',
    size_bytes: 180000,
  },
  {
    id: 'doc-3',
    item_id: 'item-1',
    file_name: 'Hasznalati_Utmutato_DHP486.pdf',
    file_url: '#',
    document_type: 'Manual',
    created_at: '2024-03-15T10:06:00Z',
    size_bytes: 2500000,
  },
  {
    id: 'doc-4',
    item_id: 'item-2',
    file_name: 'Apple_Szamla_MacBook.pdf',
    file_url: '#',
    document_type: 'Invoice',
    created_at: '2024-01-10T14:30:00Z',
    size_bytes: 310000,
  }
];

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
    return saved ? JSON.parse(saved) : DEFAULT_ITEMS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('thingor_categories');
    // If saved categories are older English defaults, force DEFAULT_CATEGORIES in Hungarian
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.some((c: Category) => c.name === 'Electronics' || c.name === 'Tools')) {
        return DEFAULT_CATEGORIES;
      }
      return parsed;
    }
    return DEFAULT_CATEGORIES;
  });

  const [locations, setLocations] = useState<LocationItem[]>(() => {
    const saved = localStorage.getItem('thingor_locations');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.some((l: LocationItem) => l.name.includes('Home') || l.name.includes('Garage'))) {
        return DEFAULT_LOCATIONS;
      }
      return parsed;
    }
    return DEFAULT_LOCATIONS;
  });

  const [documents, setDocuments] = useState<ItemDocument[]>(() => {
    const saved = localStorage.getItem('thingor_documents');
    return saved ? JSON.parse(saved) : DEFAULT_DOCUMENTS;
  });

  // UI state
  const [currentView, setCurrentView] = useState<ViewMode>('landing');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isAddEditItemModalOpen, setIsAddEditItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSupabaseInfoOpen, setIsSupabaseInfoOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  // Sync to LocalStorage
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

  // Handle Supabase Auth state if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          user_id: session.user.id,
          display_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || ''
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthModalMode('update_password');
        setIsAuthModalOpen(true);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthModalOpen(false);
      }

      if (session?.user) {
        setUser({
          id: session.user.id,
          user_id: session.user.id,
          display_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || ''
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

    // Check if logging in as Admin via provided credentials
    const isAdminAccount = cleanEmail === 'mythingor@gmail.com' && pass === 'PocoPoco83';

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: pass });
      
      // If admin credentials supplied locally but Supabase auth fails (e.g. unconfirmed or not in Supabase yet), fall back to local admin session
      if (error && isAdminAccount) {
        setUser({
          id: 'admin-1',
          user_id: 'admin-1',
          display_name: 'Admin (Thingor)',
          email: 'mythingor@gmail.com',
          is_admin: true,
        });
        setIsAuthModalOpen(false);
        return { success: true };
      }

      if (error) return { success: false, error: formatAuthError(error.message) };

      if (data.user) {
        setUser({
          id: data.user.id,
          user_id: data.user.id,
          display_name: data.user.user_metadata?.display_name || (cleanEmail === 'mythingor@gmail.com' ? 'Admin (Thingor)' : cleanEmail.split('@')[0]),
          email: cleanEmail,
          is_admin: cleanEmail === 'mythingor@gmail.com',
        });
      }
      setIsAuthModalOpen(false);
      return { success: true };
    }

    // Local Storage Offline Fallback Auth
    if (isAdminAccount) {
      setUser({
        id: 'admin-1',
        user_id: 'admin-1',
        display_name: 'Admin (Thingor)',
        email: 'mythingor@gmail.com',
        is_admin: true,
      });
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

  const signup = async (email: string, pass: string, name: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // Check if new registration is suspended by Admin (except if logged in as Admin creating users)
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
      const redirectUrl = window.location.origin;
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
        // Email confirmation is required by Supabase auth policy
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

    // Local Storage Offline Fallback Signup
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
      const redirectUrl = window.location.origin;
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

  const logout = () => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(console.error);
    }
    setUser(null);
    setIsAuthModalOpen(false);
    setCurrentView('landing');
  };

  const resetFilters = () => setFilters(INITIAL_FILTERS);

  // Helper location path builder
  const getLocationPath = (locationId: string): string => {
    const locMap = new Map(locations.map(l => [l.id, l]));
    const parts: string[] = [];
    let currentId: string | null | undefined = locationId;

    while (currentId && locMap.has(currentId)) {
      const locObj: LocationItem = locMap.get(currentId)!;
      parts.unshift(locObj.name);
      currentId = locObj.parent_id;
    }

    return parts.length > 0 ? parts.join(' → ') : (language === 'hu' ? 'Nincs megadva' : 'Unspecified');
  };

  const getCategoryName = (categoryId: string): string => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return language === 'hu' ? 'Kategorizálatlan' : 'Uncategorized';
    
    // Map default category names dynamically based on language
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

  // CRUD Items
  const addItem = async (itemData: Omit<Item, 'id' | 'created_at'>): Promise<Item> => {
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
    setItems(prev => prev.map(item => item.id === id ? {
      ...item,
      ...updates,
      updated_at: new Date().toISOString()
    } : item));
  };

  const deleteItem = async (id: string): Promise<void> => {
    setItems(prev => prev.filter(item => item.id !== id));
    setDocuments(prev => prev.filter(doc => doc.item_id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  // CRUD Categories
  const addCategory = async (name: string): Promise<Category> => {
    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name,
      is_custom: true,
      created_at: new Date().toISOString(),
    };
    setCategories(prev => [...prev, newCat]);
    return newCat;
  };

  // CRUD Locations
  const addLocation = async (name: string, parentId?: string | null): Promise<LocationItem> => {
    const newLoc: LocationItem = {
      id: 'loc-' + Date.now(),
      name,
      parent_id: parentId || null,
      created_at: new Date().toISOString(),
    };
    setLocations(prev => [...prev, newLoc]);
    return newLoc;
  };

  const deleteLocation = async (id: string): Promise<void> => {
    setLocations(prev => prev.filter(l => l.id !== id && l.parent_id !== id));
  };

  // CRUD Documents
  const addDocument = async (
    itemId: string,
    fileName: string,
    fileUrl: string,
    docType: ItemDocument['document_type']
  ): Promise<ItemDocument> => {
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
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,

        user,
        isAuthenticated: !!user,
        isAdmin: !!user && (user.email?.toLowerCase() === 'mythingor@gmail.com' || !!user.is_admin),
        isRegistrationSuspended,
        setIsRegistrationSuspended,
        login,
        signup,
        resetPassword,
        updatePassword,
        logout,

        currentView,
        setCurrentView,
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
