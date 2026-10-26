-- Migration: 20261026_fix_marketplace_relationships_and_location.sql
-- Description:
-- 1. Relax location_region constraint in marketplace_listings (allow NULL, set default 'Országos / Foxpost')
-- 2. Add foreign key relationships from marketplace tables to public.public_profiles so PostgREST resolves seller/buyer relationships
-- 3. Notify PostgREST to reload schema cache

-- 1. location_region relaxation
ALTER TABLE public.marketplace_listings
  ALTER COLUMN location_region DROP NOT NULL;

ALTER TABLE public.marketplace_listings
  ALTER COLUMN location_region SET DEFAULT 'Országos / Foxpost';

ALTER TABLE public.marketplace_listings
  DROP CONSTRAINT IF EXISTS marketplace_listings_location_region_check;

ALTER TABLE public.marketplace_listings
  ADD CONSTRAINT marketplace_listings_location_region_check
  CHECK (location_region IS NULL OR (char_length(location_region) >= 2 AND char_length(location_region) <= 100));

-- 2. Ensure all existing users in auth.users have a public_profiles row
INSERT INTO public.public_profiles (user_id, display_name)
SELECT id, COALESCE(NULLIF(TRIM(raw_user_meta_data->>'full_name'), ''), 'Felhasználó')
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 3. Add explicit foreign keys to public.public_profiles for PostgREST schema cache
ALTER TABLE public.marketplace_listings
  DROP CONSTRAINT IF EXISTS marketplace_listings_seller_id_fkey,
  DROP CONSTRAINT IF EXISTS marketplace_listings_user_id_fkey;

ALTER TABLE public.marketplace_listings
  ADD CONSTRAINT marketplace_listings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.public_profiles(user_id) ON DELETE CASCADE,
  ADD CONSTRAINT marketplace_listings_seller_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.public_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.marketplace_conversations
  DROP CONSTRAINT IF EXISTS marketplace_conversations_seller_profile_fkey,
  DROP CONSTRAINT IF EXISTS marketplace_conversations_buyer_profile_fkey,
  DROP CONSTRAINT IF EXISTS marketplace_conversations_seller_id_fkey,
  DROP CONSTRAINT IF EXISTS marketplace_conversations_buyer_id_fkey;

ALTER TABLE public.marketplace_conversations
  ADD CONSTRAINT marketplace_conversations_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES public.public_profiles(user_id) ON DELETE CASCADE,
  ADD CONSTRAINT marketplace_conversations_buyer_id_fkey
  FOREIGN KEY (buyer_id) REFERENCES public.public_profiles(user_id) ON DELETE CASCADE,
  ADD CONSTRAINT marketplace_conversations_seller_profile_fkey
  FOREIGN KEY (seller_id) REFERENCES public.public_profiles(user_id) ON DELETE CASCADE,
  ADD CONSTRAINT marketplace_conversations_buyer_profile_fkey
  FOREIGN KEY (buyer_id) REFERENCES public.public_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.marketplace_offers
  DROP CONSTRAINT IF EXISTS marketplace_offers_sender_profile_fkey,
  DROP CONSTRAINT IF EXISTS marketplace_offers_sender_id_fkey;

ALTER TABLE public.marketplace_offers
  ADD CONSTRAINT marketplace_offers_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.public_profiles(user_id) ON DELETE CASCADE,
  ADD CONSTRAINT marketplace_offers_sender_profile_fkey
  FOREIGN KEY (sender_id) REFERENCES public.public_profiles(user_id) ON DELETE CASCADE;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
