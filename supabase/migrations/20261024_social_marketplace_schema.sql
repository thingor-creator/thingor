-- ==============================================================================
-- THINGOR SOCIAL MARKETPLACE SCHEMA MIGRATION
-- Migration: 20261024_social_marketplace_schema.sql
-- Description: Sets up the community marketplace layer:
--   1. Custom ENUM types (listing_type, listing_status, item_condition, offer_status)
--   2. Public profiles projection (isolated from private profiles)
--   3. Marketplace listings & listing images (independent lifecycle from items)
--   4. Saved listings (bookmarks)
--   5. User blocks & user reports (trust & safety)
--   6. Peer-to-peer conversations & real-time messaging
--   7. Structured offers with row-level locking & concurrency-safe state machine
--   8. Notification system integration & Realtime publication
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CUSTOM ENUM TYPES
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_type') THEN
    CREATE TYPE public.listing_type AS ENUM ('share', 'sell', 'giveaway', 'rent', 'barter');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN
    CREATE TYPE public.listing_status AS ENUM ('active', 'reserved', 'completed', 'archived', 'moderated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_condition') THEN
    CREATE TYPE public.item_condition AS ENUM ('new', 'like_new', 'good', 'fair', 'parts');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_status') THEN
    CREATE TYPE public.offer_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled', 'completed');
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 2. PUBLIC PROFILES TABLE & PRIVILEGE HARDENING
-- ------------------------------------------------------------------------------
-- Keeps private profile fields (email, preferences, roles, internal status)
-- strictly isolated inside public.profiles. Exposes only safe public metadata.
CREATE TABLE IF NOT EXISTS public.public_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) >= 2 AND char_length(display_name) <= 50),
  avatar_url TEXT,
  bio TEXT CHECK (bio IS NULL OR char_length(bio) <= 500),
  location_region TEXT CHECK (location_region IS NULL OR char_length(location_region) <= 100),
  trust_score NUMERIC(3,2) NOT NULL DEFAULT 5.00 CHECK (trust_score >= 1.00 AND trust_score <= 5.00),
  successful_deals INTEGER NOT NULL DEFAULT 0 CHECK (successful_deals >= 0),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for region browsing and public profiles
CREATE INDEX IF NOT EXISTS idx_public_profiles_location ON public.public_profiles(location_region);

-- Prevent unauthorized privilege escalation on public_profiles
CREATE OR REPLACE FUNCTION public.protect_public_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.is_verified IS DISTINCT FROM OLD.is_verified) OR 
     (NEW.trust_score IS DISTINCT FROM OLD.trust_score) OR 
     (NEW.successful_deals IS DISTINCT FROM OLD.successful_deals) THEN
    -- Only administrators or internal triggers may alter verified badge and score
    IF NOT public.is_admin() THEN
      NEW.is_verified := OLD.is_verified;
      NEW.trust_score := OLD.trust_score;
      NEW.successful_deals := OLD.successful_deals;
    END IF;
  END IF;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.protect_public_profile_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_public_profile_fields ON public.public_profiles;
CREATE TRIGGER trg_protect_public_profile_fields
BEFORE UPDATE ON public.public_profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_public_profile_fields();

-- Auto-synchronize display_name from private profiles to public_profiles
CREATE OR REPLACE FUNCTION public.handle_public_profile_sync()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.public_profiles (user_id, display_name)
  VALUES (NEW.user_id, COALESCE(NULLIF(TRIM(NEW.display_name), ''), 'Felhasználó'))
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(NULLIF(TRIM(EXCLUDED.display_name), ''), 'Felhasználó'),
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.handle_public_profile_sync() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_profile_to_public ON public.profiles;
CREATE TRIGGER trg_sync_profile_to_public
AFTER INSERT OR UPDATE OF display_name ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_public_profile_sync();

-- Initial backfill for existing registered profiles
INSERT INTO public.public_profiles (user_id, display_name)
SELECT user_id, COALESCE(NULLIF(TRIM(display_name), ''), 'Felhasználó')
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- RLS for public_profiles
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_profiles_select_policy" ON public.public_profiles;
CREATE POLICY "public_profiles_select_policy"
  ON public.public_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "public_profiles_insert_policy" ON public.public_profiles;
