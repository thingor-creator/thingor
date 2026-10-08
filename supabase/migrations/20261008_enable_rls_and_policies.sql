-- MIGRATION: 20261008_enable_rls_and_policies.sql
-- Enables Row Level Security (RLS) on households, household_members, household_invites, locations, items, and item_documents
-- with non-recursive, performant SECURITY DEFINER helper functions.

-- 1. DROP EXISTING FUNCTIONS TO ALLOW PARAMETER NAME/SIGNATURE UPDATES
DROP FUNCTION IF EXISTS public.is_household_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_household_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_my_household_ids() CASCADE;

-- 2. HELPER FUNCTIONS (SECURITY DEFINER to prevent recursion)
CREATE OR REPLACE FUNCTION public.get_my_household_ids()
RETURNS TABLE (household_id UUID)
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
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
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_household_member(check_household_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
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
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_household_admin(check_household_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
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
$$ LANGUAGE plpgsql;


-- 3. HOUSEHOLDS TABLE RLS
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "households_select_policy" ON public.households;
DROP POLICY IF EXISTS "households_insert_policy" ON public.households;
DROP POLICY IF EXISTS "households_update_policy" ON public.households;
DROP POLICY IF EXISTS "households_delete_policy" ON public.households;
DROP POLICY IF EXISTS "Household members can view own household" ON public.households;
DROP POLICY IF EXISTS "Authenticated users can create household" ON public.households;
DROP POLICY IF EXISTS "Household owners/admins can update household" ON public.households;

CREATE POLICY "households_select_policy"
  ON public.households FOR SELECT
  USING (
    public.is_admin() OR
    created_by = auth.uid() OR
    id IN (SELECT household_id FROM public.get_my_household_ids())
  );

CREATE POLICY "households_insert_policy"
  ON public.households FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
  );

CREATE POLICY "households_update_policy"
  ON public.households FOR UPDATE
  USING (
    public.is_admin() OR
    created_by = auth.uid() OR
    public.is_household_admin(id)
  )
  WITH CHECK (
    public.is_admin() OR
    created_by = auth.uid() OR
    public.is_household_admin(id)
  );

CREATE POLICY "households_delete_policy"
  ON public.households FOR DELETE
  USING (
    public.is_admin() OR
    created_by = auth.uid()
  );


-- 4. HOUSEHOLD MEMBERS TABLE RLS
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "household_members_select_policy" ON public.household_members;
DROP POLICY IF EXISTS "household_members_insert_policy" ON public.household_members;
DROP POLICY IF EXISTS "household_members_update_policy" ON public.household_members;
DROP POLICY IF EXISTS "household_members_delete_policy" ON public.household_members;
DROP POLICY IF EXISTS "Members can view household member list" ON public.household_members;
DROP POLICY IF EXISTS "Users can view household members" ON public.household_members;
DROP POLICY IF EXISTS "Household members can view members" ON public.household_members;
DROP POLICY IF EXISTS "Users can insert household members" ON public.household_members;
DROP POLICY IF EXISTS "Admins can update household members" ON public.household_members;
DROP POLICY IF EXISTS "Members or admins can delete member" ON public.household_members;

CREATE POLICY "household_members_select_policy"
  ON public.household_members FOR SELECT
  USING (
    public.is_admin() OR
    user_id = auth.uid() OR
    (user_email IS NOT NULL AND lower(user_email) = lower(COALESCE(auth.jwt()->>'email', ''))) OR
    household_id IN (SELECT household_id FROM public.get_my_household_ids())
  );

CREATE POLICY "household_members_insert_policy"
  ON public.household_members FOR INSERT
  WITH CHECK (
    public.is_admin() OR
    public.is_household_admin(household_id) OR
    (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.households WHERE id = household_id AND created_by = auth.uid())) OR
    (auth.uid() = user_id AND (
      lower(user_email) = lower(COALESCE(auth.jwt()->>'email', '')) OR
      EXISTS (SELECT 1 FROM public.household_invites WHERE household_id = household_members.household_id AND lower(invited_email) = lower(COALESCE(auth.jwt()->>'email', '')) AND status = 'pending')
    ))
  );

