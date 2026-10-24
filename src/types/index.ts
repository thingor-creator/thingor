export type ItemCondition = 'New' | 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Broken';

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  is_custom?: boolean;
  created_at?: string;
}

export interface LocationItem {
  id: string;
  user_id?: string;
  parent_id?: string | null;
  name: string;
  created_at?: string;
  children?: LocationItem[];
}

export interface ItemDocument {
  id: string;
  item_id: string;
  user_id?: string;
  file_name: string;
  file_url: string;
  document_type: 'Invoice' | 'Warranty' | 'Manual' | 'Certificate' | 'Photo' | 'Other';
  created_at: string;
  size_bytes?: number;
  is_vault_protected?: boolean;
}

export type ItemStatus = 'Working' | 'Faulty' | 'UnderRepair' | 'Repaired' | 'Scrapped';
export type ItemOwnershipScope = 'private' | 'household';

export type RepairUrgency = 'low' | 'medium' | 'normal' | 'high' | 'urgent';
export type RepairStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'repaired' | 'scrapped';

export interface ItemRepair {
  id: string;
  item_id: string;
  user_id?: string;
  title?: string;
  fault_title?: string;
  description?: string;
  fault_description?: string;
  reported_at?: string;
  reported_date?: string;
  urgency: RepairUrgency;
  usable?: boolean;
  still_usable?: boolean;
  photo_url?: string;
  status: RepairStatus;
  repair_shop?: string;
  repairer_name?: string;
  estimated_completion?: string;
  expected_completion?: string;
  parts_cost?: number;
  labor_cost?: number;
  total_cost: number;
  is_warranty_repair?: boolean;
  is_warranty?: boolean;
  notes?: string;
  completed_at?: string;
  created_at: string;
}

export interface ItemFinancing {
  id: string;
  item_id: string;
  user_id?: string;
  provider: string;
  original_price: number;
  down_payment: number;
  financed_amount: number;
  monthly_installment: number;
  total_installments: number;
  paid_installments: number;
  remaining_installments: number;
  remaining_debt: number;
  start_date?: string;
  first_payment_date?: string;
  next_payment_date?: string;
  end_date?: string;
  notes?: string;
  is_active?: boolean;
  created_at: string;
}

export type HouseholdRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Household {
  id: string;
  name: string;
  owner_id?: string;
  created_by?: string;
  shared_location_ids?: string[];
  shared_category_ids?: string[];
  created_at: string;
}

export interface HouseholdMemberAllowedModules {
  inventory?: boolean;
  storage?: boolean;
  documents?: boolean;
  repairs?: boolean;
  financing?: boolean;
  lending?: boolean;
  collections?: boolean;
  pantry?: boolean;
  vault?: boolean;
  notes?: boolean;
}

export const DEFAULT_HOUSEHOLD_MODULES: Required<HouseholdMemberAllowedModules> = {
  inventory: true,
  storage: true,
  documents: true,
  repairs: true,
  financing: true,
  lending: true,
  collections: true,
  pantry: true,
  vault: true,
  notes: true,
};

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  email?: string;
  user_email?: string;
  display_name?: string;
  user_name?: string;
  title?: string;
  role: HouseholdRole;
  joined_at: string;
  allowed_location_ids?: string[] | null;
  allowed_category_ids?: string[] | null;
  sharing_mode?: 'all' | 'custom';
  allowed_modules?: HouseholdMemberAllowedModules | null;
  excluded_item_ids?: string[] | null;
}

export interface HouseholdInvite {
  id: string;
  household_id: string;
  email?: string;
  invited_email?: string;
  role: HouseholdRole;
  title?: string;
  token: string;
  invited_by: string;
  status?: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at?: string;
  created_at: string;
  household_name?: string;
  households?: { name?: string } | null;
}

export interface Item {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  category_id: string;
  location_id: string;
  photo_url?: string;
  additional_photos?: string[];
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  store_seller?: string;
  condition: ItemCondition;
  status?: ItemStatus;
  ownership_scope?: ItemOwnershipScope;
  household_id?: string;
  container_id?: string | null;
  warranty_start?: string;
  warranty_end?: string;
  notes?: string;
  is_vault_protected?: boolean;
  is_lendable?: boolean;
  lending_terms?: string;
  created_at: string;
  updated_at?: string;
}

