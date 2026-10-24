-- ==============================================================================
-- THINGOR STAGING BASE SCHEMA INITIALIZATION
-- Target: thingor-staging (yxycdwyveetrujrnjgjm)
-- Description: Establishes the foundational database schema in strict dependency order,
-- resolving circular and forward references present in the legacy schema snapshot.
-- 
-- PREREQUISITES & EXECUTION ORDER:
-- 1. Run THIS script first on the clean staging database.
-- 2. Then run the migrations in supabase/migrations/ sequentially (20261004 through 20261023).
-- 3. Finally, run 20261024_social_marketplace_schema.sql.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ------------------------------------------------------------------------------
-- 2. CORE PROFILES & AUTHENTICATION FOUNDATION
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Admin check helper function (SECURITY DEFINER with fixed search_path)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Conditional stub for legacy rls_auto_enable function
-- Preserves existing event_trigger function (ensure_rls trigger) on staging/production,
-- and creates a dormant void stub ONLY in fresh environments where the function does not exist,
-- ensuring that REVOKE EXECUTE in 20261008_audit_fixes_and_indexes.sql line 16 succeeds.
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_proc p 
    JOIN pg_namespace n ON n.oid = p.pronamespace 
    WHERE n.nspname = 'public' 
      AND p.proname = 'rls_auto_enable' 
      AND p.pronargs = 0
  ) THEN
    EXECUTE $stmt$
      CREATE FUNCTION public.rls_auto_enable()
      RETURNS void AS $f$ BEGIN NULL; END; $f$
      LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
    $stmt$;
  END IF;
END $$;

-- Auto-create profile trigger on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'user',
    'active'
  )
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Privilege escalation guard trigger (protects role and status on UPDATE and INSERT)
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If not an active admin, do not allow setting or changing role or status
  IF NOT public.is_admin() THEN
    IF TG_OP = 'UPDATE' THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Jogosulatlan művelet: Saját szerepkör (role) módosítása tilos!';
      END IF;
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Jogosulatlan művelet: Saját fiókstátusz (status) módosítása tilos!';
      END IF;
    ELSIF TG_OP = 'INSERT' THEN
      IF NEW.role IS DISTINCT FROM 'user' THEN
        RAISE EXCEPTION 'Jogosulatlan művelet: Új profil csak user szerepkörrel hozható létre!';
      END IF;
      IF NEW.status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Jogosulatlan művelet: Új profil csak active státusszal hozható létre!';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;

-- Profiles RLS Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update user profiles" ON public.profiles;
CREATE POLICY "Admins can update user profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND COALESCE(role, 'user') = 'user'
    AND COALESCE(status, 'active') = 'active'
  );

DROP POLICY IF EXISTS "Admins can insert user profiles" ON public.profiles;
CREATE POLICY "Admins can insert user profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());


-- ------------------------------------------------------------------------------
-- 3. CATEGORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view default and own categories" ON public.categories;
CREATE POLICY "Users can view default and own categories"
  ON public.categories FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own custom categories" ON public.categories;
CREATE POLICY "Users can insert own custom categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own custom categories" ON public.categories;
CREATE POLICY "Users can update own custom categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own custom categories" ON public.categories;
CREATE POLICY "Users can delete own custom categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);

-- Insert Default Categories
INSERT INTO public.categories (name, user_id, is_custom) VALUES
  ('Electronics', NULL, FALSE),
  ('Tools', NULL, FALSE),
  ('Home', NULL, FALSE),
  ('Garden', NULL, FALSE),
  ('Vehicles', NULL, FALSE),
  ('Sports', NULL, FALSE),
  ('Books', NULL, FALSE),
  ('Collectibles', NULL, FALSE),
  ('Clothing', NULL, FALSE),
  ('Appliances', NULL, FALSE),
  ('Other', NULL, FALSE)
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------------------------
-- 4. HOUSEHOLDS, MEMBERS & INVITES (ORDER FIX: Created before Locations and Items)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shared_location_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  title TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  allowed_location_ids TEXT[] DEFAULT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT household_members_hh_email_key UNIQUE(household_id, user_email)
);

ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;

