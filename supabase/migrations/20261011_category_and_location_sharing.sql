-- ==========================================================
-- Migration: 20261011_category_and_location_sharing.sql
-- Description: Enable folder/location and category sharing for households and members
--              with strict multi-tenant isolation, NULL inheritance semantics,
--              and read-only access preservation.
-- ==========================================================

-- 1. SCHEMA EXTENSIONS
ALTER TABLE public.households 
  ADD COLUMN IF NOT EXISTS shared_category_ids TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.household_members 
  ADD COLUMN IF NOT EXISTS allowed_category_ids TEXT[] DEFAULT NULL;

-- 2. SECURITY DEFINER HELPER FUNCTIONS

-- 2.1. can_access_shared_item
CREATE OR REPLACE FUNCTION public.can_access_shared_item(
  p_item_household_id UUID,
  p_item_user_id UUID,
  p_item_location_id UUID,
  p_item_category_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT := lower(COALESCE(auth.jwt()->>'email', ''));
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.household_members hm
    JOIN public.households h ON h.id = hm.household_id
    WHERE (
      hm.user_id = v_user_id 
      OR (hm.user_email IS NOT NULL AND lower(hm.user_email) = v_user_email)
    )
    -- MULTI-TENANT PROVENANCE: item must belong to this household or a member/owner of this household
    AND (
      (p_item_household_id IS NOT NULL AND p_item_household_id = h.id)
      OR (p_item_user_id IS NOT NULL AND (
        p_item_user_id = h.created_by
        OR (h.owner_id IS NOT NULL AND p_item_user_id = h.owner_id)
        OR EXISTS (
          SELECT 1 FROM public.household_members hm_owner
          WHERE hm_owner.household_id = h.id AND hm_owner.user_id = p_item_user_id
        )
      ))
    )
    -- PERMISSIONS: Location OR Category match
    AND (
      (
        p_item_location_id IS NOT NULL
        AND (
          p_item_location_id::text = ANY(
            COALESCE(hm.allowed_location_ids, h.shared_location_ids, ARRAY[]::text[])
          )
          OR EXISTS (
            SELECT 1 FROM public.locations loc
            WHERE loc.id = p_item_location_id
              AND loc.parent_id::text = ANY(
                COALESCE(hm.allowed_location_ids, h.shared_location_ids, ARRAY[]::text[])
              )
          )
        )
      )
      OR
      (
        p_item_category_id IS NOT NULL
        AND p_item_category_id::text = ANY(
          COALESCE(hm.allowed_category_ids, h.shared_category_ids, ARRAY[]::text[])
        )
      )
    )
  );
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION public.can_access_shared_item(uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_shared_item(uuid, uuid, uuid, uuid) TO authenticated;

-- 2.2. can_access_shared_location
CREATE OR REPLACE FUNCTION public.can_access_shared_location(
  p_location_id UUID,
  p_location_user_id UUID,
  p_location_household_id UUID,
  p_location_parent_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT := lower(COALESCE(auth.jwt()->>'email', ''));
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.household_members hm
    JOIN public.households h ON h.id = hm.household_id
    WHERE (
      hm.user_id = v_user_id 
      OR (hm.user_email IS NOT NULL AND lower(hm.user_email) = v_user_email)
    )
    AND (
      (p_location_household_id IS NOT NULL AND p_location_household_id = h.id)
      OR (p_location_user_id IS NOT NULL AND (
        p_location_user_id = h.created_by
        OR (h.owner_id IS NOT NULL AND p_location_user_id = h.owner_id)
        OR EXISTS (
          SELECT 1 FROM public.household_members hm_owner
          WHERE hm_owner.household_id = h.id AND hm_owner.user_id = p_location_user_id
        )
      ))
    )
    AND (
      p_location_id::text = ANY(
        COALESCE(hm.allowed_location_ids, h.shared_location_ids, ARRAY[]::text[])
      )
      OR (
        p_location_parent_id IS NOT NULL
        AND p_location_parent_id::text = ANY(
          COALESCE(hm.allowed_location_ids, h.shared_location_ids, ARRAY[]::text[])
        )
      )
    )
  );
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION public.can_access_shared_location(uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_shared_location(uuid, uuid, uuid, uuid) TO authenticated;

-- 2.3. can_access_shared_category
CREATE OR REPLACE FUNCTION public.can_access_shared_category(
  p_category_id UUID,
  p_category_user_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT := lower(COALESCE(auth.jwt()->>'email', ''));
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_category_user_id IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.household_members hm
    JOIN public.households h ON h.id = hm.household_id
    WHERE (
      hm.user_id = v_user_id 
      OR (hm.user_email IS NOT NULL AND lower(hm.user_email) = v_user_email)
    )
    AND (
      p_category_user_id = h.created_by
      OR (h.owner_id IS NOT NULL AND p_category_user_id = h.owner_id)
      OR EXISTS (
        SELECT 1 FROM public.household_members hm_owner
        WHERE hm_owner.household_id = h.id AND hm_owner.user_id = p_category_user_id
      )
    )
    AND p_category_id::text = ANY(
      COALESCE(hm.allowed_category_ids, h.shared_category_ids, ARRAY[]::text[])
    )
  );
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION public.can_access_shared_category(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_shared_category(uuid, uuid) TO authenticated;

-- 3. RLS POLICIES UPDATE

-- 3.1. items_select_policy
ALTER POLICY "items_select_policy" ON public.items USING (
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
  ) OR
  public.can_access_shared_item(household_id, user_id, location_id, category_id)
);

-- 3.2. locations_select_policy
ALTER POLICY "locations_select_policy" ON public.locations USING (
  public.is_admin() OR
  user_id = auth.uid() OR
  (household_id IS NOT NULL AND household_id IN (SELECT household_id FROM public.get_my_household_ids())) OR
  public.can_access_shared_location(id, user_id, household_id, parent_id)
);

-- 3.3. categories_select_policy
ALTER POLICY "Users can view default and own categories" ON public.categories USING (
  (user_id IS NULL) OR
  (auth.uid() = user_id) OR
  public.can_access_shared_category(id, user_id)
);

-- 4. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
