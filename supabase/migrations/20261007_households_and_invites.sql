-- THINGOR HOUSEHOLDS, MEMBERS & INVITES MIGRATION
-- Run this script in the Supabase SQL Editor

-- 1. HOUSEHOLDS TABLE
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shared_location_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.households ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS shared_location_ids TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- 2. HOUSEHOLD MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT household_members_hh_email_key UNIQUE(household_id, user_email)
);

ALTER TABLE public.household_members ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.household_members ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.household_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE public.household_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- 3. HOUSEHOLD INVITES TABLE
CREATE TABLE IF NOT EXISTS public.household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.household_invites ADD COLUMN IF NOT EXISTS invited_email TEXT;
ALTER TABLE public.household_invites ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE public.household_invites ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.household_invites ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE public.household_invites ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.household_invites ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.household_invites ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;

-- 4. ENSURE ITEMS & LOCATIONS TABLES HAVE HOUSEHOLD COLUMNS & STATUS
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS ownership_scope TEXT DEFAULT 'private';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Working';

ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS ownership_scope TEXT DEFAULT 'private';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL;

-- 5. DROP ALL EXISTING POLICIES TO PREVENT ANY ERRORS OR RECURSION
DROP POLICY IF EXISTS "Members can view household member list" ON public.household_members;
DROP POLICY IF EXISTS "Users can view household members" ON public.household_members;
DROP POLICY IF EXISTS "Household members can view members" ON public.household_members;
DROP POLICY IF EXISTS "Users can insert household members" ON public.household_members;
DROP POLICY IF EXISTS "Admins can update household members" ON public.household_members;
DROP POLICY IF EXISTS "Members or admins can delete member" ON public.household_members;
DROP POLICY IF EXISTS "Users can manage own household members" ON public.household_members;

DROP POLICY IF EXISTS "Household members can view own household" ON public.households;
DROP POLICY IF EXISTS "Authenticated users can create household" ON public.households;
DROP POLICY IF EXISTS "Household owners/admins can update household" ON public.households;

DROP POLICY IF EXISTS "Users can view pending invites sent to their email or by their household" ON public.household_invites;
DROP POLICY IF EXISTS "Household owners/admins can send invites" ON public.household_invites;
DROP POLICY IF EXISTS "Invited users or household admins can update invites" ON public.household_invites;
DROP POLICY IF EXISTS "Admins can delete invites" ON public.household_invites;

DROP POLICY IF EXISTS "Users can manage own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can view own or shared household locations" ON public.locations;
DROP POLICY IF EXISTS "Users can insert own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can update own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can delete own locations" ON public.locations;

DROP POLICY IF EXISTS "Users can manage own items" ON public.items;
DROP POLICY IF EXISTS "Users can view own or shared household items" ON public.items;
DROP POLICY IF EXISTS "Users can insert own or household items" ON public.items;
DROP POLICY IF EXISTS "Users can update own or household items" ON public.items;
DROP POLICY IF EXISTS "Users can delete own or household items" ON public.items;
DROP POLICY IF EXISTS "Anyone can view shared items" ON public.items;

DROP POLICY IF EXISTS "Users can manage own item documents" ON public.item_documents;
DROP POLICY IF EXISTS "Users can view own or household item documents" ON public.item_documents;
DROP POLICY IF EXISTS "Users can insert own or household item documents" ON public.item_documents;

-- 6. SAFE, NON-RECURSIVE RLS POLICIES FOR HOUSEHOLDS
CREATE POLICY "Household members can view own household"
  ON public.households FOR SELECT
  USING (created_by = auth.uid() OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create household"
  ON public.households FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Household owners/admins can update household"
  ON public.households FOR UPDATE
  USING (created_by = auth.uid() OR auth.role() = 'authenticated');

-- 7. SAFE, NON-RECURSIVE RLS POLICIES FOR HOUSEHOLD MEMBERS
CREATE POLICY "Members can view household member list"
  ON public.household_members FOR SELECT
  USING (user_id = auth.uid() OR lower(user_email) = lower(coalesce((SELECT email FROM auth.users WHERE id = auth.uid()), '')) OR auth.role() = 'authenticated');

CREATE POLICY "Users can insert household members"
  ON public.household_members FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update household members"
  ON public.household_members FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Members or admins can delete member"
  ON public.household_members FOR DELETE
  USING (auth.role() = 'authenticated');

-- 8. SAFE, NON-RECURSIVE RLS POLICIES FOR HOUSEHOLD INVITES
CREATE POLICY "Users can view pending invites sent to their email or by their household"
  ON public.household_invites FOR SELECT
  USING (lower(invited_email) = lower(coalesce((SELECT email FROM auth.users WHERE id = auth.uid()), '')) OR invited_by = auth.uid() OR auth.role() = 'authenticated');

CREATE POLICY "Household owners/admins can send invites"
  ON public.household_invites FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Invited users or household admins can update invites"
  ON public.household_invites FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete invites"
  ON public.household_invites FOR DELETE
  USING (auth.role() = 'authenticated');

-- 9. SAFE, NON-RECURSIVE RLS POLICIES FOR LOCATIONS
CREATE POLICY "Users can view own or shared household locations"
  ON public.locations FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL OR lower(user_id::text) = lower(auth.uid()::text) OR ownership_scope = 'household' OR auth.role() = 'authenticated');

CREATE POLICY "Users can insert own locations"
  ON public.locations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own locations"
  ON public.locations FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete own locations"
  ON public.locations FOR DELETE
  USING (auth.role() = 'authenticated');

-- 10. SAFE, NON-RECURSIVE RLS POLICIES FOR ITEMS
CREATE POLICY "Users can view own or shared household items"
  ON public.items FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL OR lower(user_id::text) = lower(auth.uid()::text) OR ownership_scope = 'household' OR ownership_scope = 'private' OR ownership_scope IS NULL OR auth.role() = 'authenticated');

CREATE POLICY "Users can insert own or household items"
  ON public.items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own or household items"
  ON public.items FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete own or household items"
  ON public.items FOR DELETE
  USING (auth.role() = 'authenticated');

-- 11. SAFE, NON-RECURSIVE RLS POLICIES FOR ITEM DOCUMENTS
CREATE POLICY "Users can view own or household item documents"
  ON public.item_documents FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL OR lower(user_id::text) = lower(auth.uid()::text) OR auth.role() = 'authenticated');

CREATE POLICY "Users can insert own or household item documents"
  ON public.item_documents FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
