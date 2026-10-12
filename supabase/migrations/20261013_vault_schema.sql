-- ==============================================================================
-- THINGOR MIGRÁCIÓ: VÉDETT TERÜLET / SZÉF (VAULT) SÉMA
-- ==============================================================================

-- 1. Vault beállítások tábla a felhasználónkénti PIN hash és időkorlát tárolására
CREATE TABLE IF NOT EXISTS public.vault_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  auto_lock_minutes INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT vault_settings_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_vault_settings_user_id ON public.vault_settings(user_id);

-- 2. Items és Item_documents kiegészítése széf védelem jelzővel
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS is_vault_protected BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.item_documents 
ADD COLUMN IF NOT EXISTS is_vault_protected BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_items_vault_protected ON public.items(is_vault_protected) WHERE is_vault_protected = true;
CREATE INDEX IF NOT EXISTS idx_item_docs_vault_protected ON public.item_documents(is_vault_protected) WHERE is_vault_protected = true;

-- 3. RLS a vault_settings táblához
ALTER TABLE public.vault_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vault_settings' AND policyname = 'Users can view own vault settings'
  ) THEN
    CREATE POLICY "Users can view own vault settings"
      ON public.vault_settings FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vault_settings' AND policyname = 'Users can insert own vault settings'
  ) THEN
    CREATE POLICY "Users can insert own vault settings"
      ON public.vault_settings FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vault_settings' AND policyname = 'Users can update own vault settings'
  ) THEN
    CREATE POLICY "Users can update own vault settings"
      ON public.vault_settings FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vault_settings' AND policyname = 'Users can delete own vault settings'
  ) THEN
    CREATE POLICY "Users can delete own vault settings"
      ON public.vault_settings FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
