-- ============================================================================
-- MIGRATION: 20261017_feature_improvements.sql
-- DESCRIPTION: Feature improvements for Documents (file_path), Quick Notes repair,
--              Collections (standalone items), and Lending (contacts & lendable items).
-- ============================================================================

-- 1. DOCUMENTS: Add file_path column and index for exact object access verification
ALTER TABLE public.item_documents
  ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Safe data migration for existing document
UPDATE public.item_documents
SET file_path = 'eeb68bcf-005c-4353-9042-4fc7fa26a888/documents/1791565210692_Regisztralt_gep_adatlap.pdf'
WHERE id = 'd3cb4a88-42fe-4d9e-a8f9-720cf8665591' AND file_path IS NULL;

UPDATE public.item_documents
SET file_path = substring(file_url from '([0-9a-fA-F-]{36}/documents/.+)$')
WHERE file_path IS NULL AND file_url ~ '[0-9a-fA-F-]{36}/documents/.+';

CREATE INDEX IF NOT EXISTS idx_item_documents_file_path ON public.item_documents(file_path);

-- 2. QUICK NOTES: Reset corrupted note so user can re-convert cleanly
UPDATE public.quick_notes
SET is_converted = false, converted_item_id = NULL
WHERE id = '08ce955e-dffd-4340-b500-ca242feb92da' AND converted_item_id IS NULL;

-- 3. COLLECTIONS: Support standalone collection items without requiring inventory items
ALTER TABLE public.collection_items ALTER COLUMN item_id DROP NOT NULL;

ALTER TABLE public.collection_items
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- 4. LENDING: Lendable items metadata on inventory items
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS is_lendable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lending_terms TEXT;

-- 5. LENDING: User-isolated contacts ledger for lending / borrowing
CREATE TABLE IF NOT EXISTS public.lending_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'friend',
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.lending_contacts
  ADD COLUMN IF NOT EXISTS contact_info TEXT,
  ADD COLUMN IF NOT EXISTS relationship TEXT;

ALTER TABLE public.lending_contacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lending_contacts' AND policyname = 'lending_contacts_manage_policy'
  ) THEN
    CREATE POLICY "lending_contacts_manage_policy"
      ON public.lending_contacts
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
