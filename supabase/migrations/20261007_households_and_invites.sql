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

-- 5. SECURITY DEFINER HELPER FUNCTION TO PREVENT RLS INFINITE RECURSION
CREATE OR REPLACE FUNCTION public.is_household_member(check_household_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = check_household_id
      AND (
        user_id = auth.uid() OR
        (auth.jwt()->>'email' IS NOT NULL AND lower(user_email) = lower(auth.jwt()->>'email'))
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_household_member(UUID) TO authenticated, anon, service_role;

-- RLS POLICIES FOR HOUSEHOLDS
DROP POLICY IF EXISTS "Household members can view own household" ON public.households;
CREATE POLICY "Household members can view own household"
  ON public.households FOR SELECT
  USING (
    created_by = auth.uid() OR
    public.is_household_member(id)
  );

DROP POLICY IF EXISTS "Authenticated users can create household" ON public.households;
CREATE POLICY "Authenticated users can create household"
  ON public.households FOR INSERT
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

DROP POLICY IF EXISTS "Household owners/admins can update household" ON public.households;
CREATE POLICY "Household owners/admins can update household"
  ON public.households FOR UPDATE
  USING (
    created_by = auth.uid() OR
    public.is_household_member(id)
  );

-- RLS POLICIES FOR HOUSEHOLD MEMBERS
DROP POLICY IF EXISTS "Members can view household member list" ON public.household_members;
CREATE POLICY "Members can view household member list"
  ON public.household_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    lower(user_email) = lower(auth.jwt()->>'email') OR
    public.is_household_member(household_id)
  );

DROP POLICY IF EXISTS "Users can insert household members" ON public.household_members;
CREATE POLICY "Users can insert household members"
  ON public.household_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    lower(user_email) = lower(auth.jwt()->>'email') OR
    public.is_household_member(household_id) OR
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Admins can update household members" ON public.household_members;
CREATE POLICY "Admins can update household members"
  ON public.household_members FOR UPDATE
  USING (
    user_id = auth.uid() OR
    lower(user_email) = lower(auth.jwt()->>'email') OR
    public.is_household_member(household_id)
  );

DROP POLICY IF EXISTS "Members or admins can delete member" ON public.household_members;
CREATE POLICY "Members or admins can delete member"
  ON public.household_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    lower(user_email) = lower(auth.jwt()->>'email') OR
    public.is_household_member(household_id)
  );

-- RLS POLICIES FOR HOUSEHOLD INVITES
DROP POLICY IF EXISTS "Users can view pending invites sent to their email or by their household" ON public.household_invites;
CREATE POLICY "Users can view pending invites sent to their email or by their household"
  ON public.household_invites FOR SELECT
  USING (
    lower(invited_email) = lower(auth.jwt()->>'email') OR
    invited_by = auth.uid() OR
    public.is_household_member(household_id)
  );

DROP POLICY IF EXISTS "Household owners/admins can send invites" ON public.household_invites;
CREATE POLICY "Household owners/admins can send invites"
  ON public.household_invites FOR INSERT
  WITH CHECK (
    invited_by = auth.uid() OR
    public.is_household_member(household_id)
  );

DROP POLICY IF EXISTS "Invited users or household admins can update invites" ON public.household_invites;
CREATE POLICY "Invited users or household admins can update invites"
  ON public.household_invites FOR UPDATE
  USING (
    lower(invited_email) = lower(auth.jwt()->>'email') OR
    invited_by = auth.uid() OR
    public.is_household_member(household_id)
  );

DROP POLICY IF EXISTS "Admins can delete invites" ON public.household_invites;
CREATE POLICY "Admins can delete invites"
  ON public.household_invites FOR DELETE
  USING (
    invited_by = auth.uid() OR
    public.is_household_member(household_id)
  );

-- RLS POLICIES FOR LOCATIONS
DROP POLICY IF EXISTS "Users can manage own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can view own or shared household locations" ON public.locations;
DROP POLICY IF EXISTS "Users can insert own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can update own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can delete own locations" ON public.locations;

