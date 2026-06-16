// SERVER-ONLY. Never import from a Client Component.
// Uses SUPABASE_SECRET_KEY (service_role) -- bypasses RLS entirely.
import { createClient } from '@supabase/supabase-js'

// Node.js < 22 (e.g., Node 20 used by tsx scripts) lacks native WebSocket support.
// supabase-js's realtime client requires a WebSocket constructor at client construction
// time even when realtime is unused. Next.js App Router polyfills WebSocket globally,
// so this shim is only invoked in tsx-script contexts (verify-*.ts, seed.ts).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const wsTransport = typeof WebSocket === 'undefined' ? require('ws') : undefined

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      ...(wsTransport ? { realtime: { transport: wsTransport } } : {}),
    }
  )
}