-- Helper functions for non-recursive household authorization
CREATE OR REPLACE FUNCTION public.get_my_household_ids()
RETURNS TABLE (household_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT hm.household_id 
  FROM public.household_members hm
  WHERE hm.user_id = auth.uid()
     OR (hm.user_email IS NOT NULL AND lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', '')))
  UNION
  SELECT h.id AS household_id
  FROM public.households h
  WHERE h.created_by = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp STABLE;

CREATE OR REPLACE FUNCTION public.is_household_member(check_household_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = check_household_id
      AND (
        user_id = auth.uid() 
        OR (user_email IS NOT NULL AND lower(user_email) = lower(COALESCE(auth.jwt()->>'email', '')))
      )
  ) OR EXISTS (
    SELECT 1 FROM public.households
    WHERE id = check_household_id AND created_by = auth.uid()
  ) OR public.is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp STABLE;

CREATE OR REPLACE FUNCTION public.is_household_admin(check_household_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = check_household_id
      AND (
        user_id = auth.uid() 
        OR (user_email IS NOT NULL AND lower(user_email) = lower(COALESCE(auth.jwt()->>'email', '')))
      )
      AND role IN ('owner', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.households
    WHERE id = check_household_id AND created_by = auth.uid()
  ) OR public.is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp STABLE;

CREATE OR REPLACE FUNCTION public.is_any_household_member()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.household_members
    WHERE user_id = auth.uid() OR lower(user_email) = lower(COALESCE(auth.jwt()->>'email', ''))
  ) OR public.is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp STABLE;

-- RLS Policies for Households
DROP POLICY IF EXISTS "Household members can view own household" ON public.households;
CREATE POLICY "Household members can view own household"
  ON public.households FOR SELECT
  USING (
    created_by = auth.uid() OR
    id IN (SELECT household_id FROM public.get_my_household_ids())
  );

DROP POLICY IF EXISTS "Authenticated users can create household" ON public.households;
CREATE POLICY "Authenticated users can create household"
  ON public.households FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Household owners/admins can update household" ON public.households;
CREATE POLICY "Household owners/admins can update household"
  ON public.households FOR UPDATE
  USING (public.is_household_admin(id));

-- RLS Policies for Household Members
DROP POLICY IF EXISTS "Members can view household member list" ON public.household_members;
CREATE POLICY "Members can view household member list"
  ON public.household_members FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM public.get_my_household_ids()) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Users can insert household members" ON public.household_members;
CREATE POLICY "Users can insert household members"
  ON public.household_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    public.is_household_admin(household_id)
  );

DROP POLICY IF EXISTS "Admins can update household members" ON public.household_members;
CREATE POLICY "Admins can update household members"
  ON public.household_members FOR UPDATE
  USING (public.is_household_admin(household_id));

DROP POLICY IF EXISTS "Members or admins can delete member" ON public.household_members;
CREATE POLICY "Members or admins can delete member"
  ON public.household_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    public.is_household_admin(household_id)
  );

-- RLS Policies for Household Invites
DROP POLICY IF EXISTS "Users can view pending invites sent to their email or by their household" ON public.household_invites;
CREATE POLICY "Users can view pending invites sent to their email or by their household"
  ON public.household_invites FOR SELECT
  USING (
    LOWER(invited_email) = LOWER(auth.jwt()->>'email') OR
    household_id IN (SELECT household_id FROM public.get_my_household_ids())
  );

DROP POLICY IF EXISTS "Household owners/admins can send invites" ON public.household_invites;
CREATE POLICY "Household owners/admins can send invites"
  ON public.household_invites FOR INSERT
  WITH CHECK (
    invited_by = auth.uid() AND
    public.is_household_admin(household_id)
  );