CREATE POLICY "public_profiles_insert_policy"
  ON public.public_profiles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "public_profiles_update_policy" ON public.public_profiles;
CREATE POLICY "public_profiles_update_policy"
  ON public.public_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());


-- ------------------------------------------------------------------------------
-- 3. MARKETPLACE LISTINGS & LISTING IMAGES
-- ------------------------------------------------------------------------------
-- source_item_id is optional and decoupled (ON DELETE SET NULL).
-- Private inventory records, purchase details, invoices and Vault documents
-- are strictly preserved and never exposed via this table.
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 120),
  description TEXT NOT NULL CHECK (char_length(description) >= 5 AND char_length(description) <= 3000),
  listing_type public.listing_type NOT NULL,
  status public.listing_status NOT NULL DEFAULT 'active',
  category TEXT NOT NULL CHECK (char_length(category) >= 1 AND char_length(category) <= 50),
  condition public.item_condition NOT NULL,
  price NUMERIC(12,2) CHECK (price IS NULL OR price >= 0),
  currency TEXT NOT NULL DEFAULT 'HUF' CHECK (char_length(currency) <= 5),
  is_negotiable BOOLEAN NOT NULL DEFAULT false,
  rental_period_unit TEXT CHECK (rental_period_unit IS NULL OR rental_period_unit IN ('hour', 'day', 'week', 'month')),
  rental_deposit NUMERIC(12,2) DEFAULT 0 CHECK (rental_deposit IS NULL OR rental_deposit >= 0),
  min_rental_duration INTEGER DEFAULT 1 CHECK (min_rental_duration IS NULL OR min_rental_duration >= 1),
  max_rental_duration INTEGER CHECK (max_rental_duration IS NULL OR max_rental_duration >= min_rental_duration),
  barter_target_description TEXT CHECK (barter_target_description IS NULL OR char_length(barter_target_description) <= 500),
  location_region TEXT NOT NULL CHECK (char_length(location_region) >= 2 AND char_length(location_region) <= 100),
  has_warranty BOOLEAN NOT NULL DEFAULT false,
  has_invoice BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  favorite_count INTEGER NOT NULL DEFAULT 0 CHECK (favorite_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance & search indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_active ON public.marketplace_listings(status, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_user ON public.marketplace_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_type ON public.marketplace_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON public.marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_source_item ON public.marketplace_listings(source_item_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_location ON public.marketplace_listings(location_region);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_search ON public.marketplace_listings USING gin(to_tsvector('simple', title || ' ' || description));

-- Prevent ownership tampering and unauthorized status alteration (e.g. un-moderating)
CREATE OR REPLACE FUNCTION public.protect_marketplace_listing_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Listing ownership cannot be transferred';
  END IF;

  -- Protect moderation status: only admins can set or lift 'moderated' status
  IF (NEW.status = 'moderated' OR OLD.status = 'moderated') AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can moderate listings or reinstate moderated listings';
  END IF;

  -- Protect stats from direct client manipulation
  IF NOT public.is_admin() THEN
    NEW.favorite_count := OLD.favorite_count;
  END IF;

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.protect_marketplace_listing_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_marketplace_listing_fields ON public.marketplace_listings;
CREATE TRIGGER trg_protect_marketplace_listing_fields
BEFORE UPDATE ON public.marketplace_listings
FOR EACH ROW EXECUTE FUNCTION public.protect_marketplace_listing_fields();

-- Images uploaded specifically for the listing (stored on R2 photos bucket via CDN)
-- Constraint enforces exclusion of documents, vault paths, query parameters, fragments, traversal,
-- percent-encoding bypasses, unauthorized hosts, and presigned tokens.
CREATE TABLE IF NOT EXISTS public.listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL CHECK (
    char_length(image_url) >= 5 AND char_length(image_url) <= 1000 AND
    -- Disallow whitespace, control characters, query parameters, fragments, backslashes, percent-encoding bypasses
    image_url !~ '[\s\x00-\x1f\x7f]' AND
    image_url !~ '[?#\\%]' AND
    image_url NOT LIKE '%..%' AND
    image_url NOT LIKE '%@%' AND
    -- Strictly forbid documents, vault, signed credentials, tokens
    image_url !~* '(vault|documents|x-amz-|token=)' AND
    -- Enforce exact scheme/host and path pattern:
    -- Either: https://media.thingor.com/<uuid>/photos/<safe-filename>
    -- Or relative: <uuid>/photos/<safe-filename>
    image_url ~* '^(https://media\.thingor\.com/)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/photos/[a-zA-Z0-9_.\-]+(/[a-zA-Z0-9_.\-]+)*$' AND
    -- Must have valid image extension
    image_url ~* '\.(jpe?g|png|webp|gif|avif)$'
  ),
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0 AND display_order <= 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON public.listing_images(listing_id, display_order ASC);

-- Enforce strict R2 origin and path ownership: images must belong to the listing owner's photos folder.
-- Host validation uses true URL parsing (extracts authority and verifies host = media.thingor.com).
-- Enforced for all users including administrators to prevent malicious external image injections.
CREATE OR REPLACE FUNCTION public.validate_listing_image_origin()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_normalized_url TEXT;
  v_path TEXT;
  v_slash_pos INTEGER;
  v_authority TEXT;
  v_url_owner_uuid TEXT;
  v_folder_segment TEXT;
  v_file_segment TEXT;
BEGIN
  -- 1. Retrieve listing owner
  SELECT user_id INTO v_owner_id
  FROM public.marketplace_listings
  WHERE id = NEW.listing_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Associated listing not found';
  END IF;

  v_normalized_url := TRIM(NEW.image_url);

  -- 2. URL parsing & Host verification
  IF v_normalized_url ~* '^https://' THEN
    -- Find the slash terminating the host authority
    v_slash_pos := position('/' IN substring(v_normalized_url FROM 9));
    IF v_slash_pos = 0 THEN
      RAISE EXCEPTION 'Invalid image URL: missing path component';
    END IF;

    v_authority := lower(substring(v_normalized_url FROM 9 FOR v_slash_pos - 1));

    -- Host must be strictly media.thingor.com (no custom port, no userinfo, no domain spoofing)
    IF v_authority <> 'media.thingor.com' THEN
      RAISE EXCEPTION 'Listing image host is unauthorized: % (only media.thingor.com is allowed)', v_authority;
    END IF;

    -- Extract path portion (starts after the host slash)
    v_path := substring(v_normalized_url FROM 8 + v_slash_pos);
  ELSIF v_normalized_url ~ '^[a-zA-Z0-9+.-]+://' OR v_normalized_url LIKE '//%' THEN
    RAISE EXCEPTION 'Invalid image URL scheme: only https:// or relative paths are permitted';
  ELSE
    -- Relative path
    v_path := v_normalized_url;
  END IF;

  -- Remove leading slash for uniform path validation
  v_path := ltrim(v_path, '/');

  -- Disallow path traversal, backslashes, percent-encoding, query strings or fragments
  IF v_path LIKE '%..%' OR v_path LIKE '%\%' OR v_path LIKE '%\%%' OR v_path LIKE '%?%' OR v_path LIKE '%#%' OR v_path LIKE '%//%' THEN
    RAISE EXCEPTION 'Listing image path contains illegal characters or traversal sequences';
  END IF;

  -- 3. Path structure & ownership validation: <owner_id>/photos/<fileName>
  v_url_owner_uuid := split_part(v_path, '/', 1);
  v_folder_segment := split_part(v_path, '/', 2);
  v_file_segment := substring(v_path FROM (char_length(v_url_owner_uuid) + char_length(v_folder_segment) + 3));

  -- Verify UUID matches listing owner (case-insensitive) - enforced for ALL users (no admin bypass)
  IF lower(v_url_owner_uuid) <> lower(v_owner_id::text) THEN
    RAISE EXCEPTION 'Listing image must belong to the listing owner public photos storage folder';
  END IF;

  -- Folder segment must be strictly 'photos'
  IF v_folder_segment <> 'photos' THEN
    RAISE EXCEPTION 'Listing image path must be in the photos folder (documents and vault are strictly forbidden)';
  END IF;

  -- Filename segment must not be empty and must have safe filename structure
  IF v_file_segment IS NULL OR char_length(TRIM(v_file_segment)) = 0 THEN
    RAISE EXCEPTION 'Listing image path is missing a file name';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.validate_listing_image_origin() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_listing_image_origin ON public.listing_images;
CREATE TRIGGER trg_validate_listing_image_origin
BEFORE INSERT OR UPDATE ON public.listing_images
FOR EACH ROW EXECUTE FUNCTION public.validate_listing_image_origin();

-- RLS for marketplace_listings
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketplace_listings_select_policy" ON public.marketplace_listings;
DROP POLICY IF EXISTS "marketplace_listings_anon_select_policy" ON public.marketplace_listings;
DROP POLICY IF EXISTS "marketplace_listings_auth_select_policy" ON public.marketplace_listings;

CREATE POLICY "marketplace_listings_anon_select_policy"
  ON public.marketplace_listings FOR SELECT
  TO anon
  USING (status = 'active');

CREATE POLICY "marketplace_listings_auth_select_policy"
  ON public.marketplace_listings FOR SELECT
  TO authenticated
  USING (status = 'active' OR auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "marketplace_listings_insert_policy" ON public.marketplace_listings;
CREATE POLICY "marketplace_listings_insert_policy"
  ON public.marketplace_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    status IN ('active', 'archived')
  );

DROP POLICY IF EXISTS "marketplace_listings_update_policy" ON public.marketplace_listings;
CREATE POLICY "marketplace_listings_update_policy"
  ON public.marketplace_listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "marketplace_listings_delete_policy" ON public.marketplace_listings;
CREATE POLICY "marketplace_listings_delete_policy"
  ON public.marketplace_listings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- RLS for listing_images
DROP POLICY IF EXISTS "listing_images_select_policy" ON public.listing_images;
DROP POLICY IF EXISTS "listing_images_anon_select_policy" ON public.listing_images;
DROP POLICY IF EXISTS "listing_images_auth_select_policy" ON public.listing_images;

CREATE POLICY "listing_images_anon_select_policy"
  ON public.listing_images FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_listings l
      WHERE l.id = listing_images.listing_id
        AND l.status = 'active'
    )
  );

CREATE POLICY "listing_images_auth_select_policy"
  ON public.listing_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_listings l
      WHERE l.id = listing_images.listing_id
        AND (l.status = 'active' OR l.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "listing_images_manage_policy" ON public.listing_images;
CREATE POLICY "listing_images_manage_policy"
  ON public.listing_images FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_listings l
      WHERE l.id = listing_images.listing_id 
        AND (l.user_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marketplace_listings l
      WHERE l.id = listing_images.listing_id 
        AND (l.user_id = auth.uid() OR public.is_admin())
    )
  );


-- ------------------------------------------------------------------------------
-- 4. SAVED LISTINGS (BOOKMARKS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_listings (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_listings_listing ON public.saved_listings(listing_id);

ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_listings_all_policy" ON public.saved_listings;
CREATE POLICY "saved_listings_all_policy"
  ON public.saved_listings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ------------------------------------------------------------------------------
-- 5. TRUST & SAFETY: USER BLOCKS & REPORTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT user_blocks_no_self_block CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(reason) >= 5 AND char_length(reason) <= 1000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'action_taken')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_reports_status ON public.user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_listing ON public.user_reports(listing_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_blocks_manage_policy" ON public.user_blocks;
CREATE POLICY "user_blocks_manage_policy"
  ON public.user_blocks FOR ALL
  TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "user_reports_select_policy" ON public.user_reports;
CREATE POLICY "user_reports_select_policy"
  ON public.user_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id OR public.is_admin());

DROP POLICY IF EXISTS "user_reports_insert_policy" ON public.user_reports;
CREATE POLICY "user_reports_insert_policy"
  ON public.user_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reporter_id AND
    status = 'pending' AND
    admin_notes IS NULL
  );

DROP POLICY IF EXISTS "user_reports_admin_update_policy" ON public.user_reports;
CREATE POLICY "user_reports_admin_update_policy"
  ON public.user_reports FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ------------------------------------------------------------------------------
-- 6. CONVERSATIONS & PEER-TO-PEER MESSAGES
-- ------------------------------------------------------------------------------
-- Conversations are preserved even if a listing is archived or deleted (listing_id ON DELETE SET NULL)
CREATE TABLE IF NOT EXISTS public.marketplace_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT marketplace_conv_diff_users CHECK (buyer_id <> seller_id),
  CONSTRAINT marketplace_conv_unique_buyer_listing UNIQUE (listing_id, buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_conv_seller ON public.marketplace_conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_conv_buyer ON public.marketplace_conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_conv_listing ON public.marketplace_conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_conv_last_msg ON public.marketplace_conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.marketplace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.marketplace_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_marketplace_messages_conv ON public.marketplace_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_marketplace_messages_sender ON public.marketplace_messages(sender_id);

ALTER TABLE public.marketplace_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS: Only participants may view
DROP POLICY IF EXISTS "marketplace_conv_select_policy" ON public.marketplace_conversations;
CREATE POLICY "marketplace_conv_select_policy"
  ON public.marketplace_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id OR public.is_admin());

-- Conversations RLS: Initiating conversations requires active listing and no block between parties
DROP POLICY IF EXISTS "marketplace_conv_insert_policy" ON public.marketplace_conversations;
CREATE POLICY "marketplace_conv_insert_policy"
  ON public.marketplace_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id AND
    buyer_id <> seller_id AND
    NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE (b.blocker_id = buyer_id AND b.blocked_id = seller_id)
         OR (b.blocker_id = seller_id AND b.blocked_id = buyer_id)
    ) AND
    EXISTS (
      SELECT 1 FROM public.marketplace_listings l
      WHERE l.id = listing_id 
        AND l.user_id = seller_id 
        AND l.status = 'active'
    )
  );

