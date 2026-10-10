-- MIGRATION: 20261010_fix_viewer_role_rls.sql
-- Description: Restrict UPDATE and DELETE permissions on items table so 'viewer' role members cannot modify or delete shared household items.

-- 1. Helper function to verify if user is an editor (owner, admin, member) in the target household
CREATE OR REPLACE FUNCTION public.is_household_editor(check_household_id UUID)
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
      AND role IN ('owner', 'admin', 'member')
  ) OR EXISTS (
    SELECT 1 FROM public.households
    WHERE id = check_household_id AND created_by = auth.uid()
  ) OR public.is_admin();
END;
$$ LANGUAGE plpgsql;

-- 2. Update ITEMS UPDATE policy to exclude 'viewer' role
DROP POLICY IF EXISTS "items_update_policy" ON public.items;

CREATE POLICY "items_update_policy"
  ON public.items FOR UPDATE
  USING (
    public.is_admin() OR
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_editor(household_id))
  )
  WITH CHECK (
    public.is_admin() OR
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_editor(household_id))
  );

-- 3. Update ITEMS DELETE policy to require owner/admin role or item creator
DROP POLICY IF EXISTS "items_delete_policy" ON public.items;

CREATE POLICY "items_delete_policy"
  ON public.items FOR DELETE
  USING (
    public.is_admin() OR
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND public.is_household_admin(household_id))
  );

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