DROP POLICY IF EXISTS "Invited users or household admins can update invites" ON public.household_invites;
CREATE POLICY "Invited users or household admins can update invites"
  ON public.household_invites FOR UPDATE
  USING (
    LOWER(invited_email) = LOWER(auth.jwt()->>'email') OR
    public.is_household_admin(household_id)
  );

DROP POLICY IF EXISTS "Admins can delete invites" ON public.household_invites;
CREATE POLICY "Admins can delete invites"
  ON public.household_invites FOR DELETE
  USING (
    invited_by = auth.uid() OR
    public.is_household_admin(household_id)
  );


-- ------------------------------------------------------------------------------
-- 5. LOCATIONS TABLE (Households already exists, so FKs resolve cleanly)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  ownership_scope TEXT NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own or shared household locations" ON public.locations;
CREATE POLICY "Users can view own or shared household locations"
  ON public.locations FOR SELECT
  USING (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND household_id IN (SELECT household_id FROM public.get_my_household_ids())) OR
    id::text IN (
      SELECT unnest(shared_location_ids) FROM public.households
      WHERE id IN (SELECT household_id FROM public.get_my_household_ids())
    )
  );

DROP POLICY IF EXISTS "Users can insert own locations" ON public.locations;
CREATE POLICY "Users can insert own locations"
  ON public.locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own locations" ON public.locations;
CREATE POLICY "Users can update own locations"
  ON public.locations FOR UPDATE
  USING (
    auth.uid() = user_id OR
    (household_id IS NOT NULL AND public.is_household_admin(household_id))
  );

DROP POLICY IF EXISTS "Users can delete own locations" ON public.locations;
CREATE POLICY "Users can delete own locations"
  ON public.locations FOR DELETE
  USING (auth.uid() = user_id);


-- ------------------------------------------------------------------------------
-- 6. ITEMS TABLE (Categories, Locations, and Households all exist)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  photo_url TEXT,
  additional_photos TEXT[] DEFAULT '{}',
  purchase_date DATE,
  purchase_price NUMERIC(10, 2),
  current_value NUMERIC(10, 2),
  store_seller TEXT,
  condition TEXT NOT NULL DEFAULT 'Good',
  status TEXT DEFAULT 'Working',
  ownership_scope TEXT DEFAULT 'private',
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  is_vault_protected BOOLEAN NOT NULL DEFAULT false,
  is_lendable BOOLEAN NOT NULL DEFAULT false,
  lending_terms TEXT,
  warranty_start DATE,
  warranty_end DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own or shared household items" ON public.items;
CREATE POLICY "Users can view own or shared household items"
  ON public.items FOR SELECT
  USING (
    user_id = auth.uid() OR
    (ownership_scope = 'household' AND household_id IN (SELECT household_id FROM public.get_my_household_ids())) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Users can insert own or household items" ON public.items;
CREATE POLICY "Users can insert own or household items"
  ON public.items FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    (household_id IS NOT NULL AND household_id IN (SELECT household_id FROM public.get_my_household_ids()))
  );

DROP POLICY IF EXISTS "Users can update own or household items" ON public.items;
CREATE POLICY "Users can update own or household items"
  ON public.items FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND household_id IN (SELECT household_id FROM public.get_my_household_ids())) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Users can delete own or household items" ON public.items;
CREATE POLICY "Users can delete own or household items"
  ON public.items FOR DELETE
  USING (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_admin(household_id)) OR
    public.is_admin()
  );


-- ------------------------------------------------------------------------------
-- 7. ITEM DOCUMENTS & ITEM SHARES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.item_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT,
  document_type TEXT NOT NULL DEFAULT 'Other',
  is_vault_protected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.item_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own or household item documents" ON public.item_documents;
CREATE POLICY "Users can view own or household item documents"
  ON public.item_documents FOR SELECT
  USING (
    user_id = auth.uid() OR
    (NOT is_vault_protected AND EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_documents.item_id
        AND items.household_id IN (SELECT household_id FROM public.get_my_household_ids())
    )) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Users can insert own or household item documents" ON public.item_documents;
