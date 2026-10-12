-- Migration: 20261012_fix_rls_privilege_escalation.sql
-- Description: Fixes critical RLS privilege escalation vulnerabilities on profiles, household_members, and item_documents.
-- Rollback commands:
-- DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
-- DROP FUNCTION IF EXISTS public.prevent_profile_privilege_escalation();
-- DROP TRIGGER IF EXISTS trg_prevent_household_role_escalation ON public.household_members;
-- DROP FUNCTION IF EXISTS public.prevent_household_role_escalation();
-- DROP TRIGGER IF EXISTS trg_validate_item_document_access ON public.item_documents;
-- DROP FUNCTION IF EXISTS public.validate_item_document_access();

-- 1. Prevent unauthorized role and status escalation on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If not an active admin, do not allow changing role or status
  IF NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Jogosulatlan művelet: Saját szerepkör (role) módosítása tilos!';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Jogosulatlan művelet: Saját fiókstátusz (status) módosítása tilos!';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2. Prevent unauthorized role elevation in household_members
CREATE OR REPLACE FUNCTION public.prevent_household_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only global admin or existing household admin/owner can alter member roles
  IF NOT (public.is_admin() OR public.is_household_admin(OLD.household_id)) THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Jogosulatlan művelet: Csak háztartás-adminisztrátor módosíthatja a tagsági szerepköröket!';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_household_role_escalation ON public.household_members;
CREATE TRIGGER trg_prevent_household_role_escalation
BEFORE UPDATE ON public.household_members
FOR EACH ROW
EXECUTE FUNCTION public.prevent_household_role_escalation();

-- 3. Prevent cross-user document injection into items the user does not own or have household access to
CREATE OR REPLACE FUNCTION public.validate_item_document_access()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT (public.is_admin()) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = NEW.item_id
        AND (
          items.user_id = auth.uid()
          OR (
            items.household_id IS NOT NULL 
            AND items.household_id IN (SELECT household_id FROM public.get_my_household_ids())
          )
        )
    ) THEN
      RAISE EXCEPTION 'Jogosulatlan dokumentumcsatolás: Nincs hozzáférésed ehhez a tárgyhoz!';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_item_document_access ON public.item_documents;
CREATE TRIGGER trg_validate_item_document_access
BEFORE INSERT ON public.item_documents
FOR EACH ROW
EXECUTE FUNCTION public.validate_item_document_access();
