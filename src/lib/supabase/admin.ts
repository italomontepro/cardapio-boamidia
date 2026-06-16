// SERVER-ONLY. Never import from a Client Component.
// Uses SUPABASE_SECRET_KEY (service_role) -- bypasses RLS entirely.
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
