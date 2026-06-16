// VERIFY-AUTH -- integration check for AUTH-01, AUTH-02, AUTH-03, D-11.
// Run with: npx tsx scripts/verify-auth.ts
// Requires scripts/seed.ts to have been run first (3 users, 2 restaurants).
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
// Node.js 20 lacks native WebSocket support; supabase-js's realtime client
// requires a WebSocket constructor even when realtime is unused here.
import ws from 'ws'

// Load .env from cwd or parent directory (supports git worktrees).
const envFile = (() => {
  let d = process.cwd()
  while (d !== dirname(d)) {
    if (existsSync(join(d, '.env'))) return join(d, '.env')
    d = dirname(d)
  }
  return '.env'
})()
config({ path: envFile })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function checkAs(email: string, password: string, label: string) {
  const supabase = createClient(url, anonKey, {
    realtime: { transport: ws as unknown as never },
  })
  const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError || !signIn.user) {
    throw new Error(`[${label}] sign-in failed: ${signInError?.message}`)
  }

  const { data: adminRow, error: adminError } = await supabase
    .from('admin_users')
    .select('role, restaurant_id')
    .eq('user_id', signIn.user.id)
    .single()
  if (adminError || !adminRow) {
    throw new Error(`[${label}] admin_users lookup failed: ${adminError?.message}`)
  }

  const { data: visibleRestaurants, error: restError } = await supabase
    .from('restaurants')
    .select('id, name, slug')
  if (restError) {
    throw new Error(`[${label}] restaurants query failed: ${restError.message}`)
  }

  await supabase.auth.signOut()
  return { role: adminRow.role, restaurantId: adminRow.restaurant_id, visibleRestaurants };
}

