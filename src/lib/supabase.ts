import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://apfslrzogelqceifhpky.supabase.co';
const defaultKey = 'sb_publishable_7mLawFVKzbL4CIYVLWNigA_sfQzfoly';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || defaultUrl).trim();
// Strip trailing /rest/v1 or / if user provided REST endpoint URL
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || defaultKey).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