export interface VaultSettings {
  id: string;
  user_id: string;
  pin_hash: string;
  salt: string;
  auto_lock_minutes: number;
  created_at: string;
  updated_at?: string;
}

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'suspended' | 'deleted';

export interface UserPreferences {
  pinned_modules?: string[];
  module_order?: string[];
  hidden_modules?: string[];
  compact_mode?: boolean;
  language?: 'hu' | 'en';
  currency?: 'HUF' | 'EUR' | 'USD';
  mobile_bottom_bar_left?: string;
  mobile_bottom_bar_right?: string;
  mobile_bottom_bar_slot1?: string;
  mobile_bottom_bar_slot2?: string;
  mobile_bottom_bar_slot3?: string;
  mobile_bottom_bar_slot4?: string;
  theme_id?: string;
  accent_color?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  role?: UserRole;
  status?: UserStatus;
  is_admin?: boolean;
  preferences?: UserPreferences;
  created_at?: string;
}

export interface DashboardMetrics {
  total_items: number;
  total_value: number;
  storage_spots: number;
  active_warranties: number;
  expiring_warranties: number;
  pending_repairs: number;
}

export type SharePurpose = 'view' | 'sale' | 'loan';

export interface SharePermissions {
  include_purchase_date?: boolean;
  include_warranty?: boolean;
  include_value?: boolean;
  include_purchase_price?: boolean;
  include_additional_images?: boolean;
}

export interface ItemShare {
  id: string;
  item_id: string;
  created_by: string;
  token: string;
  purpose: SharePurpose;
  expires_at?: string | null;
  revoked_at?: string | null;
  permissions: SharePermissions;
  created_at: string;
}

export interface SharedItemViewData {
  share_id: string;
  purpose: SharePurpose;
  expires_at?: string | null;
  permissions: SharePermissions;
  created_at: string;
  item_id: string;
  name: string;
  description?: string;
  condition: ItemCondition;
  photo_url?: string;
  additional_photos?: string[];
  purchase_date?: string;
  warranty_start?: string;
  warranty_end?: string;
  current_value?: number;
  purchase_price?: number;
}

export interface SiteSettings {
  id: string;
  site_name: string;
  site_description?: string;
  hero_title: string;
  hero_subtitle?: string;
  announcement?: string | null;
  registration_enabled: boolean;
  registration_paused_title?: string;
  registration_paused_message?: string;
  maintenance_mode: boolean;
  maintenance_message?: string | null;
  contact_email?: string;
  support_email?: string;
  primary_color?: string;
  logo_url?: string;
  favicon_url?: string;
  logo_height?: number;
  meta_description?: string;
  notifications_enabled?: boolean;
  email_notifications_enabled?: boolean;
  updated_at?: string;
  updated_by?: string;
}

export interface LandingBlock {
  id: string;
  section_key: string;
  title: string;
  subtitle?: string;
  description?: string;
  button_text?: string;
  button_url?: string;
  image_url?: string;
  is_enabled: boolean;
  display_order: number;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_published: boolean;
  created_at?: string;
}

export type LegalSlug = 'privacy' | 'terms' | 'cookies' | 'imprint';

export interface LegalDocumentVersion {
  id: string;
  document_slug: LegalSlug;
  version: number;
  title: string;
  content: string;
  status: 'draft' | 'published';
  created_by?: string;
  created_at: string;
  published_at?: string | null;
}

export interface UserDetailStats {
  user_id: string;
  email: string;
  display_name: string;
  role: UserRole;
  status: UserStatus;
  created_at?: string;
  item_count: number;
  location_count: number;
  category_count: number;
  document_count: number;
  total_value: number;
  storage_files_count: number;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_email?: string;
  action: string;
  target?: string;
  details?: Record<string, any>;
  created_at: string;
}

// Item Relationship & Linked Items
export type ItemRelationType =
  | 'accessory'       // Tartozéka
  | 'compatible'      // Kompatibilis vele
  | 'part_of'          // Része / Magában foglalja
  | 'required_for'    // Használatához szükséges
  | 'pair'            // Párja
  | 'related'         // Kapcsolódik hozzá
  | 'bought_together'; // Együtt vásárolva

