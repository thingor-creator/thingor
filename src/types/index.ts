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
  warranty_start?: string;
  warranty_end?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  created_at?: string;
}

export type ViewMode = 'landing' | 'dashboard' | 'items' | 'locations' | 'categories' | 'documents';

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
