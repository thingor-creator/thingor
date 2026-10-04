-- THINGOR ADMIN PANEL & CONTENT MANAGEMENT MIGRATION

-- 1. ENHANCE SITE SETTINGS TABLE
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS site_description TEXT DEFAULT 'Thingor – Személyes leltár, tárgy- és dokumentumkezelő platform',
  ADD COLUMN IF NOT EXISTS registration_paused_title TEXT DEFAULT 'A regisztráció jelenleg szünetel',
  ADD COLUMN IF NOT EXISTS registration_paused_message TEXT DEFAULT 'A regisztráció jelenleg átmenetileg fel van függesztve az adminisztrátor által. Kérjük, látogass vissza később.',
  ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT 'info@thingor.com',
  ADD COLUMN IF NOT EXISTS support_email TEXT DEFAULT 'support@thingor.com',
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '/logo.png',
  ADD COLUMN IF NOT EXISTS favicon_url TEXT DEFAULT '/logo.png',
  ADD COLUMN IF NOT EXISTS meta_description TEXT DEFAULT 'Thingor - Tartsd nyilván a tulajdonodban lévő tárgyakat, hol vannak, mennyit érnek és mi tartozik hozzájuk.';

-- 2. LANDING BLOCKS / SITE CONTENTS TABLE
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

DROP POLICY IF EXISTS "Anyone can view site_contents" ON public.site_contents;
CREATE POLICY "Anyone can view site_contents"
  ON public.site_contents FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage site_contents" ON public.site_contents;
CREATE POLICY "Admins can manage site_contents"
  ON public.site_contents FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. FAQS TABLE
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published faqs" ON public.faqs;
CREATE POLICY "Anyone can view published faqs"
  ON public.faqs FOR SELECT
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage faqs" ON public.faqs;
CREATE POLICY "Admins can manage faqs"
  ON public.faqs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Insert default FAQs
INSERT INTO public.faqs (question, answer, display_order) VALUES
  ('Mi az a Thingor?', 'A Thingor egy személyes tárgynyilvántartó és leltározó platform, amellyel rendszerezheted, dokumentálhatod és nyomon követheted az értékeidet.', 1),
  ('Biztonságban vannak az adataim?', 'Igen! Minden adatod privát és titkosított, a csatolt dokumentumok és képek pedig védett Cloudflare R2 tárolóban helyezkednek el.', 2),
  ('Hogyan működik a tárgymegosztás?', 'Egyedi, biztonságos megosztási hivatkozást hozhatsz létre tárgyaidhoz (pl. eladáshoz vagy kölcsönadáshoz), amin beállíthatod, hogy mennyi ideig érvényes és milyen részletek láthatók.', 3)
ON CONFLICT DO NOTHING;

-- 4. LEGAL DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL CHECK (slug IN ('privacy', 'terms', 'cookies', 'imprint')),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view legal_documents" ON public.legal_documents;
CREATE POLICY "Anyone can view legal_documents"
  ON public.legal_documents FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage legal_documents" ON public.legal_documents;
CREATE POLICY "Admins can manage legal_documents"
  ON public.legal_documents FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.legal_documents (slug, title) VALUES
  ('privacy', 'Adatvédelmi Tájékoztató (Privacy Policy)'),
  ('terms', 'Felhasználási Feltételek (Terms of Service)'),
  ('cookies', 'Cookie Tájékoztató (Cookie Policy)'),
  ('imprint', 'Impresszum (Imprint)')
ON CONFLICT (slug) DO NOTHING;

-- 5. LEGAL DOCUMENT VERSIONS TABLE
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

DROP POLICY IF EXISTS "Anyone can view published legal_document_versions" ON public.legal_document_versions;
CREATE POLICY "Anyone can view published legal_document_versions"
  ON public.legal_document_versions FOR SELECT
  USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage legal_document_versions" ON public.legal_document_versions;
CREATE POLICY "Admins can manage legal_document_versions"
  ON public.legal_document_versions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Insert initial published default legal versions
INSERT INTO public.legal_document_versions (document_slug, version, title, content, status, published_at) VALUES
  ('privacy', 1, 'Adatvédelmi Tájékoztató (v1.0)', 'A Thingor elkötelezett a felhasználók személyes adatainak védelme mellett. Az Ön által megadott adatokat bizalmasan kezeljük, és harmadik félnek nem adjuk át.', 'published', NOW()),
  ('terms', 1, 'Felhasználási Feltételek (v1.0)', 'A Thingor szolgáltatás használatával Ön elfogadja a jelen felhasználási feltételeket. A platform személyes tárgyak nyomon követésére szolgál.', 'published', NOW()),
  ('cookies', 1, 'Cookie Tájékoztató (v1.0)', 'A Thingor kizárólag a működéshez elengedhetetlen munkamenet sütiket (session cookies) használja.', 'published', NOW()),
  ('imprint', 1, 'Impresszum (v1.0)', 'Thingor Personal Inventory Platform. Elérhetőség: info@thingor.com', 'published', NOW())
ON CONFLICT DO NOTHING;
