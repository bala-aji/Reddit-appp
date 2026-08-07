import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for background workers only (Trigger.dev tasks,
// cron jobs). Bypasses RLS — never import this into anything reachable
// from a browser request.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
