import { createServerClient } from '@supabase/ssr';
import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser client — use in client components
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: process.env.NODE_ENV === 'production' ? { domain: '.caparisonlab.com' } : {},
  });
}

/**
 * Server client — use in Server Components and API routes
 */
export async function createServerSupabaseClient(cookieStore) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: process.env.NODE_ENV === 'production' ? { domain: '.caparisonlab.com' } : {},
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {}
      },
    },
  });
}
