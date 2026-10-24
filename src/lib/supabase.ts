import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
// Strip trailing /rest/v1 or / if user provided REST endpoint URL
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const PROD_PROJECT_REF = 'apfslrzogelqceifhpky';
const STAGING_PROJECT_REF = 'yxycdwyveetrujrnjgjm';

// Prevent local development from accidentally connecting to production Supabase
if (import.meta.env.DEV) {
  if (supabaseUrl.includes(PROD_PROJECT_REF)) {
    throw new Error(
      `[BIZTONSÁGI VÉDELEM] A helyi fejlesztői környezet nem kapcsolódhat az éles (production: ${PROD_PROJECT_REF}) Supabase projekthez! Kérjük, konfiguráld a staging környezetet a .env.local fájlban.`
    );
  }
  if (supabaseUrl && !supabaseUrl.includes(STAGING_PROJECT_REF)) {
    throw new Error(
      `[BIZTONSÁGI VÉDELEM] A helyi fejlesztés kizárólag a jóváhagyott staging projekthez (${STAGING_PROJECT_REF}) kapcsolódhat! Érvénytelen URL: ${supabaseUrl}`
    );
  }
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  (!import.meta.env.DEV || supabaseUrl.includes(STAGING_PROJECT_REF))
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