CREATE POLICY "Users can view own or shared household locations"
  ON public.locations FOR SELECT
  USING (
    user_id = auth.uid() OR
    user_id IS NULL OR
    lower(user_id::text) = lower(auth.uid()::text) OR
    ownership_scope = 'household' OR
    public.is_household_member(household_id) OR
    id::text IN (
      SELECT unnest(shared_location_ids) FROM public.households
    ) OR
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE user_id = auth.uid() OR lower(user_email) = lower(auth.jwt()->>'email')
    )
  );

CREATE POLICY "Users can insert own locations"
  ON public.locations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    lower(user_id::text) = lower(auth.uid()::text) OR
    user_id IS NULL OR
    public.is_household_member(household_id)
  );

CREATE POLICY "Users can update own locations"
  ON public.locations FOR UPDATE
  USING (
    auth.uid() = user_id OR
    lower(user_id::text) = lower(auth.uid()::text) OR
    user_id IS NULL OR
    public.is_household_member(household_id)
  );

CREATE POLICY "Users can delete own locations"
  ON public.locations FOR DELETE
  USING (
    auth.uid() = user_id OR
    lower(user_id::text) = lower(auth.uid()::text) OR
    public.is_household_member(household_id)
  );

-- RLS POLICIES FOR ITEMS
DROP POLICY IF EXISTS "Users can manage own items" ON public.items;
DROP POLICY IF EXISTS "Users can view own or shared household items" ON public.items;
DROP POLICY IF EXISTS "Users can insert own or household items" ON public.items;
DROP POLICY IF EXISTS "Users can update own or household items" ON public.items;
DROP POLICY IF EXISTS "Users can delete own or household items" ON public.items;

CREATE POLICY "Users can view own or shared household items"
  ON public.items FOR SELECT
  USING (
    user_id = auth.uid() OR
    user_id IS NULL OR
    lower(user_id::text) = lower(auth.uid()::text) OR
    ownership_scope = 'household' OR
    ownership_scope = 'private' OR
    ownership_scope IS NULL OR
    public.is_household_member(household_id) OR
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE user_id = auth.uid() OR lower(user_email) = lower(auth.jwt()->>'email')
    ) OR
    EXISTS (
      SELECT 1 FROM public.item_shares
      WHERE item_shares.item_id = items.id
        AND item_shares.revoked_at IS NULL
        AND (item_shares.expires_at IS NULL OR item_shares.expires_at > NOW())
    )
  );

CREATE POLICY "Users can insert own or household items"
  ON public.items FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    lower(user_id::text) = lower(auth.uid()::text) OR
    user_id IS NULL OR
    public.is_household_member(household_id) OR
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE user_id = auth.uid() OR lower(user_email) = lower(auth.jwt()->>'email')
    )
  );

CREATE POLICY "Users can update own or household items"
  ON public.items FOR UPDATE
  USING (
    user_id = auth.uid() OR
    lower(user_id::text) = lower(auth.uid()::text) OR
    user_id IS NULL OR
    ownership_scope = 'household' OR
    ownership_scope = 'private' OR
    ownership_scope IS NULL OR
    public.is_household_member(household_id) OR
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE user_id = auth.uid() OR lower(user_email) = lower(auth.jwt()->>'email')
    )
  );

CREATE POLICY "Users can delete own or household items"
  ON public.items FOR DELETE
  USING (
    user_id = auth.uid() OR
    lower(user_id::text) = lower(auth.uid()::text) OR
    ownership_scope = 'household' OR
    ownership_scope = 'private' OR
    public.is_household_member(household_id) OR
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE user_id = auth.uid() OR lower(user_email) = lower(auth.jwt()->>'email')
    )
  );

-- RLS POLICIES FOR ITEM DOCUMENTS
DROP POLICY IF EXISTS "Users can manage own item documents" ON public.item_documents;
DROP POLICY IF EXISTS "Users can view own or household item documents" ON public.item_documents;
DROP POLICY IF EXISTS "Users can insert own or household item documents" ON public.item_documents;

CREATE POLICY "Users can view own or household item documents"
  ON public.item_documents FOR SELECT
  USING (
    user_id = auth.uid() OR
    user_id IS NULL OR
    lower(user_id::text) = lower(auth.uid()::text) OR
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_documents.item_id
    )
  );

CREATE POLICY "Users can insert own or household item documents"
  ON public.item_documents FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    user_id IS NULL OR
    lower(user_id::text) = lower(auth.uid()::text) OR
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_documents.item_id
    )
  );