CREATE POLICY "Users can insert own or household item documents"
  ON public.item_documents FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_documents.item_id
        AND items.household_id IN (SELECT household_id FROM public.get_my_household_ids())
    )
  );

DROP POLICY IF EXISTS "Users can delete own item documents" ON public.item_documents;
CREATE POLICY "Users can delete own item documents"
  ON public.item_documents FOR DELETE
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

-- Item Shares
CREATE TABLE IF NOT EXISTS public.item_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL DEFAULT 'view' CHECK (purpose IN ('view', 'sale', 'loan')),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  permissions JSONB NOT NULL DEFAULT '{"include_purchase_date": false, "include_warranty": false, "include_value": false, "include_purchase_price": false, "include_additional_images": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.item_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own item shares" ON public.item_shares;
CREATE POLICY "Users can manage own item shares"
  ON public.item_shares FOR ALL
  USING (auth.uid() = created_by OR public.is_admin())
  WITH CHECK (auth.uid() = created_by OR public.is_admin());

-- Guests must access shared items exclusively via the secure public.get_shared_item(TEXT) RPC.
-- Broad table-level SELECT on item_shares is dropped to prevent bulk enumeration of share tokens.
DROP POLICY IF EXISTS "Anyone can view active valid item shares" ON public.item_shares;

-- Secure guest RPC function for reading shared items
CREATE OR REPLACE FUNCTION public.get_shared_item(share_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_share RECORD;
  v_item RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_share
  FROM public.item_shares
  WHERE token = share_token
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_item
  FROM public.items
  WHERE id = v_share.item_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_result := jsonb_build_object(
    'share_id', v_share.id,
    'purpose', v_share.purpose,
    'expires_at', v_share.expires_at,
    'permissions', v_share.permissions,
    'created_at', v_share.created_at,
    'item_id', v_item.id,
    'name', v_item.name,
    'description', v_item.description,
    'condition', v_item.condition,
    'photo_url', v_item.photo_url
  );

  IF (v_share.permissions->>'include_additional_images')::boolean = true THEN
    v_result := jsonb_set(v_result, '{additional_photos}', to_jsonb(v_item.additional_photos));
  END IF;

  IF (v_share.permissions->>'include_purchase_date')::boolean = true THEN
    v_result := jsonb_set(v_result, '{purchase_date}', to_jsonb(v_item.purchase_date));
  END IF;

  IF (v_share.permissions->>'include_warranty')::boolean = true THEN
    v_result := jsonb_set(v_result, '{warranty_start}', to_jsonb(v_item.warranty_start));
    v_result := jsonb_set(v_result, '{warranty_end}', to_jsonb(v_item.warranty_end));
  END IF;

  IF (v_share.permissions->>'include_value')::boolean = true THEN
    v_result := jsonb_set(v_result, '{current_value}', to_jsonb(v_item.current_value));
  END IF;

  IF (v_share.permissions->>'include_purchase_price')::boolean = true THEN
    v_result := jsonb_set(v_result, '{purchase_price}', to_jsonb(v_item.purchase_price));
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_shared_item(TEXT) TO anon, authenticated;

-- Allow guest view on items with valid share tokens
DROP POLICY IF EXISTS "Anyone can view shared items" ON public.items;
CREATE POLICY "Anyone can view shared items"
  ON public.items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.item_shares
      WHERE item_shares.item_id = items.id
        AND item_shares.revoked_at IS NULL
        AND (item_shares.expires_at IS NULL OR item_shares.expires_at > NOW())
    )
  );


-- ------------------------------------------------------------------------------
-- 8. INVENTORY SUBMODULES (Item Relations, Quick Notes, Repairs, Financings)
-- ------------------------------------------------------------------------------
-- Item Relations
CREATE TABLE IF NOT EXISTS public.item_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  target_item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.item_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view relations of their items" ON public.item_relations;
CREATE POLICY "Users can view relations of their items"
  ON public.item_relations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_relations.source_item_id
        AND (items.user_id = auth.uid() OR items.household_id IN (SELECT household_id FROM public.get_my_household_ids()))
    )
  );