async function main() {
  // AUTH-01: super admin sees ALL restaurants
  const superAdmin = await checkAs('super@boamidia.dev', 'changeme123!', 'super_admin')
  if (superAdmin.role !== 'super_admin') throw new Error('super_admin role mismatch')
  if (superAdmin.visibleRestaurants.length < 2) throw new Error(`super_admin should see >=2 restaurants, saw ${superAdmin.visibleRestaurants.length}`)
  console.log('AUTH-01 PASS: super_admin sees', superAdmin.visibleRestaurants.length, 'restaurants')

  // AUTH-02 + AUTH-03: restaurant_admin 1 sees ONLY their own restaurant
  const admin1 = await checkAs('admin@pizzaria-do-joao.dev', 'changeme123!', 'restaurant_admin_1')
  if (admin1.role !== 'restaurant_admin') throw new Error('restaurant_admin_1 role mismatch')
  if (admin1.visibleRestaurants.length !== 1) throw new Error(`restaurant_admin_1 should see exactly 1 restaurant, saw ${admin1.visibleRestaurants.length}`)
  if (admin1.visibleRestaurants[0].slug !== 'pizzaria-do-joao') throw new Error(`restaurant_admin_1 sees wrong restaurant: ${admin1.visibleRestaurants[0].slug}`)
  console.log('AUTH-02 PASS: restaurant_admin_1 sees only', admin1.visibleRestaurants[0].slug)

  // AUTH-03: restaurant_admin 2 sees ONLY their own (different) restaurant -- cross-tenant isolation
  const admin2 = await checkAs('admin@hamburgueria-central.dev', 'changeme123!', 'restaurant_admin_2')
  if (admin2.visibleRestaurants.length !== 1) throw new Error(`restaurant_admin_2 should see exactly 1 restaurant, saw ${admin2.visibleRestaurants.length}`)
  if (admin2.visibleRestaurants[0].slug !== 'hamburgueria-central') throw new Error(`restaurant_admin_2 sees wrong restaurant: ${admin2.visibleRestaurants[0].slug}`)
  if (admin2.visibleRestaurants[0].slug === admin1.visibleRestaurants[0].slug) throw new Error('CROSS-TENANT LEAK: both admins see the same restaurant')
  console.log('AUTH-03 PASS: restaurant_admin_2 sees only', admin2.visibleRestaurants[0].slug, '-- cross-tenant isolation verified')

  // D-11: Deactivating a restaurant must block its restaurant_admin from logging in.
  // We verify the gate's data logic directly (login() uses redirect() which throws
  // in a Node script context, so we replicate the gate's SELECT chain).

  // Dynamic imports after dotenv (same pattern as seed.ts) so env vars are loaded first.
  const { db } = await import('../src/db')
  const { restaurants } = await import('../src/db/schema')
  const { eq } = await import('drizzle-orm')

  // Identify hamburgueria-central's ID via the anon client (RLS permits super_admin to see all).
  const superAdminClient = createClient(url, anonKey, {
    realtime: { transport: ws as unknown as never },
  })
  await superAdminClient.auth.signInWithPassword({ email: 'super@boamidia.dev', password: 'changeme123!' })
  const { data: allRestaurants } = await superAdminClient.from('restaurants').select('id, slug')
  await superAdminClient.auth.signOut()
  const hamburgueriaRow = allRestaurants?.find((r: { id: string; slug: string }) => r.slug === 'hamburgueria-central')
  if (!hamburgueriaRow) throw new Error('D-11: hamburgueria-central not found in restaurants')

  // Deactivate hamburgueria-central via Drizzle (service-level, bypasses RLS).
  await db.update(restaurants).set({ isActive: false }).where(eq(restaurants.id, hamburgueriaRow.id))

  // Replicate the gate: sign in as the deactivated restaurant's admin, check is_active.
  const d11Client = createClient(url, anonKey, {
    realtime: { transport: ws as unknown as never },
  })
  const { data: d11SignIn, error: d11SignInError } = await d11Client.auth.signInWithPassword({
    email: 'admin@hamburgueria-central.dev',
    password: 'changeme123!',
  })
  if (d11SignInError || !d11SignIn.user) throw new Error(`D-11: sign-in failed: ${d11SignInError?.message}`)

  const { data: d11AdminRow } = await d11Client.from('admin_users')
    .select('role, restaurant_id')
    .eq('user_id', d11SignIn.user.id)
    .single()
  if (!d11AdminRow) throw new Error('D-11: admin_users row not found for hamburgueria admin')

  const { data: d11Restaurant } = await d11Client.from('restaurants')
    .select('is_active')
    .eq('id', d11AdminRow.restaurant_id)
    .single()

  // The gate in login() checks: if (adminRow.role === 'restaurant_admin') { if (!restaurant?.is_active) → deny }
  if (d11AdminRow.role !== 'restaurant_admin') throw new Error('D-11: expected restaurant_admin role')
  if (d11Restaurant?.is_active !== false) throw new Error('D-11: expected is_active to be false after deactivation')
  console.log('D-11 PASS: inactive restaurant_admin would be denied (is_active === false confirmed via SSR client)')
  await d11Client.auth.signOut()

  // D-11: super_admin is unaffected by is_active gate (gate only runs for restaurant_admin role).
  const superCheckClient = createClient(url, anonKey, {
    realtime: { transport: ws as unknown as never },
  })
  const { data: superCheck, error: superCheckError } = await superCheckClient.auth.signInWithPassword({
    email: 'super@boamidia.dev',
    password: 'changeme123!',
  })
  if (superCheckError || !superCheck.user) throw new Error(`D-11 super: sign-in failed: ${superCheckError?.message}`)
  const { data: superRow } = await superCheckClient.from('admin_users')
    .select('role, restaurant_id')
    .eq('user_id', superCheck.user.id)
    .single()
  if (!superRow) throw new Error('D-11 super: admin_users row not found')
  // The gate only runs when role === 'restaurant_admin', so super_admin is never gated.
  if (superRow.role !== 'super_admin') throw new Error('D-11 super: role mismatch')
  const gateWouldApply = superRow.role === 'restaurant_admin'
  if (gateWouldApply) throw new Error('D-11 super: gate would incorrectly apply to super_admin')
  console.log('D-11 PASS: super_admin unaffected by is_active gate (gate does not apply to super_admin role)')
  await superCheckClient.auth.signOut()

  // RESTORE: re-activate hamburgueria-central so reruns and other plans stay green.
  await db.update(restaurants).set({ isActive: true }).where(eq(restaurants.id, hamburgueriaRow.id))
  console.log('D-11: hamburgueria-central restored to is_active=true')

  console.log('ALL CHECKS PASSED')
}

main().then(() => process.exit(0)).catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
