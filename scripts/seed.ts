// SEED SCRIPT -- test-only credentials (changeme123!). Run with: npx tsx scripts/seed.ts.
// Requires SUPABASE_SECRET_KEY (server-only, never NEXT_PUBLIC_).
import { config } from 'dotenv'
config({ path: '.env' })

async function main() {
  // `db` (src/db/index.ts) and `@supabase/supabase-js` read process.env at
  // module-evaluation time. Static imports are hoisted above the config()
  // call above under ESM, so they are loaded dynamically here -- AFTER
  // dotenv has populated process.env -- to avoid db falling back to
  // localhost defaults.
  const { createClient } = await import('@supabase/supabase-js')
  // Node.js 20 lacks native WebSocket support; supabase-js's realtime client
  // requires a WebSocket constructor even when realtime is unused here.
  const { default: ws } = await import('ws')
  const { db } = await import('../src/db')
  const { restaurants, adminUsers } = await import('../src/db/schema')

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: ws as unknown as never },
    }
  )

  async function createAdminUser(email: string, password: string) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) throw error
    return data.user
  }

  const superAdminUser = await createAdminUser('super@boamidia.dev', 'changeme123!')
  await db.insert(adminUsers).values({
    userId: superAdminUser.id,
    role: 'super_admin',
    restaurantId: null,
  })

  const [r1] = await db.insert(restaurants).values({
    name: 'Pizzaria do Joao', slug: 'pizzaria-do-joao',
  }).returning()

  const r1Admin = await createAdminUser('admin@pizzaria-do-joao.dev', 'changeme123!')
  await db.insert(adminUsers).values({
    userId: r1Admin.id, role: 'restaurant_admin', restaurantId: r1.id,
  })

  const [r2] = await db.insert(restaurants).values({
    name: 'Hamburgueria Central', slug: 'hamburgueria-central',
  }).returning()

  const r2Admin = await createAdminUser('admin@hamburgueria-central.dev', 'changeme123!')
  await db.insert(adminUsers).values({
    userId: r2Admin.id, role: 'restaurant_admin', restaurantId: r2.id,
  })

  console.log('Seed complete:', {
    superAdmin: 'super@boamidia.dev',
    r1: { slug: r1.slug, admin: 'admin@pizzaria-do-joao.dev' },
    r2: { slug: r2.slug, admin: 'admin@hamburgueria-central.dev' },
  })
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