-- Messages RLS: Only participants may view messages
DROP POLICY IF EXISTS "marketplace_messages_select_policy" ON public.marketplace_messages;
CREATE POLICY "marketplace_messages_select_policy"
  ON public.marketplace_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_conversations c
      WHERE c.id = marketplace_messages.conversation_id
        AND (c.seller_id = auth.uid() OR c.buyer_id = auth.uid() OR public.is_admin())
    )
  );

-- Messages RLS: Only conversation participants may insert, provided no block is active
DROP POLICY IF EXISTS "marketplace_messages_insert_policy" ON public.marketplace_messages;
CREATE POLICY "marketplace_messages_insert_policy"
  ON public.marketplace_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.marketplace_conversations c
      WHERE c.id = conversation_id
        AND (c.seller_id = auth.uid() OR c.buyer_id = auth.uid())
        AND NOT EXISTS (
          SELECT 1 FROM public.user_blocks b
          WHERE (b.blocker_id = c.seller_id AND b.blocked_id = c.buyer_id)
             OR (b.blocker_id = c.buyer_id AND b.blocked_id = c.seller_id)
        )
    )
  );

-- Messages RLS: Recipient may mark messages as read
DROP POLICY IF EXISTS "marketplace_messages_update_read_policy" ON public.marketplace_messages;
CREATE POLICY "marketplace_messages_update_read_policy"
  ON public.marketplace_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_conversations c
      WHERE c.id = marketplace_messages.conversation_id
        AND (
          (c.seller_id = auth.uid() AND marketplace_messages.sender_id = c.buyer_id) OR
          (c.buyer_id = auth.uid() AND marketplace_messages.sender_id = c.seller_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marketplace_conversations c
      WHERE c.id = marketplace_messages.conversation_id
        AND (
          (c.seller_id = auth.uid() AND marketplace_messages.sender_id = c.buyer_id) OR
          (c.buyer_id = auth.uid() AND marketplace_messages.sender_id = c.seller_id)
        )
    )
  );

