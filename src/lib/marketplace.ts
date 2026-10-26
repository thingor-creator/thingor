import { supabase, isSupabaseConfigured } from './supabase';
import type {
  MarketplaceListing,
  ListingImage,
  PublicProfile,
  MarketplaceConversation,
  MarketplaceMessage,
  MarketplaceOffer,
  MarketplaceFilterState,
  OfferStatus,
  ListingStatus,
  ListingType,
  OfferType,
  ReportReason,
} from '../types/marketplace';
import { validateMarketplaceImageOrigin } from './r2';

/**
 * Normalizes any condition string (from UI, Item, or database) to the PostgreSQL public.item_condition enum:
 * 'new' | 'like_new' | 'good' | 'fair' | 'parts'
 */
export function normalizeDbCondition(condition?: string | null): 'new' | 'like_new' | 'good' | 'fair' | 'parts' {
  if (!condition) return 'good';
  const c = condition.toLowerCase().trim();
  if (c === 'new') return 'new';
  if (c === 'like_new' || c === 'excellent') return 'like_new';
  if (c === 'good') return 'good';
  if (c === 'fair') return 'fair';
  if (c === 'parts' || c === 'poor' || c === 'broken') return 'parts';
  return 'good';
}

/**
 * Formats condition into user-friendly localized display text
 */