CREATE POLICY "household_members_update_policy"
  ON public.household_members FOR UPDATE
  USING (
    public.is_admin() OR
    public.is_household_admin(household_id) OR
    user_id = auth.uid()
  )
  WITH CHECK (
    public.is_admin() OR
    public.is_household_admin(household_id) OR
    user_id = auth.uid()
  );

CREATE POLICY "household_members_delete_policy"
  ON public.household_members FOR DELETE
  USING (
    public.is_admin() OR
    public.is_household_admin(household_id) OR
    (user_id = auth.uid() AND role != 'owner')
  );


-- 5. HOUSEHOLD INVITES TABLE RLS
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "household_invites_select_policy" ON public.household_invites;
DROP POLICY IF EXISTS "household_invites_insert_policy" ON public.household_invites;
DROP POLICY IF EXISTS "household_invites_update_policy" ON public.household_invites;
DROP POLICY IF EXISTS "household_invites_delete_policy" ON public.household_invites;

CREATE POLICY "household_invites_select_policy"
  ON public.household_invites FOR SELECT
  USING (
    public.is_admin() OR
    lower(invited_email) = lower(COALESCE(auth.jwt()->>'email', '')) OR
    invited_by = auth.uid() OR
    household_id IN (SELECT household_id FROM public.get_my_household_ids()) OR
    (status = 'pending' AND (expires_at IS NULL OR expires_at > now()))
  );

CREATE POLICY "household_invites_insert_policy"
  ON public.household_invites FOR INSERT
  WITH CHECK (
    public.is_admin() OR
    public.is_household_admin(household_id)
  );

CREATE POLICY "household_invites_update_policy"
  ON public.household_invites FOR UPDATE
  USING (
    public.is_admin() OR
    public.is_household_admin(household_id) OR
    lower(invited_email) = lower(COALESCE(auth.jwt()->>'email', ''))
  )
  WITH CHECK (
    public.is_admin() OR
    public.is_household_admin(household_id) OR
    lower(invited_email) = lower(COALESCE(auth.jwt()->>'email', ''))
  );

CREATE POLICY "household_invites_delete_policy"
  ON public.household_invites FOR DELETE
  USING (
    public.is_admin() OR
    public.is_household_admin(household_id)
  );


-- 6. LOCATIONS TABLE RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "locations_select_policy" ON public.locations;
DROP POLICY IF EXISTS "locations_insert_policy" ON public.locations;
DROP POLICY IF EXISTS "locations_update_policy" ON public.locations;
DROP POLICY IF EXISTS "locations_delete_policy" ON public.locations;
DROP POLICY IF EXISTS "Users can manage own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can view own or shared household locations" ON public.locations;
DROP POLICY IF EXISTS "Users can insert own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can update own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can delete own locations" ON public.locations;

CREATE POLICY "locations_select_policy"
  ON public.locations FOR SELECT
  USING (
    public.is_admin() OR
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND household_id IN (SELECT household_id FROM public.get_my_household_ids())) OR
    id::text IN (
      SELECT unnest(shared_location_ids) 
      FROM public.households 
      WHERE id IN (SELECT household_id FROM public.get_my_household_ids())
    )
  );

CREATE POLICY "locations_insert_policy"
  ON public.locations FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      user_id = auth.uid() OR
      (household_id IS NOT NULL AND household_id IN (SELECT household_id FROM public.get_my_household_ids()))
    )
  );

CREATE POLICY "locations_update_policy"
  ON public.locations FOR UPDATE
  USING (
    public.is_admin() OR
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_admin(household_id))
  )
  WITH CHECK (
    public.is_admin() OR
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_admin(household_id))
  );

CREATE POLICY "locations_delete_policy"
  ON public.locations FOR DELETE
  USING (
    public.is_admin() OR
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_admin(household_id))
  );


