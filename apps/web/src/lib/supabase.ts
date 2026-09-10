import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Supabase renamed "anon" → "publishable" (sb_publishable_…). Legacy anon still works. */
export function getSupabasePublishableKey(): string | undefined {
  return (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  );
}

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = getSupabasePublishableKey();
  return Boolean(url && key && !key.includes("PASTE_"));
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      getSupabasePublishableKey()!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: localStorage,
        },
      },
    );
  }
  return client;
}