-- Protect message immutability: content, sender, and conversation can NEVER be altered on update
CREATE OR REPLACE FUNCTION public.protect_marketplace_message_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.content IS DISTINCT FROM OLD.content) OR
     (NEW.sender_id IS DISTINCT FROM OLD.sender_id) OR
     (NEW.conversation_id IS DISTINCT FROM OLD.conversation_id) OR
     (NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Message content, sender, and conversation are strictly immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.protect_marketplace_message_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_marketplace_message_fields ON public.marketplace_messages;
CREATE TRIGGER trg_protect_marketplace_message_fields
BEFORE UPDATE ON public.marketplace_messages
FOR EACH ROW EXECUTE FUNCTION public.protect_marketplace_message_fields();

-- Trigger: Automatically update conversation last_message_at timestamp
CREATE OR REPLACE FUNCTION public.handle_new_marketplace_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.marketplace_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.handle_new_marketplace_message() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_new_marketplace_message ON public.marketplace_messages;
CREATE TRIGGER trg_new_marketplace_message
AFTER INSERT ON public.marketplace_messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_marketplace_message();


-- ------------------------------------------------------------------------------
-- 7. STRUCTURED OFFERS & SECURE CONCURRENCY-SAFE STATE MACHINE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.marketplace_conversations(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_type public.listing_type NOT NULL,
  status public.offer_status NOT NULL DEFAULT 'pending',
  offered_price NUMERIC(12,2) CHECK (offered_price IS NULL OR offered_price >= 0),
  rental_start_date DATE,
  rental_end_date DATE,
  offered_item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  offered_item_description TEXT CHECK (offered_item_description IS NULL OR char_length(offered_item_description) <= 500),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT check_rental_dates CHECK (
    rental_start_date IS NULL OR rental_end_date IS NULL OR rental_end_date >= rental_start_date
  )
);

CREATE INDEX IF NOT EXISTS idx_marketplace_offers_conv ON public.marketplace_offers(conversation_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_listing ON public.marketplace_offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_sender ON public.marketplace_offers(sender_id);

ALTER TABLE public.marketplace_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketplace_offers_select_policy" ON public.marketplace_offers;
CREATE POLICY "marketplace_offers_select_policy"
  ON public.marketplace_offers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_conversations c
      WHERE c.id = marketplace_offers.conversation_id
        AND (c.seller_id = auth.uid() OR c.buyer_id = auth.uid() OR public.is_admin())
    )
  );

