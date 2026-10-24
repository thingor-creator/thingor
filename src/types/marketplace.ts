export type ListingType =
  | 'share'
  | 'sell'
  | 'sale'
  | 'giveaway'
  | 'free'
  | 'rent'
  | 'barter';

export type ListingStatus =
  | 'active'
  | 'reserved'
  | 'completed'
  | 'archived'
  | 'moderated';

export type MarketplaceItemCondition =
  | 'new'
  | 'like_new'
  | 'good'
  | 'fair'
  | 'parts'
  | 'New'
  | 'Excellent'
  | 'Good'
  | 'Fair'
  | 'Poor'
  | 'Broken';

export type OfferStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'completed';

export type OfferType = 'buy' | 'rent' | 'barter' | ListingType;

export type ReportReason =
  | 'spam'
  | 'inappropriate'
  | 'fraudulent'
  | 'prohibited_item'
  | 'harassment'
  | 'other';

export type ListingSortBy = 'newest' | 'price_asc' | 'price_desc' | 'trust_score';

export type RentalPeriodUnit = 'hour' | 'day' | 'week' | 'month';

export interface PublicProfile {
  id?: string; // Convenient alias for user_id
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  location_region?: string | null;
  trust_score: number;
  successful_deals: number;
  is_verified: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ListingImage {
  id?: string;
  listing_id?: string;
  image_url: string;
  display_order: number;
  is_primary?: boolean;
  created_at?: string;
}

export interface MarketplaceListing {
  id: string;
  user_id: string;
  seller_id: string; // Convenient alias for user_id
  source_item_id?: string | null;
  title: string;
  description: string;
  listing_type: ListingType;
  status: ListingStatus;
  category: string;
  category_id?: string; // Convenient alias for category
  condition: MarketplaceItemCondition | string;
  price?: number | null;
  currency: string;
  is_negotiable?: boolean;
  rental_period_unit?: RentalPeriodUnit | null;
  rental_deposit?: number | null;
  min_rental_duration?: number | null;
  max_rental_duration?: number | null;
  barter_target_description?: string | null;
  barter_description?: string | null; // Convenient alias
  location_region?: string;
  has_warranty?: boolean;
  has_invoice?: boolean;
  view_count?: number;
  favorite_count?: number;
  created_at: string;
  updated_at?: string;

  // Joined presentation fields
  images?: ListingImage[];
  seller?: PublicProfile;
  is_saved?: boolean;
}

export interface SavedListing {
  user_id: string;
  listing_id: string;
  created_at: string;
  listing?: MarketplaceListing;
}

export interface UserBlock {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id?: string | null;
  listing_id?: string | null;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  admin_notes?: string | null;
  created_at: string;
}

export interface MarketplaceConversation {
  id: string;
  listing_id: string;
  seller_id: string;
  buyer_id: string;
  last_message_at: string;
  created_at: string;

  // Joined fields
  listing?: MarketplaceListing;
  seller?: PublicProfile;
  buyer?: PublicProfile;
  last_message?: MarketplaceMessage;
  unread_count?: number;
}

export interface MarketplaceMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface MarketplaceOffer {
  id: string;
  conversation_id?: string;
  listing_id: string;
  sender_id: string;
  buyer_id?: string; // Alias for sender_id
  offer_type: OfferType;
  status: OfferStatus;
  offered_price?: number | null;
  currency?: string;
  rental_start_date?: string | null;
  rental_end_date?: string | null;
  offered_item_id?: string | null;
  offered_item_description?: string | null;
  barter_description?: string | null;
  note?: string | null;
  message?: string | null; // Alias for note
  created_at: string;
  updated_at?: string;

  // Joined fields
  sender?: PublicProfile;
}

export interface MarketplaceFilterState {
  searchQuery?: string;
  query?: string; // Alias
  listingType?: ListingType | 'all';
  listing_type?: ListingType | 'all'; // Alias
  category?: string;
  category_id?: string; // Alias
  condition?: MarketplaceItemCondition | string | 'all';
  minPrice?: number;
  min_price?: number; // Alias
  maxPrice?: number;
  max_price?: number; // Alias
  locationRegion?: string;
  location_region?: string; // Alias
  sortBy?: ListingSortBy;
  sort_by?: ListingSortBy; // Alias
  seller_id?: string;
  status?: ListingStatus;
  limit?: number;
  offset?: number;
}
