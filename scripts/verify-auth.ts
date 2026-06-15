// VERIFY-AUTH -- integration check for AUTH-01, AUTH-02, AUTH-03.
// Run with: npx tsx scripts/verify-auth.ts
// Requires scripts/seed.ts to have been run first (3 users, 2 restaurants).
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
// Node.js 20 lacks native WebSocket support; supabase-js's realtime client
// requires a WebSocket constructor even when realtime is unused here.
import ws from 'ws'
config({ path: '.env' })

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

  console.log('ALL CHECKS PASSED')
}

main().then(() => process.exit(0)).catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