-- Offer insert: must be active listing, participant in conversation, and no blocks between parties
DROP POLICY IF EXISTS "marketplace_offers_insert_policy" ON public.marketplace_offers;
CREATE POLICY "marketplace_offers_insert_policy"
  ON public.marketplace_offers FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    status = 'pending' AND
    EXISTS (
      SELECT 1 FROM public.marketplace_listings l
      WHERE l.id = marketplace_offers.listing_id
        AND l.status = 'active'
    ) AND
    EXISTS (
      SELECT 1 FROM public.marketplace_conversations c
      WHERE c.id = conversation_id
        AND c.listing_id = marketplace_offers.listing_id
        AND (c.seller_id = auth.uid() OR c.buyer_id = auth.uid())
        AND NOT EXISTS (
          SELECT 1 FROM public.user_blocks b
          WHERE (b.blocker_id = c.seller_id AND b.blocked_id = c.buyer_id)
             OR (b.blocker_id = c.buyer_id AND b.blocked_id = c.seller_id)
        )
    )
  );

DROP POLICY IF EXISTS "marketplace_offers_update_policy" ON public.marketplace_offers;
CREATE POLICY "marketplace_offers_update_policy"
  ON public.marketplace_offers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_conversations c
      WHERE c.id = marketplace_offers.conversation_id
        AND (c.seller_id = auth.uid() OR c.buyer_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marketplace_conversations c
      WHERE c.id = marketplace_offers.conversation_id
        AND (c.seller_id = auth.uid() OR c.buyer_id = auth.uid() OR public.is_admin())
    )
  );

