-- Migration: 20261013_dashboard_metrics_and_preferences.sql
-- Description: Server-side aggregated dashboard metrics RPC and user UI preferences JSONB column

-- 1. Add preferences JSONB to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{
  "pinned_modules": ["dashboard", "items", "documents"],
  "module_order": ["dashboard", "items", "documents", "household", "repairs", "financing", "notes"],
  "hidden_modules": []
}'::jsonb;

-- 2. Fast server-side aggregated metrics RPC (O(1) client load for 10k-50k items)
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

  -- 1. Aggregated items metrics
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
  WHERE user_id = v_user_id 
     OR (household_id IS NOT NULL AND household_id = ANY(v_hh_ids));

  -- 2. Locations count
  SELECT COUNT(*)
  INTO v_storage_spots
  FROM public.locations
  WHERE user_id = v_user_id 
     OR (household_id IS NOT NULL AND household_id = ANY(v_hh_ids));

  -- 3. Pending repairs count
  SELECT COUNT(*)
  INTO v_pending_repairs
  FROM public.item_repairs
  WHERE (user_id = v_user_id OR item_id IN (
    SELECT id FROM public.items WHERE user_id = v_user_id OR (household_id IS NOT NULL AND household_id = ANY(v_hh_ids))
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
