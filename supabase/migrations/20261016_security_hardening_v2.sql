-- ============================================================================
-- THINGOR BIZTONSÁGI ÉS JOGOSULTSÁG-SZIGORÍTÁSI MIGRÁCIÓ (V2)
-- ============================================================================

-- 1. SEC-04 & INV-03: household_members_insert_policy (Admin bypass nélkül, szigorú ön-beszúrás)
DROP POLICY IF EXISTS household_members_insert_policy ON public.household_members;

CREATE POLICY household_members_insert_policy ON public.household_members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Kizárólag a hitelesített felhasználó saját magát szúrhatja be:
    auth.uid() = user_id
    AND lower(user_email) = lower(COALESCE(auth.jwt()->>'email', ''))
    AND (
      -- 1. ág: Új háztartás létrehozásakor a létrehozó beszúrhatja saját magát owner szerepkörrel:
      (
        role = 'owner'
        AND EXISTS (
          SELECT 1 FROM public.households h
          WHERE h.id = household_members.household_id
            AND (h.created_by = auth.uid() OR h.owner_id = auth.uid())
        )
      )
      OR
      -- 2. ág: Meghívó elfogadásakor: érvényes, nem lejárt, pending meghívó és egyező role kötelező:
      (
        EXISTS (
          SELECT 1 FROM public.household_invites hi
          WHERE hi.household_id = household_members.household_id
            AND lower(hi.invited_email) = lower(COALESCE(auth.jwt()->>'email', ''))
            AND hi.status = 'pending'
            AND (hi.expires_at IS NULL OR hi.expires_at > now())
            AND household_members.role = hi.role
        )
      )
    )
  );

-- 2. INV-03: household_invites_update_policy (Kizárólag a meghívott általi elfogadás/elutasítás)
DROP POLICY IF EXISTS household_invites_update_policy ON public.household_invites;

CREATE POLICY household_invites_update_policy ON public.household_invites
  FOR UPDATE TO authenticated
  USING (
    lower(invited_email) = lower(COALESCE(auth.jwt()->>'email', ''))
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  )
  WITH CHECK (
    lower(invited_email) = lower(COALESCE(auth.jwt()->>'email', ''))
    AND (expires_at IS NULL OR expires_at > now())
    AND status IN ('accepted', 'declined')
  );

-- 3. INT-03 & FLW-01: can_access_shared_item (Szigorú household_id kötés, 5 paraméteres szignatúra)
DROP FUNCTION IF EXISTS public.can_access_shared_item(UUID, UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION public.can_access_shared_item(
  p_item_id UUID,
  p_item_household_id UUID,
  p_item_user_id UUID,
  p_item_location_id UUID,
  p_item_category_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
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

  -- 1. Saját tárgyához a tulajdonos mindig hozzáfér
  IF p_item_user_id = v_user_id THEN
    RETURN TRUE;
  END IF;

  -- 2. Szigorú háztartási kötés: ha nincs háztartáshoz rendelve a tárgy, háztartási szinten nem érhető el!
  IF p_item_household_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 3. A megtekintőnek tagnak kell lennie PONTOSAN a tárgyhoz tartozó háztartásban:
  RETURN EXISTS (
    SELECT 1
    FROM public.household_members hm
    JOIN public.households h ON h.id = hm.household_id
    WHERE hm.household_id = p_item_household_id
      AND (
        hm.user_id = v_user_id 
        OR (hm.user_email IS NOT NULL AND lower(hm.user_email) = v_user_email)
      )
      -- Modul ellenőrzés: ha az inventory modul tiltva van ('false'), nincs hozzáférés
      AND ((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)
      -- Kizárt tárgy ellenőrzés: ha az adott tárgy ID szerepel a tiltólistán, nincs hozzáférés
      AND NOT (p_item_id IS NOT NULL AND p_item_id::text = ANY(COALESCE(hm.excluded_item_ids, ARRAY[]::text[])))
      -- Megosztási mód:
      AND (
        -- 'all' vagy NULL: teljes megosztás
        COALESCE(hm.sharing_mode, 'all') = 'all'
        OR
        -- 'custom': engedélyezett helyszín (vagy alhelyszín) VAGY kategória szükséges
        (
          hm.sharing_mode = 'custom'
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
        )
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_shared_item(UUID, UUID, UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_shared_item(UUID, UUID, UUID, UUID, UUID) TO authenticated, service_role;

-- 4. INT-03: items_select_policy szigorítása (Bypass és item_shares szivárgás megszüntetése)
DROP POLICY IF EXISTS items_select_policy ON public.items;

CREATE POLICY items_select_policy ON public.items
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR
    (
      is_vault_protected IS NOT TRUE
      AND household_id IS NOT NULL
      AND can_access_shared_item(id, household_id, user_id, location_id, category_id)
    )
  );

-- 5. INT-03: item_documents_select_policy szigorítása (Dokumentum bypass megszüntetése, modulvédelem)
DROP POLICY IF EXISTS item_documents_select_policy ON public.item_documents;

CREATE POLICY item_documents_select_policy ON public.item_documents
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR user_id = auth.uid()
    OR (
      is_vault_protected IS NOT TRUE
      AND EXISTS (
        SELECT 1 FROM public.items
        WHERE items.id = item_documents.item_id
          AND items.is_vault_protected IS NOT TRUE
          AND items.household_id IS NOT NULL
          AND can_access_shared_item(items.id, items.household_id, items.user_id, items.location_id, items.category_id)
          AND EXISTS (
            SELECT 1 FROM public.household_members hm
            WHERE hm.household_id = items.household_id
              AND (hm.user_id = auth.uid() OR (hm.user_id IS NULL AND lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', ''))))
              AND ((hm.allowed_modules->>'documents')::boolean IS NOT FALSE)
          )
      )
    )
  );

-- 6. FLW-01: pantry_items_select_policy modul-ellenőrzés
DROP POLICY IF EXISTS pantry_items_select_policy ON public.pantry_items;

CREATE POLICY pantry_items_select_policy ON public.pantry_items
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin()
    OR (
      household_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.household_members hm
        WHERE hm.household_id = pantry_items.household_id
          AND (hm.user_id = auth.uid() OR (hm.user_id IS NULL AND lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', ''))))
          AND ((hm.allowed_modules->>'pantry')::boolean IS NOT FALSE)
      )
    )
  );
