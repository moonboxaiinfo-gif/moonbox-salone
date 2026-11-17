/**
 * Supabase Client Integration
 * Handles initialization with real environment variables.
 * Never exposes service-role key to the browser client!
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env: any = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project-ref.supabase.co' && 
  !supabaseUrl.includes('your-project-ref') &&
  supabaseAnonKey !== 'your-supabase-anon-key'
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'moonbox_supabase_auth_token'
      }
    })
  : null;

export function getSupabaseConfigurationStatus(): {
  configured: boolean;
  urlConfigured: boolean;
  keyConfigured: boolean;
  message: string;
} {
  const urlConfigured = Boolean(supabaseUrl && !supabaseUrl.includes('your-project-ref'));
  const keyConfigured = Boolean(supabaseAnonKey && supabaseAnonKey !== 'your-supabase-anon-key');
  const configured = urlConfigured && keyConfigured;

  return {
    configured,
    urlConfigured,
    keyConfigured,
    message: configured
      ? 'Supabase client is connected with valid environment variables.'
      : 'Supabase credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are pending configuration in Netlify Environment Variables.'
  };
}
