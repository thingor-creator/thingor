-- MIGRATION: 20261013_pantry_schema.sql
-- Description: Creates pantry_items table and policies for household consumables and shopping list management.

CREATE TABLE IF NOT EXISTS public.pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT,
  current_quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'db',
  min_threshold NUMERIC NOT NULL DEFAULT 1,
  expiration_date DATE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  notes TEXT,
  is_staple BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pantry_items_user_id ON public.pantry_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_household_id ON public.pantry_items(household_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_category ON public.pantry_items(category);
CREATE INDEX IF NOT EXISTS idx_pantry_items_expiration ON public.pantry_items(expiration_date);

-- Enable RLS
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "pantry_items_select_policy" ON public.pantry_items;
CREATE POLICY "pantry_items_select_policy"
  ON public.pantry_items FOR SELECT
  USING (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND household_id IN (SELECT household_id FROM public.get_my_household_ids())) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "pantry_items_insert_policy" ON public.pantry_items;
CREATE POLICY "pantry_items_insert_policy"
  ON public.pantry_items FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "pantry_items_update_policy" ON public.pantry_items;
CREATE POLICY "pantry_items_update_policy"
  ON public.pantry_items FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND household_id IN (SELECT household_id FROM public.get_my_household_ids())) OR
    public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND household_id IN (SELECT household_id FROM public.get_my_household_ids())) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "pantry_items_delete_policy" ON public.pantry_items;
CREATE POLICY "pantry_items_delete_policy"
  ON public.pantry_items FOR DELETE
  USING (
    user_id = auth.uid() OR
    public.is_admin()
  );
