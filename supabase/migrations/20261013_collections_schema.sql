-- MIGRATION: 20261013_collections_schema.sql
-- Description: Creates collections and collection_items tables with RLS policies for thematic curated catalogs.

CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  collection_type TEXT NOT NULL DEFAULT 'general' CHECK (collection_type IN ('books', 'coins', 'watches', 'wine', 'records', 'general')),
  cover_image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  collector_grade TEXT,
  rarity TEXT,
  acquired_year INTEGER,
  catalog_number TEXT,
  estimated_collector_value NUMERIC,
  custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_collection_item UNIQUE (collection_id, item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON public.collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_item_id ON public.collection_items(item_id);

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- Collections RLS Policies
DROP POLICY IF EXISTS "collections_select_policy" ON public.collections;
CREATE POLICY "collections_select_policy"
  ON public.collections FOR SELECT
  USING (
    user_id = auth.uid() OR
    is_public = true OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "collections_insert_policy" ON public.collections;
CREATE POLICY "collections_insert_policy"
  ON public.collections FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "collections_update_policy" ON public.collections;
CREATE POLICY "collections_update_policy"
  ON public.collections FOR UPDATE
  USING (
    user_id = auth.uid() OR
    public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid() OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "collections_delete_policy" ON public.collections;
CREATE POLICY "collections_delete_policy"
  ON public.collections FOR DELETE
  USING (
    user_id = auth.uid() OR
    public.is_admin()
  );

-- Collection Items RLS Policies
DROP POLICY IF EXISTS "collection_items_select_policy" ON public.collection_items;
CREATE POLICY "collection_items_select_policy"
  ON public.collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_items.collection_id
        AND (c.user_id = auth.uid() OR c.is_public = true OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "collection_items_insert_policy" ON public.collection_items;
CREATE POLICY "collection_items_insert_policy"
  ON public.collection_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_items.collection_id
        AND (c.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "collection_items_update_policy" ON public.collection_items;
CREATE POLICY "collection_items_update_policy"
  ON public.collection_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_items.collection_id
        AND (c.user_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_items.collection_id
        AND (c.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "collection_items_delete_policy" ON public.collection_items;
CREATE POLICY "collection_items_delete_policy"
  ON public.collection_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_items.collection_id
        AND (c.user_id = auth.uid() OR public.is_admin())
    )
  );
