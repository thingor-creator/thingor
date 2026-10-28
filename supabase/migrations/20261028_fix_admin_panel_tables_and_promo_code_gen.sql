-- Migration: Fix missing admin tables (site_contents, faqs, legal_documents, legal_document_versions)
-- and fix admin_generate_promo_code pgcrypto extension search_path.

-- 1. SITE CONTENTS TABLE
CREATE TABLE IF NOT EXISTS public.site_contents (
  id TEXT PRIMARY KEY,
  section_key TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  button_text TEXT,
  button_url TEXT,
  image_url TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.site_contents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'site_contents' AND policyname = 'Anyone can view site_contents'
  ) THEN
    CREATE POLICY "Anyone can view site_contents" ON public.site_contents FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'site_contents' AND policyname = 'Admins can manage site_contents'
  ) THEN
    CREATE POLICY "Admins can manage site_contents" ON public.site_contents FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

INSERT INTO public.site_contents (id, section_key, title, subtitle, description, button_text, button_url, is_enabled, display_order)
VALUES
  ('blk-hero', 'hero', 'Személyes tárgynyilvántartó platform', 'Rendszerezd az összes tárgyadat', 'Tartsd nyilván a tulajdonodban lévő tárgyakat, hol vannak, mennyit érnek és mi tartozik hozzájuk.', 'Kezdés most', '#', true, 1),
  ('blk-categories', 'categories', 'Minden tárgyad egy helyen', 'Sokoldalú leltár', 'Legyen szó a műhelyben lévő szerszámokról, az íróasztalon lévő elektronikáról vagy a raktárban tárolt berendezésekről.', '', '', true, 2),
  ('blk-locations', 'locations', 'Tudd, hol van', 'Helyszín fa struktúra', 'Soha többé ne pazarolj időt fiókok vagy dobozok keresgélésére.', '', '', true, 3)
ON CONFLICT (id) DO NOTHING;

-- 2. FAQS TABLE
CREATE TABLE IF NOT EXISTS public.faqs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'faqs' AND policyname = 'Anyone can view published faqs'
  ) THEN
    CREATE POLICY "Anyone can view published faqs" ON public.faqs FOR SELECT USING (is_published = true OR public.is_admin());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'faqs' AND policyname = 'Admins can manage faqs'
  ) THEN
    CREATE POLICY "Admins can manage faqs" ON public.faqs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

INSERT INTO public.faqs (id, question, answer, display_order, is_published) VALUES
  ('faq-1', 'Mi az a Thingor?', 'A Thingor egy személyes tárgynyilvántartó és leltározó platform, amellyel rendszerezheted, dokumentálhatod és nyomon követheted az értékeidet.', 1, true),
  ('faq-2', 'Biztonságban vannak az adataim?', 'Igen! Minden adatod privát és titkosított, a csatolt dokumentumok és képek pedig védett Cloudflare R2 tárolóban helyezkednek el.', 2, true),
  ('faq-3', 'Hogyan működik a tárgymegosztás?', 'Egyedi, biztonságos megosztási hivatkozást hozhatsz létre tárgyaidhoz (pl. eladáshoz vagy kölcsönadáshoz), amin beállíthatod, hogy mennyi ideig érvényes és milyen részletek láthatók.', 3, true)
ON CONFLICT (id) DO NOTHING;

-- 3. LEGAL DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL CHECK (slug IN ('privacy', 'terms', 'cookies', 'imprint')),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'legal_documents' AND policyname = 'Anyone can view legal_documents'
  ) THEN
    CREATE POLICY "Anyone can view legal_documents" ON public.legal_documents FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'legal_documents' AND policyname = 'Admins can manage legal_documents'
  ) THEN
    CREATE POLICY "Admins can manage legal_documents" ON public.legal_documents FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

INSERT INTO public.legal_documents (slug, title) VALUES
  ('privacy', 'Adatvédelmi Tájékoztató (Privacy Policy)'),
  ('terms', 'Felhasználási Feltételek (Terms of Service)'),
  ('cookies', 'Cookie Tájékoztató (Cookie Policy)'),
  ('imprint', 'Impresszum (Imprint)')
ON CONFLICT (slug) DO NOTHING;

