-- ==========================================================
-- Migration: 20261016_security_and_household_fixes.sql
-- Description: 
--   1. SEC-01: Harden items_select_policy so is_vault_protected items cannot leak metadata to household members.
--   2. SEC-03: Harden prevent_household_role_escalation trigger to protect allowed_location_ids and allowed_category_ids.
--   3. HH-04: Fix households_delete_policy to accept both created_by and owner_id.
--   4. Phase 3 prep: Add sharing_mode, allowed_modules, and excluded_item_ids columns to household_members.
--
-- Rollback commands:
--   - Revert items_select_policy to 20261011 version without the is_vault_protected guard.
--   - Revert prevent_household_role_escalation trigger to 20261012 version.
--   - Revert households_delete_policy to created_by = auth.uid().
--   - ALTER TABLE public.household_members DROP COLUMN IF EXISTS sharing_mode, DROP COLUMN IF EXISTS allowed_modules, DROP COLUMN IF EXISTS excluded_item_ids;
-- ==========================================================

-- 1. SEC-01: VAULT ISOLATION ON ITEMS & ITEM_DOCUMENTS RLS
DROP POLICY IF EXISTS "items_select_policy" ON public.items;
CREATE POLICY "items_select_policy" ON public.items 
FOR SELECT USING (
  public.is_admin() OR
  user_id = auth.uid() OR
  (
    -- Strict vault barrier: vault protected items are NEVER accessible via household sharing
    (is_vault_protected IS NOT TRUE OR user_id = auth.uid()) AND
    (
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
    )
  )
);

DROP POLICY IF EXISTS "item_documents_select_policy" ON public.item_documents;
CREATE POLICY "item_documents_select_policy"
  ON public.item_documents FOR SELECT
  USING (
    public.is_admin() OR
    user_id = auth.uid() OR
    (
      (is_vault_protected IS NOT TRUE OR user_id = auth.uid()) AND
      EXISTS (
        SELECT 1 FROM public.items
        WHERE items.id = item_documents.item_id
          AND (items.is_vault_protected IS NOT TRUE OR items.user_id = auth.uid())
          AND (
            items.user_id = auth.uid() OR
            (items.household_id IS NOT NULL AND items.household_id IN (SELECT household_id FROM public.get_my_household_ids())) OR
            public.can_access_shared_item(items.household_id, items.user_id, items.location_id, items.category_id)
          )
      )
    )
  );

-- 2. SEC-03: PREVENT PRIVILEGE ESCALATION ON MEMBER PERMISSIONS
CREATE OR REPLACE FUNCTION public.prevent_household_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only global admin or existing household admin/owner can alter member roles, allowed_location_ids, or allowed_category_ids
  IF NOT (public.is_admin() OR public.is_household_admin(OLD.household_id)) THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Jogosulatlan művelet: Csak háztartás-adminisztrátor módosíthatja a tagsági szerepköröket!';
    END IF;
    IF NEW.allowed_location_ids IS DISTINCT FROM OLD.allowed_location_ids THEN
      RAISE EXCEPTION 'Jogosulatlan művelet: Csak háztartás-adminisztrátor módosíthatja az engedélyezett helyszíneket!';
    END IF;
    IF NEW.allowed_category_ids IS DISTINCT FROM OLD.allowed_category_ids THEN
      RAISE EXCEPTION 'Jogosulatlan művelet: Csak háztartás-adminisztrátor módosíthatja az engedélyezett kategóriákat!';
    END IF;
    IF NEW.sharing_mode IS DISTINCT FROM OLD.sharing_mode THEN
      RAISE EXCEPTION 'Jogosulatlan művelet: Csak háztartás-adminisztrátor módosíthatja a megosztási módot!';
    END IF;
    IF NEW.allowed_modules IS DISTINCT FROM OLD.allowed_modules THEN
      RAISE EXCEPTION 'Jogosulatlan művelet: Csak háztartás-adminisztrátor módosíthatja az engedélyezett modulokat!';
    END IF;
    IF NEW.excluded_item_ids IS DISTINCT FROM OLD.excluded_item_ids THEN
      RAISE EXCEPTION 'Jogosulatlan művelet: Csak háztartás-adminisztrátor módosíthatja a kizárt tárgyakat!';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. HH-04: HOUSEHOLDS DELETE POLICY HARDENING
DROP POLICY IF EXISTS "households_delete_policy" ON public.households;
CREATE POLICY "households_delete_policy" ON public.households
FOR DELETE USING (
  public.is_admin() OR
  created_by = auth.uid() OR
  owner_id = auth.uid()
);

-- 4. PHASE 3 PREPARATION: GRANULAR PER-MEMBER SHARING COLUMNS
ALTER TABLE public.household_members 
  ADD COLUMN IF NOT EXISTS sharing_mode TEXT DEFAULT 'all' CHECK (sharing_mode IN ('all', 'custom')),
  ADD COLUMN IF NOT EXISTS allowed_modules JSONB DEFAULT '{"inventory": true, "documents": true, "pantry": true, "lending": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS excluded_item_ids TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 5. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