DROP POLICY IF EXISTS "Users can insert relations of their items" ON public.item_relations;
CREATE POLICY "Users can insert relations of their items"
  ON public.item_relations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_relations.source_item_id
        AND items.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete relations of their items" ON public.item_relations;
CREATE POLICY "Users can delete relations of their items"
  ON public.item_relations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_relations.source_item_id
        AND items.user_id = auth.uid()
    )
  );

-- Quick Notes
CREATE TABLE IF NOT EXISTS public.quick_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  location_hint TEXT,
  tags TEXT[] DEFAULT '{}',
  is_converted BOOLEAN DEFAULT false,
  converted_item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.quick_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own quick notes" ON public.quick_notes;
CREATE POLICY "Users can manage own quick notes"
  ON public.quick_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Item Repairs
CREATE TABLE IF NOT EXISTS public.item_repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  fault_title TEXT NOT NULL,
  fault_description TEXT,
  is_warranty BOOLEAN DEFAULT false,
  labor_cost NUMERIC(10, 2),
  parts_cost NUMERIC(10, 2),
  expected_completion DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.item_repairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage repairs of their items" ON public.item_repairs;
CREATE POLICY "Users can manage repairs of their items"
  ON public.item_repairs FOR ALL
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_repairs.item_id
        AND items.household_id IN (SELECT household_id FROM public.get_my_household_ids())
    )
  );

-- Item Financings
CREATE TABLE IF NOT EXISTS public.item_financings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  original_price NUMERIC(10, 2) NOT NULL,
  down_payment NUMERIC(10, 2) DEFAULT 0,
  financed_amount NUMERIC(10, 2) NOT NULL,
  monthly_installment NUMERIC(10, 2) NOT NULL,
  total_installments INTEGER NOT NULL,
  paid_installments INTEGER DEFAULT 0,
  remaining_installments INTEGER NOT NULL,
  remaining_debt NUMERIC(10, 2) NOT NULL,
  start_date DATE,
  end_date DATE,
  next_payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.item_financings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage financings of their items" ON public.item_financings;
CREATE POLICY "Users can manage financings of their items"
  ON public.item_financings FOR ALL
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_financings.item_id
        AND items.household_id IN (SELECT household_id FROM public.get_my_household_ids())
    )
  );


-- ------------------------------------------------------------------------------
-- 9. SYSTEM & ADMINISTRATION
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  site_name TEXT NOT NULL DEFAULT 'Thingor',
  hero_title TEXT NOT NULL DEFAULT 'Személyes leltár, tárgy- és dokumentumkezelő',
  hero_subtitle TEXT DEFAULT 'Rendszerezd, dokumentáld és oszd meg értékeidet biztonságosan.',
  announcement TEXT,
  registration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  maintenance_message TEXT DEFAULT 'A rendszer jelenleg karbantartás alatt áll. Kérjük, látogass vissza később.',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view site_settings" ON public.site_settings;
CREATE POLICY "Anyone can view site_settings"
  ON public.site_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update site_settings" ON public.site_settings;
CREATE POLICY "Admins can update site_settings"
  ON public.site_settings FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert site_settings" ON public.site_settings;
CREATE POLICY "Admins can insert site_settings"
  ON public.site_settings FOR INSERT
  WITH CHECK (public.is_admin());

INSERT INTO public.site_settings (id, site_name)
VALUES ('default', 'Thingor')
ON CONFLICT (id) DO NOTHING;

-- Admin Audit Logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  WITH CHECK (public.is_admin());


-- ------------------------------------------------------------------------------
-- 10. STORAGE BUCKET CONFIGURATION (Thingor Assets)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('thingor-assets', 'thingor-assets', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own storage files" ON storage.objects;
CREATE POLICY "Users can upload own storage files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'thingor-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view own storage files" ON storage.objects;
CREATE POLICY "Users can view own storage files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thingor-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own storage files" ON storage.objects;
CREATE POLICY "Users can delete own storage files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'thingor-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
