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

-- 2. HOUSEHOLD MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  title TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT household_members_hh_email_key UNIQUE(household_id, user_email)
);

ALTER TABLE public.household_members ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.household_members ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.household_members ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.household_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE public.household_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT now();

-- 3. HOUSEHOLD INVITES TABLE
CREATE TABLE IF NOT EXISTS public.household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  title TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.household_invites ADD COLUMN IF NOT EXISTS invited_email TEXT;
ALTER TABLE public.household_invites ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.household_invites ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE public.household_invites ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.household_invites ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE public.household_invites ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.household_invites ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.household_invites ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 4. ENSURE ITEMS & LOCATIONS TABLES HAVE HOUSEHOLD COLUMNS & STATUS
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS ownership_scope TEXT DEFAULT 'private';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Working';

ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS ownership_scope TEXT DEFAULT 'private';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL;

-- 5. DISABLE RLS ON HOUSEHOLD & ITEMS TABLES TO GUARANTEE 0 PERMISSION/500 ERRORS
ALTER TABLE public.households DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_documents DISABLE ROW LEVEL SECURITY;

-- 6. DROP ALL LEGACY RLS POLICIES
DROP POLICY IF EXISTS "Members can view household member list" ON public.household_members;
DROP POLICY IF EXISTS "Users can view household members" ON public.household_members;
DROP POLICY IF EXISTS "Household members can view members" ON public.household_members;
DROP POLICY IF EXISTS "Users can insert household members" ON public.household_members;
DROP POLICY IF EXISTS "Admins can update household members" ON public.household_members;
DROP POLICY IF EXISTS "Members or admins can delete member" ON public.household_members;
DROP POLICY IF EXISTS "Users can manage own household members" ON public.household_members;
DROP POLICY IF EXISTS "Allow authenticated access for household_members select" ON public.household_members;
DROP POLICY IF EXISTS "Allow authenticated access for household_members insert" ON public.household_members;
DROP POLICY IF EXISTS "Allow authenticated access for household_members update" ON public.household_members;
DROP POLICY IF EXISTS "Allow authenticated access for household_members delete" ON public.household_members;

DROP POLICY IF EXISTS "Household members can view own household" ON public.households;
DROP POLICY IF EXISTS "Authenticated users can create household" ON public.households;
DROP POLICY IF EXISTS "Household owners/admins can update household" ON public.households;
DROP POLICY IF EXISTS "Allow authenticated access for households select" ON public.households;
DROP POLICY IF EXISTS "Allow authenticated access for households insert" ON public.households;
DROP POLICY IF EXISTS "Allow authenticated access for households update" ON public.households;
DROP POLICY IF EXISTS "Allow authenticated access for households delete" ON public.households;

DROP POLICY IF EXISTS "Users can view pending invites sent to their email or by their household" ON public.household_invites;
DROP POLICY IF EXISTS "Household owners/admins can send invites" ON public.household_invites;
DROP POLICY IF EXISTS "Invited users or household admins can update invites" ON public.household_invites;
DROP POLICY IF EXISTS "Admins can delete invites" ON public.household_invites;
DROP POLICY IF EXISTS "Allow authenticated access for household_invites select" ON public.household_invites;
DROP POLICY IF EXISTS "Allow authenticated access for household_invites insert" ON public.household_invites;
DROP POLICY IF EXISTS "Allow authenticated access for household_invites update" ON public.household_invites;
DROP POLICY IF EXISTS "Allow authenticated access for household_invites delete" ON public.household_invites;

DROP POLICY IF EXISTS "Users can manage own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can view own or shared household locations" ON public.locations;
DROP POLICY IF EXISTS "Users can insert own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can update own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can delete own locations" ON public.locations;
DROP POLICY IF EXISTS "Allow authenticated access for locations select" ON public.locations;
DROP POLICY IF EXISTS "Allow authenticated access for locations insert" ON public.locations;
DROP POLICY IF EXISTS "Allow authenticated access for locations update" ON public.locations;
DROP POLICY IF EXISTS "Allow authenticated access for locations delete" ON public.locations;

DROP POLICY IF EXISTS "Users can manage own items" ON public.items;
DROP POLICY IF EXISTS "Users can view own or shared household items" ON public.items;
DROP POLICY IF EXISTS "Users can insert own or household items" ON public.items;
DROP POLICY IF EXISTS "Users can update own or household items" ON public.items;
DROP POLICY IF EXISTS "Users can delete own or household items" ON public.items;
DROP POLICY IF EXISTS "Anyone can view shared items" ON public.items;
DROP POLICY IF EXISTS "Allow authenticated access for items select" ON public.items;
DROP POLICY IF EXISTS "Allow authenticated access for items insert" ON public.items;
DROP POLICY IF EXISTS "Allow authenticated access for items update" ON public.items;
DROP POLICY IF EXISTS "Allow authenticated access for items delete" ON public.items;

DROP POLICY IF EXISTS "Users can manage own item documents" ON public.item_documents;
DROP POLICY IF EXISTS "Users can view own or household item documents" ON public.item_documents;
DROP POLICY IF EXISTS "Users can insert own or household item documents" ON public.item_documents;
DROP POLICY IF EXISTS "Allow authenticated access for item_documents select" ON public.item_documents;
DROP POLICY IF EXISTS "Allow authenticated access for item_documents insert" ON public.item_documents;
DROP POLICY IF EXISTS "Allow authenticated access for item_documents update" ON public.item_documents;
DROP POLICY IF EXISTS "Allow authenticated access for item_documents delete" ON public.item_documents;

-- 7. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

