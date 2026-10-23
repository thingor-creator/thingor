-- Migration: 20261023_fix_household_invites_select_rls.sql
-- Description: Fix critical data leak in household_invites_select_policy.
--              Removes the unconstrained 'OR (status = pending AND expires_at > now())' clause
--              that previously allowed any authenticated user to read all pending invites,
--              secret tokens, and recipient emails across all households.
--              Restricts SELECT policy strictly to authenticated users who are:
--                1. System administrators (is_admin())
--                2. The invited recipient (lower(invited_email) = lower(auth.jwt()->>'email'))
--                3. The creator of the invite (invited_by = auth.uid())
--                4. Members of the issuing household (household_id IN (SELECT get_my_household_ids()))
--              Also revokes table privileges on household_invites from the 'anon' role.

-- 1. Revoke unneeded privileges from anon role on household_invites
REVOKE ALL ON TABLE public.household_invites FROM anon;

-- 2. Ensure authenticated role has necessary table privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.household_invites TO authenticated;

-- 3. Replace household_invites_select_policy with hardened, scoped policy
DROP POLICY IF EXISTS "household_invites_select_policy" ON public.household_invites;

CREATE POLICY "household_invites_select_policy"
  ON public.household_invites
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    lower(invited_email) = lower(COALESCE(((SELECT auth.jwt()) ->> 'email'), '')) OR
    invited_by = (SELECT auth.uid()) OR
    household_id IN (SELECT household_id FROM public.get_my_household_ids())
  );
