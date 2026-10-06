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
}

export type ItemStatus = 'Working' | 'Faulty' | 'UnderRepair' | 'Repaired' | 'Scrapped';
export type ItemOwnershipScope = 'private' | 'household';

export type RepairUrgency = 'low' | 'normal' | 'high' | 'urgent';
export type RepairStatus = 'pending' | 'in_progress' | 'repaired' | 'scrapped';

export interface ItemRepair {
  id: string;
  item_id: string;
  user_id?: string;
  title: string;
  description: string;
  reported_at: string;
  urgency: RepairUrgency;
  usable: boolean;
  photo_url?: string;
  status: RepairStatus;
  repair_shop?: string;
  estimated_completion?: string;
  parts_cost?: number;
  labor_cost?: number;
  total_cost?: number;
  is_warranty_repair?: boolean;
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
  first_payment_date: string;
  next_payment_date: string;
  end_date: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export type HouseholdRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Household {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: HouseholdRole;
  joined_at: string;
}

export interface HouseholdInvite {
  id: string;
  household_id: string;
  email: string;
  role: HouseholdRole;
  token: string;
  invited_by: string;
  expires_at: string;
  created_at: string;
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
  warranty_start?: string;
  warranty_end?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'suspended' | 'deleted';

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  role?: UserRole;
  status?: UserStatus;
  is_admin?: boolean;
  created_at?: string;
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

export type ViewMode = 'landing' | 'dashboard' | 'items' | 'locations' | 'categories' | 'documents' | 'repairs' | 'financing' | 'household' | 'notes' | 'admin' | 'guest_share' | 'legal';

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