-- 4. LEGAL DOCUMENT VERSIONS TABLE
CREATE TABLE IF NOT EXISTS public.legal_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_slug TEXT NOT NULL REFERENCES public.legal_documents(slug) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'legal_document_versions' AND policyname = 'Anyone can view published legal_document_versions'
  ) THEN
    CREATE POLICY "Anyone can view published legal_document_versions" ON public.legal_document_versions FOR SELECT USING (status = 'published' OR public.is_admin());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'legal_document_versions' AND policyname = 'Admins can manage legal_document_versions'
  ) THEN
    CREATE POLICY "Admins can manage legal_document_versions" ON public.legal_document_versions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

INSERT INTO public.legal_document_versions (document_slug, version, title, content, status, published_at) VALUES
  ('privacy', 1, 'Adatvédelmi Tájékoztató (v1.0)', 'A Thingor elkötelezett a felhasználók személyes adatainak védelme mellett. Az Ön által megadott adatokat bizalmasan kezeljük, és harmadik félnek nem adjuk át.', 'published', NOW()),
  ('terms', 1, 'Felhasználási Feltételek (v1.0)', 'A Thingor szolgáltatás használatával Ön elfogadja a jelen felhasználási feltételeket. A platform személyes tárgyak nyomon követésére szolgál.', 'published', NOW()),
  ('cookies', 1, 'Cookie Tájékoztató (v1.0)', 'A Thingor kizárólag a működéshez elengedhetetlen munkamenet sütiket (session cookies) használja.', 'published', NOW()),
  ('imprint', 1, 'Impresszum (v1.0)', 'Thingor Personal Inventory Platform. Elérhetőség: info@thingor.com', 'published', NOW())
ON CONFLICT DO NOTHING;

-- 5. FIX admin_generate_promo_code FUNCTION
CREATE OR REPLACE FUNCTION public.admin_generate_promo_code(
  p_code TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'vip',
  p_target_plan_id TEXT DEFAULT 'business',
  p_duration_days INTEGER DEFAULT NULL,
  p_valid_until TIMESTAMPTZ DEFAULT NULL,
  p_max_uses INTEGER DEFAULT 1,
  p_campaign_name TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_final_code TEXT;
  v_new_id UUID;
BEGIN
  -- Strict server-side admin check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Csak rendszeradminisztrátor generálhat kódot.' USING ERRCODE = '42501';
  END IF;

  -- Auto-generate crypto code if not provided
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    v_final_code := 'THINGOR-' || UPPER(COALESCE(p_type, 'vip')) || '-' || UPPER(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
  ELSE
    v_final_code := UPPER(TRIM(p_code));
  END IF;

  -- Validate target plan
  IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = p_target_plan_id) THEN
    RAISE EXCEPTION 'Érvénytelen célcsomag: %', p_target_plan_id USING ERRCODE = 'P0001';
  END IF;

  -- Validate type
  IF p_type NOT IN ('vip', 'promo') THEN
    RAISE EXCEPTION 'Érvénytelen kódtípus: %', p_type USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.promo_codes (
    code, type, target_plan_id, duration_days, valid_until, max_uses,
    status, campaign_name, admin_notes, created_by
  ) VALUES (
    v_final_code, p_type, p_target_plan_id, p_duration_days, p_valid_until,
    COALESCE(p_max_uses, 1), 'active', p_campaign_name, p_admin_notes, v_admin_id
  ) RETURNING id INTO v_new_id;

  -- Log action (do not store raw secret in metadata)
  INSERT INTO public.promo_code_audit_logs (
    admin_id, promo_code_id, action, metadata
  ) VALUES (
    v_admin_id, v_new_id, 'create_code',
    jsonb_build_object(
      'type', p_type,
      'target_plan_id', p_target_plan_id,
      'duration_days', p_duration_days,
      'max_uses', p_max_uses,
      'campaign_name', p_campaign_name
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'id', v_new_id,
    'code', v_final_code,
    'type', p_type,
    'target_plan_id', p_target_plan_id,
    'duration_days', p_duration_days,
    'valid_until', p_valid_until,
    'max_uses', p_max_uses
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

REVOKE ALL ON FUNCTION public.admin_generate_promo_code(TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_generate_promo_code(TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, INTEGER, TEXT, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
