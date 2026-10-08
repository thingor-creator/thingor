-- ==========================================================
-- Migration: 20261008_audit_fixes_and_indexes.sql
-- Description: Fix security advisories (search_path & execute permissions),
--              clean up duplicate permissive RLS policies, and add covering
--              indexes for all unindexed foreign keys.
-- ==========================================================

-- 1. SECURITY FIXES: FIX MUTABLE SEARCH_PATH ON SECURITY DEFINER FUNCTIONS
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_shared_item(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_any_household_member() SET search_path = public, pg_temp;

-- 2. SECURITY FIXES: REVOKE PUBLIC RPC EXECUTE JOGS ON INTERNAL / TRIGGER FUNCTIONS
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- 3. CLEAN UP DUPLICATE PERMISSIVE POLICIES
DROP POLICY IF EXISTS "Members can view household members" ON public.household_members;
DROP POLICY IF EXISTS "Members can view household" ON public.households;

-- 4. PERFORMANCE FIXES: COVERING INDEXES FOR ALL FOREIGN KEYS
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);

CREATE INDEX IF NOT EXISTS idx_household_invites_household_id ON public.household_invites(household_id);
CREATE INDEX IF NOT EXISTS idx_household_invites_invited_by ON public.household_invites(invited_by);

CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON public.household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household_id ON public.household_members(household_id);

CREATE INDEX IF NOT EXISTS idx_households_created_by ON public.households(created_by);
CREATE INDEX IF NOT EXISTS idx_households_owner_id ON public.households(owner_id);

CREATE INDEX IF NOT EXISTS idx_item_documents_item_id ON public.item_documents(item_id);
CREATE INDEX IF NOT EXISTS idx_item_documents_user_id ON public.item_documents(user_id);

CREATE INDEX IF NOT EXISTS idx_item_financings_item_id ON public.item_financings(item_id);
CREATE INDEX IF NOT EXISTS idx_item_financings_user_id ON public.item_financings(user_id);

CREATE INDEX IF NOT EXISTS idx_item_relations_target_item_id ON public.item_relations(target_item_id);
CREATE INDEX IF NOT EXISTS idx_item_relations_source_item_id ON public.item_relations(source_item_id);

CREATE INDEX IF NOT EXISTS idx_item_repairs_item_id ON public.item_repairs(item_id);
CREATE INDEX IF NOT EXISTS idx_item_repairs_user_id ON public.item_repairs(user_id);

CREATE INDEX IF NOT EXISTS idx_item_shares_created_by ON public.item_shares(created_by);
CREATE INDEX IF NOT EXISTS idx_item_shares_item_id ON public.item_shares(item_id);

CREATE INDEX IF NOT EXISTS idx_items_category_id ON public.items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_household_id ON public.items(household_id);
CREATE INDEX IF NOT EXISTS idx_items_location_id ON public.items(location_id);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON public.items(user_id);

CREATE INDEX IF NOT EXISTS idx_locations_household_id ON public.locations(household_id);
CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON public.locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_locations_user_id ON public.locations(user_id);

CREATE INDEX IF NOT EXISTS idx_quick_notes_converted_item_id ON public.quick_notes(converted_item_id);
CREATE INDEX IF NOT EXISTS idx_quick_notes_user_id ON public.quick_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_site_settings_updated_by ON public.site_settings(updated_by);