export interface ItemRelation {
  id: string;
  source_item_id: string;
  target_item_id: string;
  relation_type: ItemRelationType;
  created_at?: string;
}

// Quick Notes Module
export interface QuickNote {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  location_hint?: string;
  tags?: string[];
  is_converted?: boolean;
  converted_item_id?: string;
  created_at: string;
  updated_at?: string;
}

export type LoanStatus = 'active' | 'returned' | 'overdue';

export interface ItemLoan {
  id: string;
  user_id: string;
  item_id: string;
  borrower_name: string;
  borrower_contact?: string;
  borrower_email?: string;
  lent_date: string;
  expected_return_date?: string;
  actual_return_date?: string;
  status: LoanStatus;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface LendingContact {
  id: string;
  user_id: string;
  name: string;
  contact_info?: string;
  relationship?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  collection_type: 'books' | 'coins' | 'watches' | 'wine' | 'records' | 'general' | string;
  cover_image_url?: string;
  is_public: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CollectionItem {
  id: string;
  collection_id: string;
  item_id?: string | null;
  name?: string;
  description?: string;
  photo_url?: string;
  additional_photos?: string[];
  quantity?: number;
  collector_grade?: string;
  rarity?: string;
  acquired_year?: number;
  catalog_number?: string;
  estimated_collector_value?: number;
  custom_attributes?: Record<string, any>;
  created_at: string;
}

export interface PantryItem {
  id: string;
  user_id: string;
  household_id?: string;
  name: string;
  category?: string;
  current_quantity: number;
  unit: string;
  min_threshold: number;
  expiration_date?: string;
  location_id?: string;
  notes?: string;
  is_staple: boolean;
  created_at: string;
  updated_at?: string;
}

export type ViewMode = 'landing' | 'dashboard' | 'items' | 'locations' | 'categories' | 'documents' | 'repairs' | 'financing' | 'household' | 'notes' | 'lending' | 'collections' | 'pantry' | 'vault' | 'admin' | 'guest_share' | 'legal' | 'settings' | 'storage' | 'marketplace';

export * from './marketplace';

export type SortField = 'name' | 'created_at' | 'purchase_date' | 'current_value' | 'category' | 'location';
export type SortOrder = 'asc' | 'desc';

export interface FilterState {
  search: string;
  categoryId: string;
  locationId: string;
  condition: string;
  sortBy: SortField;
  sortOrder: SortOrder;
}

// Notification Engine Module
export type NotificationType = 'warranty' | 'financing' | 'repair' | 'lending' | 'pantry' | 'system';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: NotificationType;
  reference_id?: string | null;
  dedup_key?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface UserNotificationSettings {
  user_id: string;
  warranty_enabled: boolean;
  financing_enabled: boolean;
  repair_enabled: boolean;
  email_enabled: boolean;
  inapp_enabled: boolean;
  shopping_cart_enabled?: boolean;
  updated_at?: string;
}

// Physical Storage System Types
export type ContainerType = 'box' | 'shelf' | 'cabinet' | 'drawer' | 'crate' | 'bag' | 'bin' | 'case' | 'other';
export type StorageOwnershipScope = 'private' | 'household';
export type ContainerItemUnit = 'db' | 'pár' | 'készlet' | 'csomag' | 'm' | 'kg' | 'l' | 'doboz';

export interface StorageContainer {
  id: string;
  user_id: string;
  ownership_scope: StorageOwnershipScope;
  household_id?: string | null;
  location_id?: string | null;
  parent_container_id?: string | null;
  name: string;
  container_type: ContainerType;
  qr_code?: string | null;
  photo_url?: string | null;
  color?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ContainerItem {
  id: string;
  container_id: string;
  user_id: string;
  ownership_scope: StorageOwnershipScope;
  household_id?: string | null;
  name: string;
  quantity: number;
  unit: ContainerItemUnit | string;
  min_quantity?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ImageViewerData {
  title?: string;
  subtitle?: string;
  photos: string[];
  activeIndex: number;
}