export function getConditionDisplayLabel(condition?: string | null, isHu = true): string {
  const norm = normalizeDbCondition(condition);
  switch (norm) {
    case 'new':
      return isHu ? 'Új' : 'New';
    case 'like_new':
      return isHu ? 'Újszerű / Kiváló' : 'Like New';
    case 'good':
      return isHu ? 'Jó állapotú' : 'Good';
    case 'fair':
      return isHu ? 'Használt' : 'Fair';
    case 'parts':
      return isHu ? 'Alkatrésznek / Kopott' : 'For Parts / Poor';
    default:
      return condition || (isHu ? 'Jó' : 'Good');
  }
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

export interface ListingFetchResult {
  listings: MarketplaceListing[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Normalizes DB listing row to include convenient aliases (seller_id, category_id, etc.).
 */
function normalizeListing(row: any): MarketplaceListing {
  const sellerObj = Array.isArray(row.seller) ? row.seller[0] : row.seller;
  const seller: PublicProfile | undefined = sellerObj
    ? {
        ...sellerObj,
        id: sellerObj.user_id,
      }
    : undefined;

  const images: ListingImage[] = (row.images || [])
    .map((img: any, idx: number) => ({
      ...img,
      is_primary: idx === 0,
    }))
    .sort((a: ListingImage, b: ListingImage) => (a.display_order ?? 0) - (b.display_order ?? 0));

  return {
    ...row,
    seller_id: row.user_id,
    category_id: row.category,
    barter_description: row.barter_target_description,
    images,
    seller,
  };
}

/**
 * Helper to get currently authenticated user ID safely.
 */
async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

// ============================================================================
// 1. LISTINGS FETCH & SEARCH
// ============================================================================

/**
 * Canonical fetch for marketplace listings.
 */
export async function fetchMarketplaceListings(
  filters: Partial<MarketplaceFilterState> = {},
  page = 1,
  pageSize = 18
): Promise<ListingFetchResult> {
  if (!supabase || !isSupabaseConfigured) {
    return { listings: [], totalCount: 0, page, pageSize };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('marketplace_listings')
    .select(
      `
      *,
      images:listing_images(*),
      seller:public_profiles!marketplace_listings_user_id_fkey(
        user_id, display_name, avatar_url, location_region, trust_score, successful_deals, is_verified, created_at
      )
    `,
      { count: 'exact' }
    );

  // Status: default to active if not specified
  const statusFilter = filters.status || 'active';
  query = query.eq('status', statusFilter);

  // Filter: Seller ID
  if (filters.seller_id) {
    query = query.eq('user_id', filters.seller_id);
  }

  // Filter: Listing Type
  const lType = filters.listing_type || filters.listingType;
  if (lType && lType !== 'all') {
    // Map UI aliases ('sale' -> 'sell', 'free' -> 'giveaway')
    const dbType = lType === 'sale' ? 'sell' : lType === 'free' ? 'giveaway' : lType;
    query = query.eq('listing_type', dbType);
  }

  // Filter: Category
  const cat = filters.category || filters.category_id;
  if (cat && cat !== 'all') {
    query = query.eq('category', cat);
  }

  // Filter: Condition
  if (filters.condition && filters.condition !== 'all') {
    query = query.eq('condition', normalizeDbCondition(filters.condition));
  }

  // Filter: Location Region
  const reg = filters.location_region || filters.locationRegion;
  if (reg && reg.trim()) {
    query = query.ilike('location_region', `%${reg.trim()}%`);
  }

  // Filter: Price Range
  const minP = filters.min_price ?? filters.minPrice;
  if (minP !== undefined && minP !== null && minP >= 0) {
    query = query.gte('price', minP);
  }
  const maxP = filters.max_price ?? filters.maxPrice;
  if (maxP !== undefined && maxP !== null && maxP >= 0) {
    query = query.lte('price', maxP);
  }

  // Filter: Search Query (Title or Description)
  const q = (filters.query || filters.searchQuery || '').trim();
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  // Sorting
  const sortBy = filters.sort_by || filters.sortBy || 'newest';
  switch (sortBy) {
    case 'price_asc':
      query = query.order('price', { ascending: true, nullsFirst: false });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false, nullsFirst: false });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('[Marketplace] Error fetching listings:', error.message);
    throw new Error(error.message);
  }

  const listings: MarketplaceListing[] = (data || []).map(normalizeListing);

  return {
    listings,
    totalCount: count || 0,
    page,
    pageSize,
  };
}

/**
 * UI Wrapper: fetches listings returning standard ApiResponse.
 */
export async function fetchListings(
  filters: Partial<MarketplaceFilterState> = {}
): Promise<ApiResponse<MarketplaceListing[]>> {
  try {
    const page = filters.offset !== undefined && filters.limit
      ? Math.floor(filters.offset / filters.limit) + 1
      : 1;
    const pageSize = filters.limit || 18;

    const res = await fetchMarketplaceListings(filters, page, pageSize);

    // If current user is logged in, attach is_saved status
    const currentUserId = await getCurrentUserId();
    if (currentUserId && res.listings.length > 0) {
      const listingIds = res.listings.map((l) => l.id);
      const { data: savedRows } = await supabase!
        .from('saved_listings')
        .select('listing_id')
        .eq('user_id', currentUserId)
        .in('listing_id', listingIds);

      const savedSet = new Set((savedRows || []).map((r: any) => r.listing_id));
      res.listings = res.listings.map((l) => ({
        ...l,
        is_saved: savedSet.has(l.id),
      }));
    }

    return {
      success: true,
      data: res.listings,
      count: res.totalCount,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Hiba a hirdetések lekérésekor',
    };
  }
}

/**
 * Fetches a single listing by ID with full details.
 */
export async function fetchListingById(
  listingId: string
): Promise<ApiResponse<MarketplaceListing>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select(
        `
        *,
        images:listing_images(*),
        seller:public_profiles!marketplace_listings_user_id_fkey(
          user_id, display_name, avatar_url, bio, location_region, trust_score, successful_deals, is_verified, created_at
        )
      `
      )
      .eq('id', listingId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return { success: false, error: 'A hirdetés nem található' };

    const listing = normalizeListing(data);

    // Check if saved by current user
    const currentUserId = await getCurrentUserId();
    if (currentUserId) {
      const { data: savedData } = await supabase
        .from('saved_listings')
        .select('listing_id')
        .eq('user_id', currentUserId)
        .eq('listing_id', listingId)
        .maybeSingle();

      listing.is_saved = Boolean(savedData);
    }

    return { success: true, data: listing };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Hiba a hirdetés betöltésekor' };
  }
}

// ============================================================================
// 2. MY LISTINGS & SAVED BOOKMARKS
// ============================================================================

export async function fetchMyListings(
  userId?: string
): Promise<ApiResponse<MarketplaceListing[]>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const targetUserId = userId || (await getCurrentUserId());
    if (!targetUserId) {
      return { success: false, error: 'Hitelesítés szükséges' };
    }

    const { data, error } = await supabase
      .from('marketplace_listings')
      .select(
        `
        *,
        images:listing_images(*)
      `
      )
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const listings = (data || []).map(normalizeListing);
    return { success: true, data: listings };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Hiba a saját hirdetések lekérésekor' };
  }
}