-- 7. ITEMS TABLE RLS
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "items_select_policy" ON public.items;
DROP POLICY IF EXISTS "items_insert_policy" ON public.items;
DROP POLICY IF EXISTS "items_update_policy" ON public.items;
DROP POLICY IF EXISTS "items_delete_policy" ON public.items;
DROP POLICY IF EXISTS "Users can manage own items" ON public.items;
DROP POLICY IF EXISTS "Users can view own or shared household items" ON public.items;
DROP POLICY IF EXISTS "Users can insert own or household items" ON public.items;
DROP POLICY IF EXISTS "Users can update own or household items" ON public.items;
DROP POLICY IF EXISTS "Users can delete own or household items" ON public.items;

CREATE POLICY "items_select_policy"
  ON public.items FOR SELECT
  USING (
    public.is_admin() OR
    user_id = auth.uid() OR
    (
      (ownership_scope = 'household' OR household_id IS NOT NULL) AND
      household_id IN (SELECT household_id FROM public.get_my_household_ids())
    ) OR
    EXISTS (
      SELECT 1 FROM public.item_shares
      WHERE item_shares.item_id = items.id
        AND item_shares.revoked_at IS NULL
        AND (item_shares.expires_at IS NULL OR item_shares.expires_at > now())
    )
  );

CREATE POLICY "items_insert_policy"
  ON public.items FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      user_id = auth.uid() OR
      (household_id IS NOT NULL AND household_id IN (SELECT household_id FROM public.get_my_household_ids()))
    )
  );

CREATE POLICY "items_update_policy"
  ON public.items FOR UPDATE
  USING (
    public.is_admin() OR
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND household_id IN (SELECT household_id FROM public.get_my_household_ids()))
  )
  WITH CHECK (
    public.is_admin() OR
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND household_id IN (SELECT household_id FROM public.get_my_household_ids()))
  );

CREATE POLICY "items_delete_policy"
  ON public.items FOR DELETE
  USING (
    public.is_admin() OR
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_admin(household_id))
  );


-- 8. ITEM DOCUMENTS TABLE RLS
ALTER TABLE public.item_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "item_documents_select_policy" ON public.item_documents;
DROP POLICY IF EXISTS "item_documents_insert_policy" ON public.item_documents;
DROP POLICY IF EXISTS "item_documents_update_policy" ON public.item_documents;
DROP POLICY IF EXISTS "item_documents_delete_policy" ON public.item_documents;
DROP POLICY IF EXISTS "Users can manage own item documents" ON public.item_documents;
DROP POLICY IF EXISTS "Users can view own or household item documents" ON public.item_documents;
DROP POLICY IF EXISTS "Users can insert own or household item documents" ON public.item_documents;

CREATE POLICY "item_documents_select_policy"
  ON public.item_documents FOR SELECT
  USING (
    public.is_admin() OR
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_documents.item_id
        AND (
          items.user_id = auth.uid() OR
          (items.household_id IS NOT NULL AND items.household_id IN (SELECT household_id FROM public.get_my_household_ids()))
        )
    )
  );

CREATE POLICY "item_documents_insert_policy"
  ON public.item_documents FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.items
        WHERE items.id = item_documents.item_id
          AND (
            items.user_id = auth.uid() OR
            (items.household_id IS NOT NULL AND items.household_id IN (SELECT household_id FROM public.get_my_household_ids()))
          )
      )
    )
  );

CREATE POLICY "item_documents_update_policy"
  ON public.item_documents FOR UPDATE
  USING (
    public.is_admin() OR
    user_id = auth.uid()
  )
  WITH CHECK (
    public.is_admin() OR
    user_id = auth.uid()
  );

CREATE POLICY "item_documents_delete_policy"
  ON public.item_documents FOR DELETE
  USING (
    public.is_admin() OR
    user_id = auth.uid()
  );

-- 9. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
