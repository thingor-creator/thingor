-- Migration: 20261014_security_advisor_hardening.sql
-- Description: Harden database functions against mutable search_path, unauthorized anon RPC execution, and vault data leakage.

-- 1. Fix mutable search_path and vault leak in get_dashboard_metrics()
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_hh_ids uuid[];
  v_total_items bigint := 0;
  v_total_value numeric := 0;
  v_storage_spots bigint := 0;
  v_active_warranties bigint := 0;
  v_expiring_warranties bigint := 0;
  v_pending_repairs bigint := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'total_items', 0,
      'total_value', 0,
      'storage_spots', 0,
      'active_warranties', 0,
      'expiring_warranties', 0,
      'pending_repairs', 0
    );
  END IF;

  SELECT ARRAY(SELECT household_id FROM public.get_my_household_ids()) INTO v_hh_ids;

  -- 1. Aggregated items metrics (excluding vault-protected items so locked vault data does not leak)
  SELECT 
    COUNT(*),
    COALESCE(SUM(COALESCE(current_value, purchase_price, 0)), 0),
    COUNT(*) FILTER (WHERE warranty_end IS NOT NULL AND warranty_end::date >= CURRENT_DATE),
    COUNT(*) FILTER (WHERE warranty_end IS NOT NULL AND warranty_end::date >= CURRENT_DATE AND warranty_end::date <= (CURRENT_DATE + INTERVAL '30 days'))
  INTO 
    v_total_items,
    v_total_value,
    v_active_warranties,
    v_expiring_warranties
  FROM public.items
  WHERE (user_id = v_user_id 
     OR (household_id IS NOT NULL AND household_id = ANY(v_hh_ids)))
    AND (is_vault_protected IS NOT TRUE);

  -- 2. Locations count
  SELECT COUNT(*)
  INTO v_storage_spots
  FROM public.locations
  WHERE user_id = v_user_id 
     OR (household_id IS NOT NULL AND household_id = ANY(v_hh_ids));

  -- 3. Pending repairs count (excluding vault protected items)
  SELECT COUNT(*)
  INTO v_pending_repairs
  FROM public.item_repairs
  WHERE (user_id = v_user_id OR item_id IN (
    SELECT id FROM public.items 
    WHERE (user_id = v_user_id OR (household_id IS NOT NULL AND household_id = ANY(v_hh_ids)))
      AND (is_vault_protected IS NOT TRUE)
  ))
  AND status IN ('pending', 'in_progress');

  RETURN jsonb_build_object(
    'total_items', v_total_items,
    'total_value', v_total_value,
    'storage_spots', v_storage_spots,
    'active_warranties', v_active_warranties,
    'expiring_warranties', v_expiring_warranties,
    'pending_repairs', v_pending_repairs
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Fix search_path on trigger functions
ALTER FUNCTION public.validate_item_document_access() SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_profile_privilege_escalation() SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_household_role_escalation() SET search_path = public, pg_temp;

-- 3. Revoke direct RPC execution on trigger functions (triggers run internally)
REVOKE EXECUTE ON FUNCTION public.validate_item_document_access() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_household_role_escalation() FROM PUBLIC, anon, authenticated;

-- 4. Revoke anon / public execution on internal household and authorization helper functions
REVOKE EXECUTE ON FUNCTION public.can_access_shared_category(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_shared_category(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_access_shared_item(uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_shared_item(uuid, uuid, uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_access_shared_location(uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_shared_location(uuid, uuid, uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_household_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_household_ids() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_any_household_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_any_household_member() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_household_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_household_admin(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_household_editor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_household_editor(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_household_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_household_member(uuid) TO authenticated;