export async function fetchSavedListings(
  userId?: string
): Promise<ApiResponse<MarketplaceListing[]>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const targetUserId = userId || (await getCurrentUserId());
    if (!targetUserId) {
      return { success: false, error: 'Hitelesítés szükséges' };
    }

    const { data, error } = await supabase
      .from('saved_listings')
      .select(
        `
        *,
        listing:marketplace_listings(
          *,
          images:listing_images(*),
          seller:public_profiles!marketplace_listings_user_id_fkey(
            user_id, display_name, avatar_url, trust_score, is_verified
          )
        )
      `
      )
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const listings: MarketplaceListing[] = (data || [])
      .map((row: any) => {
        if (!row.listing) return null;
        const norm = normalizeListing(row.listing);
        norm.is_saved = true;
        return norm;
      })
      .filter(Boolean) as MarketplaceListing[];

    return { success: true, data: listings };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Hiba a mentett hirdetések lekérésekor' };
  }
}

export async function toggleSavedListing(
  listingId: string,
  isCurrentlySaved: boolean
): Promise<ApiResponse<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return { success: false, error: 'Hitelesítés szükséges' };
    }

    if (isCurrentlySaved) {
      const { error } = await supabase
        .from('saved_listings')
        .delete()
        .eq('user_id', currentUserId)
        .eq('listing_id', listingId);
      if (error) throw new Error(error.message);
      return { success: true, data: false };
    } else {
      const { error } = await supabase
        .from('saved_listings')
        .insert({ user_id: currentUserId, listing_id: listingId });
      if (error) throw new Error(error.message);
      return { success: true, data: true };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Nem sikerült módosítani a mentést' };
  }
}

// Canonical alias
export const toggleSaveListing = toggleSavedListing;

// ============================================================================
// 3. CREATE, UPDATE & DELETE LISTINGS
// ============================================================================

