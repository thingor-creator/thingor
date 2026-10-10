-- MIGRATION: 20261010_site_settings_logo_and_customization.sql
-- Description: Add missing branding, logo, contact, and customization columns to site_settings,
-- and add INSERT policy for administrators to support upsert.

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS site_description TEXT DEFAULT 'Thingor – Személyes leltár, tárgy- és dokumentumkezelő platform',
  ADD COLUMN IF NOT EXISTS registration_paused_title TEXT DEFAULT 'A regisztráció jelenleg szünetel',
  ADD COLUMN IF NOT EXISTS registration_paused_message TEXT DEFAULT 'A regisztráció jelenleg átmenetileg fel van függesztve az adminisztrátor által. Kérjük, látogass vissza később.',
  ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT 'info@thingor.com',
  ADD COLUMN IF NOT EXISTS support_email TEXT DEFAULT 'support@thingor.com',
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '/logo.png',
  ADD COLUMN IF NOT EXISTS favicon_url TEXT DEFAULT '/favicon.png',
  ADD COLUMN IF NOT EXISTS meta_description TEXT DEFAULT 'Thingor - Tartsd nyilván a tulajdonodban lévő tárgyakat, hol vannak, mennyit érnek és mi tartozik hozzájuk.';

-- Ensure admins have INSERT policy on site_settings so upsert operations succeed
DROP POLICY IF EXISTS "Admins can insert site_settings" ON public.site_settings;
CREATE POLICY "Admins can insert site_settings"
  ON public.site_settings FOR INSERT
  WITH CHECK (public.is_admin());

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