-- Enforce strict state transitions, immutability, and concurrency row locking
CREATE OR REPLACE FUNCTION public.validate_offer_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_id UUID;
  v_buyer_id UUID;
  v_current_listing_status public.listing_status;
BEGIN
  -- 0. Require authentication
  IF auth.uid() IS NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Authentication required to modify offers';
  END IF;

  -- 1. Immutable relational & audit fields check
  IF (NEW.conversation_id IS DISTINCT FROM OLD.conversation_id) OR
     (NEW.listing_id IS DISTINCT FROM OLD.listing_id) OR
     (NEW.sender_id IS DISTINCT FROM OLD.sender_id) OR
     (NEW.offer_type IS DISTINCT FROM OLD.offer_type) OR
     (NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Immutable offer fields cannot be modified';
  END IF;

  -- 2. Financial, date, and item terms are strictly immutable once created
  IF (NEW.offered_price IS DISTINCT FROM OLD.offered_price) OR
     (NEW.rental_start_date IS DISTINCT FROM OLD.rental_start_date) OR
     (NEW.rental_end_date IS DISTINCT FROM OLD.rental_end_date) OR
     (NEW.offered_item_id IS DISTINCT FROM OLD.offered_item_id) OR
     (NEW.offered_item_description IS DISTINCT FROM OLD.offered_item_description) THEN
    RAISE EXCEPTION 'Offer terms (price, dates, items) are immutable once created. Submit a new offer to negotiate.';
  END IF;

  -- Retrieve conversation participants
  SELECT seller_id, buyer_id INTO v_seller_id, v_buyer_id
  FROM public.marketplace_conversations
  WHERE id = OLD.conversation_id;

  IF v_seller_id IS NULL OR v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Associated conversation not found';
  END IF;

  -- 3. Note modification protection
  IF (NEW.note IS DISTINCT FROM OLD.note) THEN
    IF OLD.status <> 'pending' OR ((auth.uid() IS DISTINCT FROM OLD.sender_id) AND NOT public.is_admin()) THEN
      RAISE EXCEPTION 'Offer note can only be modified by the sender while pending';
    END IF;
  END IF;

  -- 4. State transition verification
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- A. Cancel offer
    IF NEW.status = 'cancelled' THEN
      IF OLD.status = 'pending' THEN
        IF (auth.uid() IS DISTINCT FROM OLD.sender_id) AND NOT public.is_admin() THEN
          RAISE EXCEPTION 'Only the offer sender can cancel a pending offer';
        END IF;
      ELSIF OLD.status = 'accepted' THEN
        IF (auth.uid() IS DISTINCT FROM v_seller_id AND auth.uid() IS DISTINCT FROM v_buyer_id) AND NOT public.is_admin() THEN
          RAISE EXCEPTION 'Only deal participants can cancel an accepted offer';
        END IF;

        -- Lock listing row to inspect and revert if still reserved
        SELECT status INTO v_current_listing_status
        FROM public.marketplace_listings
        WHERE id = OLD.listing_id
        FOR UPDATE;

        IF v_current_listing_status = 'reserved' THEN
          UPDATE public.marketplace_listings
          SET status = 'active', updated_at = timezone('utc'::text, now())
          WHERE id = OLD.listing_id;
        END IF;
      ELSE
        RAISE EXCEPTION 'Only pending or accepted offers can be cancelled';
      END IF;

    -- B. Accept or decline: only recipient (counterparty) can accept/decline
    ELSIF NEW.status IN ('accepted', 'declined') THEN
      IF OLD.status <> 'pending' THEN
        RAISE EXCEPTION 'Only pending offers can be accepted or declined';
      END IF;
      IF (auth.uid() IS NOT DISTINCT FROM OLD.sender_id) AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'The sender cannot accept or decline their own offer';
      END IF;
      IF (auth.uid() IS DISTINCT FROM v_seller_id AND auth.uid() IS DISTINCT FROM v_buyer_id) AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only the conversation recipient can accept or decline this offer';
      END IF;

      -- If accepting: lock listing row to serialize concurrent acceptances
      IF NEW.status = 'accepted' THEN
        SELECT status INTO v_current_listing_status
        FROM public.marketplace_listings
        WHERE id = OLD.listing_id
        FOR UPDATE;

        IF v_current_listing_status IS NULL THEN
          RAISE EXCEPTION 'Associated listing not found';
        END IF;

        IF v_current_listing_status <> 'active' THEN
          RAISE EXCEPTION 'Cannot accept offer: listing is currently % (must be active)', v_current_listing_status;
        END IF;

        -- Automatically transition listing status to 'reserved'
        UPDATE public.marketplace_listings
        SET status = 'reserved', updated_at = timezone('utc'::text, now())
        WHERE id = OLD.listing_id;
      END IF;

    -- C. Complete: only after accepted, deal participants can complete
    ELSIF NEW.status = 'completed' THEN
      IF OLD.status <> 'accepted' THEN
        RAISE EXCEPTION 'Only accepted offers can be completed';
      END IF;
      IF (auth.uid() IS DISTINCT FROM v_seller_id AND auth.uid() IS DISTINCT FROM v_buyer_id) AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only deal participants can complete this offer';
      END IF;

      -- Lock listing row and verify it is currently reserved
      SELECT status INTO v_current_listing_status
      FROM public.marketplace_listings
      WHERE id = OLD.listing_id
      FOR UPDATE;

      IF v_current_listing_status IS NULL THEN
        RAISE EXCEPTION 'Associated listing not found';
      END IF;

      IF v_current_listing_status <> 'reserved' THEN
        RAISE EXCEPTION 'Cannot complete offer: listing is currently % (must be reserved)', v_current_listing_status;
      END IF;

      -- Mark listing as completed
      UPDATE public.marketplace_listings
      SET status = 'completed', updated_at = timezone('utc'::text, now())
      WHERE id = OLD.listing_id;

    ELSE
      RAISE EXCEPTION 'Invalid offer status transition from % to %', OLD.status, NEW.status;
    END IF;
  END IF;

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.validate_offer_status_transition() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_offer_status ON public.marketplace_offers;
CREATE TRIGGER trg_validate_offer_status
BEFORE UPDATE ON public.marketplace_offers
FOR EACH ROW EXECUTE FUNCTION public.validate_offer_status_transition();


-- ------------------------------------------------------------------------------
-- 8. NOTIFICATIONS COMPATIBILITY & REALTIME PUBLICATION
-- ------------------------------------------------------------------------------
-- Allow 'marketplace' notification type dynamically and idempotently
DO $$ 
DECLARE
  v_constraint_name text;
BEGIN
  FOR v_constraint_name IN
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.notifications'::regclass 
      AND contype = 'c' 
      AND pg_get_constraintdef(oid) LIKE '%type%'
  LOOP
    EXECUTE 'ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS ' || quote_ident(v_constraint_name);
  END LOOP;

  ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('warranty', 'financing', 'repair', 'system', 'marketplace'));
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Add marketplace_enabled toggle in user_notification_settings
DO $$ BEGIN
  ALTER TABLE public.user_notification_settings 
    ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN NOT NULL DEFAULT true;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Enable Supabase Realtime publication for peer-to-peer messages safely
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'marketplace_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_messages;
    END IF;
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 9. EXPLICIT TABLE PRIVILEGES & LEAST-PRIVILEGE ROLE HARDENING
-- ------------------------------------------------------------------------------
-- Revoke all default/inherited privileges from the PUBLIC pseudo-role:
REVOKE ALL ON TABLE public.public_profiles FROM PUBLIC;
REVOKE ALL ON TABLE public.marketplace_listings FROM PUBLIC;
REVOKE ALL ON TABLE public.listing_images FROM PUBLIC;
REVOKE ALL ON TABLE public.saved_listings FROM PUBLIC;
REVOKE ALL ON TABLE public.user_blocks FROM PUBLIC;
REVOKE ALL ON TABLE public.user_reports FROM PUBLIC;
REVOKE ALL ON TABLE public.marketplace_conversations FROM PUBLIC;
REVOKE ALL ON TABLE public.marketplace_messages FROM PUBLIC;
REVOKE ALL ON TABLE public.marketplace_offers FROM PUBLIC;
REVOKE ALL ON TABLE public.items FROM PUBLIC;

-- Strictly deny anonymous access to all private marketplace and inventory tables:
REVOKE ALL ON TABLE public.saved_listings FROM anon;
REVOKE ALL ON TABLE public.user_blocks FROM anon;
REVOKE ALL ON TABLE public.user_reports FROM anon;
REVOKE ALL ON TABLE public.marketplace_conversations FROM anon;
REVOKE ALL ON TABLE public.marketplace_messages FROM anon;
REVOKE ALL ON TABLE public.marketplace_offers FROM anon;
REVOKE ALL ON TABLE public.items FROM anon;

-- Grant read-only access to anon exclusively on public marketplace entities (strictly filtered by RLS):
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.marketplace_listings TO anon;
GRANT SELECT ON public.listing_images TO anon;

-- Grant required table privileges to authenticated users (strictly constrained by RLS):
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.marketplace_listings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.listing_images TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.public_profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.saved_listings TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.user_blocks TO authenticated;
GRANT SELECT, INSERT ON TABLE public.user_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.marketplace_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.marketplace_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.marketplace_offers TO authenticated;

-- Ensure authenticated role can manage items under existing items_select_policy:
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.items TO authenticated;