export async function createListing(payload: {
  title: string;
  description?: string;
  listing_type: ListingType;
  category_id?: string;
  category?: string;
  condition: string;
  price?: number;
  currency?: string;
  rental_period_unit?: 'day' | 'month' | 'hour' | 'week';
  rental_deposit?: number;
  barter_description?: string;
  location_region?: string;
  has_warranty?: boolean;
  has_invoice?: boolean;
  source_item_id?: string;
  images?: string[];
}): Promise<ApiResponse<MarketplaceListing>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Hitelesítés szükséges' };

    // Validate images
    const imageUrls = payload.images || [];
    for (const url of imageUrls) {
      const check = validateMarketplaceImageOrigin(url, userId);
      if (!check.valid) {
        throw new Error(`Kép-érvényesítési hiba: ${check.error || 'Nem engedélyezett forrás'}`);
      }
    }

    // Map UI types ('sale' -> 'sell', 'free' -> 'giveaway')
    let dbType: any = payload.listing_type;
    if (dbType === 'sale') dbType = 'sell';
    if (dbType === 'free') dbType = 'giveaway';

    const { data: newListing, error: insertError } = await supabase
      .from('marketplace_listings')
      .insert({
        user_id: userId,
        source_item_id: payload.source_item_id || null,
        title: payload.title.trim(),
        description: (payload.description || '').trim() || payload.title.trim(),
        listing_type: dbType,
        status: 'active',
        category: payload.category_id || payload.category || 'Elektronika',
        condition: normalizeDbCondition(payload.condition),
        price: payload.price !== undefined ? payload.price : null,
        currency: payload.currency || 'HUF',
        rental_period_unit: payload.rental_period_unit || null,
        rental_deposit: payload.rental_deposit || null,
        barter_target_description: payload.barter_description || null,
        location_region: payload.location_region?.trim() || null,
        has_warranty: Boolean(payload.has_warranty),
        has_invoice: Boolean(payload.has_invoice),
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    // Insert associated images
    if (imageUrls.length > 0) {
      const imagesToInsert = imageUrls.map((url, idx) => ({
        listing_id: newListing.id,
        image_url: url.trim(),
        display_order: idx,
      }));
      await supabase.from('listing_images').insert(imagesToInsert);
    }

    return { success: true, data: normalizeListing(newListing) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Hiba a hirdetés létrehozásakor' };
  }
}

export async function updateListing(
  listingId: string,
  payload: Partial<Omit<MarketplaceListing, 'images'>> & { images?: (string | ListingImage)[] }
): Promise<ApiResponse<MarketplaceListing>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Hitelesítés szükséges' };

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (payload.title !== undefined) updates.title = payload.title.trim();
    if (payload.description !== undefined) updates.description = payload.description.trim();
    if (payload.listing_type !== undefined) {
      let dbType: any = payload.listing_type;
      if (dbType === 'sale') dbType = 'sell';
      if (dbType === 'free') dbType = 'giveaway';
      updates.listing_type = dbType;
    }
    if (payload.category_id !== undefined || payload.category !== undefined) {
      updates.category = payload.category_id || payload.category;
    }
    if (payload.condition !== undefined) updates.condition = normalizeDbCondition(payload.condition);
    if (payload.price !== undefined) updates.price = payload.price;
    if (payload.currency !== undefined) updates.currency = payload.currency;
    if (payload.rental_period_unit !== undefined) updates.rental_period_unit = payload.rental_period_unit;
    if (payload.rental_deposit !== undefined) updates.rental_deposit = payload.rental_deposit;
    if (payload.barter_description !== undefined || payload.barter_target_description !== undefined) {
      updates.barter_target_description = payload.barter_description || payload.barter_target_description;
    }
    if (payload.location_region !== undefined) updates.location_region = payload.location_region?.trim() || null;
    if (payload.has_warranty !== undefined) updates.has_warranty = payload.has_warranty;
    if (payload.has_invoice !== undefined) updates.has_invoice = payload.has_invoice;
    if (payload.status !== undefined) updates.status = payload.status;

    const { data: updated, error: updateError } = await supabase
      .from('marketplace_listings')
      .update(updates)
      .eq('id', listingId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    // Sync images if provided
    if (payload.images) {
      await supabase.from('listing_images').delete().eq('listing_id', listingId);
      if (payload.images.length > 0) {
        const imagesToInsert = payload.images.map((img: any, idx: number) => ({
          listing_id: listingId,
          image_url: typeof img === 'string' ? img.trim() : String(img.image_url || '').trim(),
          display_order: idx,
        }));
        await supabase.from('listing_images').insert(imagesToInsert);
      }
    }

    return { success: true, data: normalizeListing(updated) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Hiba a hirdetés módosításakor' };
  }
}

export async function updateListingStatus(
  listingId: string,
  newStatus: ListingStatus
): Promise<ApiResponse<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Hitelesítés szükséges' };

    const { error } = await supabase
      .from('marketplace_listings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', listingId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return { success: true, data: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Nem sikerült módosítani a státuszt' };
  }
}

export async function deleteListing(listingId: string): Promise<ApiResponse<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Hitelesítés szükséges' };

    const { error } = await supabase
      .from('marketplace_listings')
      .delete()
      .eq('id', listingId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return { success: true, data: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Nem sikerült törölni a hirdetést' };
  }
}

// ============================================================================
// 4. PUBLIC PROFILES
// ============================================================================

export async function fetchPublicProfile(
  userId: string
): Promise<ApiResponse<PublicProfile>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const { data, error } = await supabase
      .from('public_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return { success: false, error: 'Profil nem található' };

    return {
      success: true,
      data: {
        ...data,
        id: data.user_id,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Hiba a profil betöltésekor' };
  }
}

export const fetchPublicSellerProfile = fetchPublicProfile;

// ============================================================================
// 5. CONVERSATIONS & CHAT
// ============================================================================

export async function fetchConversations(): Promise<ApiResponse<MarketplaceConversation[]>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Hitelesítés szükséges' };

    const { data, error } = await supabase
      .from('marketplace_conversations')
      .select(
        `
        *,
        listing:marketplace_listings(
          id, title, price, currency, listing_type, status,
          images:listing_images(*)
        ),
        seller:public_profiles!marketplace_conversations_seller_id_fkey(
          user_id, display_name, avatar_url, trust_score, is_verified
        ),
        buyer:public_profiles!marketplace_conversations_buyer_id_fkey(
          user_id, display_name, avatar_url, trust_score, is_verified
        )
      `
      )
      .or(`seller_id.eq.${userId},buyer_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) throw new Error(error.message);

    const conversations = (data || []).map((row: any) => ({
      ...row,
      seller: row.seller ? { ...row.seller, id: row.seller.user_id } : undefined,
      buyer: row.buyer ? { ...row.buyer, id: row.buyer.user_id } : undefined,
      listing: row.listing ? normalizeListing(row.listing) : undefined,
    }));

    return { success: true, data: conversations };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Hiba a beszélgetések betöltésekor' };
  }
}

export async function getOrCreateConversation(
  listingId: string,
  sellerId: string
): Promise<ApiResponse<MarketplaceConversation>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const buyerId = await getCurrentUserId();
    if (!buyerId) return { success: false, error: 'Hitelesítés szükséges' };

    if (sellerId === buyerId) {
      return { success: false, error: 'Saját hirdetéssel nem indítható beszélgetés' };
    }

    // Check if exists
    const { data: existing } = await supabase
      .from('marketplace_conversations')
      .select(
        `
        *,
        listing:marketplace_listings(
          id, title, price, currency, listing_type, status,
          images:listing_images(*)
        ),
        seller:public_profiles!marketplace_conversations_seller_id_fkey(
          user_id, display_name, avatar_url, trust_score, is_verified
        ),
        buyer:public_profiles!marketplace_conversations_buyer_id_fkey(
          user_id, display_name, avatar_url, trust_score, is_verified
        )
      `
      )
      .eq('listing_id', listingId)
      .eq('buyer_id', buyerId)
      .maybeSingle();

    if (existing) {
      return {
        success: true,
        data: {
          ...existing,
          seller: existing.seller ? { ...existing.seller, id: existing.seller.user_id } : undefined,
          buyer: existing.buyer ? { ...existing.buyer, id: existing.buyer.user_id } : undefined,
          listing: existing.listing ? normalizeListing(existing.listing) : undefined,
        },
      };
    }

    // Create new
    const { data: created, error } = await supabase
      .from('marketplace_conversations')
      .insert({
        listing_id: listingId,
        seller_id: sellerId,
        buyer_id: buyerId,
      })
      .select(
        `
        *,
        listing:marketplace_listings(
          id, title, price, currency, listing_type, status,
          images:listing_images(*)
        ),
        seller:public_profiles!marketplace_conversations_seller_id_fkey(
          user_id, display_name, avatar_url, trust_score, is_verified
        ),
        buyer:public_profiles!marketplace_conversations_buyer_id_fkey(
          user_id, display_name, avatar_url, trust_score, is_verified
        )
      `
      )
      .single();

    if (error) throw new Error(error.message);

    return {
      success: true,
      data: {
        ...created,
        seller: created.seller ? { ...created.seller, id: created.seller.user_id } : undefined,
        buyer: created.buyer ? { ...created.buyer, id: created.buyer.user_id } : undefined,
        listing: created.listing ? normalizeListing(created.listing) : undefined,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Nem sikerült elindítani a beszélgetést' };
  }
}

export async function fetchMessages(
  conversationId: string
): Promise<ApiResponse<MarketplaceMessage[]>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const { data, error } = await supabase
      .from('marketplace_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Hiba az üzenetek lekérésekor' };
  }
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<ApiResponse<MarketplaceMessage>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const senderId = await getCurrentUserId();
    if (!senderId) return { success: false, error: 'Hitelesítés szükséges' };

    const trimmed = content.trim();
    if (!trimmed) return { success: false, error: 'Az üzenet nem lehet üres' };

    const { data, error } = await supabase
      .from('marketplace_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: trimmed,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Nem sikerült elküldeni az üzenetet' };
  }
}

export async function markMessagesAsRead(
  conversationId: string
): Promise<ApiResponse<boolean>> {
  if (!supabase || !isSupabaseConfigured) return { success: false };

  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) return { success: false };

    await supabase
      .from('marketplace_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .eq('is_read', false);

    return { success: true, data: true };
  } catch {
    return { success: false };
  }
}

export function subscribeToConversationMessages(
  conversationId: string,
  onNewMessage: (msg: MarketplaceMessage) => void
) {
  if (!supabase || !isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'marketplace_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new) {
          onNewMessage(payload.new as MarketplaceMessage);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================================================
// 6. OFFERS
// ============================================================================

export async function fetchOffersForListing(
  listingId: string
): Promise<ApiResponse<MarketplaceOffer[]>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const { data, error } = await supabase
      .from('marketplace_offers')
      .select(
        `
        *,
        sender:public_profiles!marketplace_offers_sender_id_fkey(
          user_id, display_name, avatar_url, trust_score, is_verified
        )
      `
      )
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const offers = (data || []).map((row: any) => ({
      ...row,
      buyer_id: row.sender_id,
      barter_description: row.offered_item_description,
      message: row.note,
      sender: row.sender ? { ...row.sender, id: row.sender.user_id } : undefined,
    }));

    return { success: true, data: offers };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Hiba az ajánlatok betöltésekor' };
  }
}

export async function createOffer(payload: {
  listing_id: string;
  offer_type: OfferType;
  offered_price?: number;
  currency?: string;
  rental_start_date?: string;
  rental_end_date?: string;
  barter_description?: string;
  offered_item_id?: string;
  message?: string;
}): Promise<ApiResponse<MarketplaceOffer>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const senderId = await getCurrentUserId();
    if (!senderId) return { success: false, error: 'Hitelesítés szükséges' };

    // Get listing to retrieve seller_id
    const { data: listing } = await supabase
      .from('marketplace_listings')
      .select('user_id')
      .eq('id', payload.listing_id)
      .single();

    if (!listing) return { success: false, error: 'A hirdetés nem található' };

    // Get or create conversation for this offer
    const convRes = await getOrCreateConversation(payload.listing_id, listing.user_id);
    const convId = convRes.data?.id;

    // Map UI types
    let dbType: any = payload.offer_type;
    if (dbType === 'buy' || dbType === 'sale') dbType = 'sell';
    if (dbType === 'free') dbType = 'giveaway';

    const { data, error } = await supabase
      .from('marketplace_offers')
      .insert({
        conversation_id: convId,
        listing_id: payload.listing_id,
        sender_id: senderId,
        offer_type: dbType,
        status: 'pending',
        offered_price: payload.offered_price !== undefined ? payload.offered_price : null,
        rental_start_date: payload.rental_start_date || null,
        rental_end_date: payload.rental_end_date || null,
        offered_item_id: payload.offered_item_id || null,
        offered_item_description: payload.barter_description || null,
        note: payload.message ? payload.message.trim() : null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      success: true,
      data: {
        ...data,
        buyer_id: data.sender_id,
        barter_description: data.offered_item_description,
        message: data.note,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Nem sikerült elküldeni az ajánlatot' };
  }
}

export async function respondToOffer(
  offerId: string,
  newStatus: OfferStatus
): Promise<ApiResponse<MarketplaceOffer>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const { data, error } = await supabase
      .from('marketplace_offers')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', offerId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      success: true,
      data: {
        ...data,
        buyer_id: data.sender_id,
        barter_description: data.offered_item_description,
        message: data.note,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Nem sikerült frissíteni az ajánlatot' };
  }
}

export async function cancelOffer(offerId: string): Promise<ApiResponse<MarketplaceOffer>> {
  return respondToOffer(offerId, 'cancelled');
}

// ============================================================================
// 7. BLOCKS & REPORTS
// ============================================================================

export async function blockUser(
  blockedId: string,
  _reason?: string
): Promise<ApiResponse<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const blockerId = await getCurrentUserId();
    if (!blockerId) return { success: false, error: 'Hitelesítés szükséges' };

    const { error } = await supabase
      .from('user_blocks')
      .insert({ blocker_id: blockerId, blocked_id: blockedId });

    if (error && error.code !== '23505') {
      throw new Error(error.message);
    }

    return { success: true, data: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Nem sikerült letiltani a felhasználót' };
  }
}

export async function reportListingOrUser(payload: {
  listing_id?: string;
  reported_user_id?: string;
  reason: ReportReason | string;
  description?: string;
}): Promise<ApiResponse<boolean>> {
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase nincs konfigurálva' };
  }

  try {
    const reporterId = await getCurrentUserId();
    if (!reporterId) return { success: false, error: 'Hitelesítés szükséges' };

    const { error } = await supabase.from('user_reports').insert({
      reporter_id: reporterId,
      reported_user_id: payload.reported_user_id || null,
      listing_id: payload.listing_id || null,
      reason: payload.reason,
      admin_notes: payload.description?.trim() || null,
      status: 'pending',
    });

    if (error) throw new Error(error.message);
    return { success: true, data: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Nem sikerült elküldeni a bejelentést' };
  }
}
