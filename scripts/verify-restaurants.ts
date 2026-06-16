// VERIFY-RESTAURANTS -- integration check for PLAT-01..05.
// Run with: npx tsx scripts/verify-restaurants.ts
// Requires scripts/seed.ts to have been run first (2 restaurants seeded in Phase 1).
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
const secretKey = process.env.SUPABASE_SECRET_KEY!

async function main() {
  // Dynamic imports AFTER config() -- src/db/index.ts reads DATABASE_URL_RUNTIME
  // at module-evaluation time, so static ESM imports would be hoisted above dotenv.
  const { db } = await import('../src/db')
  const { restaurants, adminUsers } = await import('../src/db/schema')
  const { eq } = await import('drizzle-orm')
  const { createRestaurant, updateRestaurant, toggleRestaurantActive } = await import('../src/lib/restaurants/actions')

  // Service-role admin client for auth.users cleanup and assertions.
  const supabaseAdmin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws as unknown as never },
  })

  // Unique slug + email per run to avoid collisions between reruns.
  const runId = Date.now()
  const testSlug = `zz-verify-${runId}`
  const adminEmail = `verify-${runId}@example.com`

  // Track created resources for cleanup.
  let createdRestaurantId: string | null = null
  let createdAuthUserId: string | null = null

  // -------------------------------------------------------------------------
  // SMOKE CHECK: verify database connectivity and restaurants table is reachable.
  // -------------------------------------------------------------------------
  const allRestaurants = await db.select().from(restaurants)
  console.log(`SMOKE PASS: restaurants table reachable, ${allRestaurants.length} rows`)

  // -------------------------------------------------------------------------
  // PLAT-01 create assertion
  //   Call createRestaurant() Server Action and verify row inserted in restaurants
  //   and admin_users tables with correct role=restaurant_admin.
  // -------------------------------------------------------------------------
  const createResult = await createRestaurant({ name: 'Verify Resto', slug: testSlug, adminEmail })

  if (!('success' in createResult) || !createResult.success) {
    throw new Error(`PLAT-01: createRestaurant failed: ${JSON.stringify('error' in createResult ? createResult.error : createResult)}`)
  }
  if (!createResult.tempPassword || createResult.tempPassword.length === 0) {
    throw new Error('PLAT-01: tempPassword should be a non-empty string')
  }
  const [restaurantRow] = await db.select().from(restaurants).where(eq(restaurants.slug, testSlug))
  if (!restaurantRow) {
    throw new Error(`PLAT-01: no restaurants row found with slug=${testSlug}`)
  }
  createdRestaurantId = restaurantRow.id
  console.log(`PLAT-01 PASS: createRestaurant inserted row id=${createdRestaurantId}, tempPassword returned`)

  // -------------------------------------------------------------------------
  // PLAT-05 provisioning + signInWithPassword assertion
  //   Verify admin_users row created with correct role, and temp password
  //   allows sign-in immediately (email_confirm:true — D-09).
  // -------------------------------------------------------------------------
  const [adminRow] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.restaurantId, createdRestaurantId))

  if (!adminRow) {
    throw new Error(`PLAT-05: no admin_users row found for restaurantId=${createdRestaurantId}`)
  }
  if (adminRow.role !== 'restaurant_admin') {
    throw new Error(`PLAT-05: expected role=restaurant_admin, got ${adminRow.role}`)
  }
  createdAuthUserId = adminRow.userId

  // Verify temp password allows immediate sign-in (email_confirm:true).
  const signInClient = createClient(url, anonKey, {
    realtime: { transport: ws as unknown as never },
  })
  const { data: signInData, error: signInError } = await signInClient.auth.signInWithPassword({
    email: adminEmail,
    password: createResult.tempPassword,
  })
  await signInClient.auth.signOut()

  if (signInError || !signInData.user) {
    throw new Error(`PLAT-05: signInWithPassword failed with temp password: ${signInError?.message}`)
  }
  console.log(`PLAT-05 PASS: admin_users row created (role=restaurant_admin), temp password allows sign-in immediately`)

  // -------------------------------------------------------------------------
  // PLAT-01 D-05 duplicate-slug assertion
  //   Attempt to create a restaurant with the same slug as an existing one;
  //   verify the action returns a slug-conflict error (not a DB crash).
  // -------------------------------------------------------------------------
  const dupEmail = `verify-dup-${runId}@example.com`
  const dupResult = await createRestaurant({ name: 'Verify Dup', slug: testSlug, adminEmail: dupEmail })

  if (!('error' in dupResult) || !dupResult.error?.slug) {
    throw new Error(`D-05: expected error.slug for duplicate slug, got: ${JSON.stringify(dupResult)}`)
  }

  // Confirm no second restaurants row was created with that slug.
  const dupRows = await db.select().from(restaurants).where(eq(restaurants.slug, testSlug))
  if (dupRows.length !== 1) {
    throw new Error(`D-05: expected 1 restaurants row with slug=${testSlug}, found ${dupRows.length}`)
  }
  console.log(`PLAT-01 D-05 PASS: duplicate slug returned error.slug, no duplicate row created`)

  // -------------------------------------------------------------------------
  // PLAT-02 update assertion
  //   Call updateRestaurant() and verify name/slug changes persist in the DB.
  // -------------------------------------------------------------------------
  const updateResult = await updateRestaurant({
    id: createdRestaurantId,
    name: 'Verify Resto Renamed',
    slug: testSlug,
  })

  if (!('success' in updateResult) || !updateResult.success) {
    throw new Error(`PLAT-02: updateRestaurant failed: ${JSON.stringify(updateResult)}`)
  }

  const [updatedRow] = await db.select().from(restaurants).where(eq(restaurants.id, createdRestaurantId))
  if (updatedRow.name !== 'Verify Resto Renamed') {
    throw new Error(`PLAT-02: expected name='Verify Resto Renamed', got '${updatedRow.name}'`)
  }
  console.log(`PLAT-02 PASS: updateRestaurant persisted name change to '${updatedRow.name}'`)

  // -------------------------------------------------------------------------
  // PLAT-03 toggle assertion
  //   Call toggleRestaurantActive() and verify is_active flips correctly.
  // -------------------------------------------------------------------------
  await toggleRestaurantActive(createdRestaurantId, false)
  const [inactiveRow] = await db.select().from(restaurants).where(eq(restaurants.id, createdRestaurantId))
  if (inactiveRow.isActive !== false) {
    throw new Error(`PLAT-03: expected is_active=false after deactivation, got ${inactiveRow.isActive}`)
  }

  await toggleRestaurantActive(createdRestaurantId, true)
  const [activeRow] = await db.select().from(restaurants).where(eq(restaurants.id, createdRestaurantId))
  if (activeRow.isActive !== true) {
    throw new Error(`PLAT-03: expected is_active=true after reactivation, got ${activeRow.isActive}`)
  }
  console.log(`PLAT-03 PASS: toggleRestaurantActive flipped is_active false→true correctly`)

  // -------------------------------------------------------------------------
  // PLAT-05 D-07 rollback assertion
  //   Simulate createRestaurant with an already-used email so
  //   auth.admin.createUser fails; assert no new restaurants row was created
  //   (transaction rolled back) and no orphaned auth user was left behind.
  //
  //   We reuse adminEmail (still exists in auth.users from PLAT-01),
  //   with a brand-new slug so the pre-check slug guard does NOT short-circuit.
  // -------------------------------------------------------------------------
  const rollbackSlug = `zz-rollback-${runId}`
  const rollbackResult = await createRestaurant({
    name: 'Verify Rollback',
    slug: rollbackSlug,
    adminEmail, // already-registered email → auth.admin.createUser will fail
  })

  if (!('error' in rollbackResult)) {
    throw new Error(`D-07: expected error result from duplicate-email createRestaurant, got success`)
  }

  // No restaurants row should have been created for rollbackSlug.
  const rollbackRows = await db.select().from(restaurants).where(eq(restaurants.slug, rollbackSlug))
  if (rollbackRows.length !== 0) {
    throw new Error(`D-07: expected 0 restaurants rows for slug=${rollbackSlug} after rollback, found ${rollbackRows.length}`)
  }

  // Confirm the original adminEmail still has exactly 1 auth user (no orphaned duplicates).
  const { data: listData } = await supabaseAdmin.auth.admin.listUsers()
  const usersWithEmail = listData?.users?.filter((u) => u.email === adminEmail) ?? []
  if (usersWithEmail.length !== 1) {
    throw new Error(`D-07: expected exactly 1 auth.user with email=${adminEmail}, found ${usersWithEmail.length}`)
  }
  console.log(`D-07 ROLLBACK PASS: auth-create-failure rolled back restaurants row, no orphaned auth user`)

  // -------------------------------------------------------------------------
  // CLEANUP
  //   Delete the test restaurant (cascade removes admin_users via FK onDelete cascade)
  //   and delete the created auth.users row via service-role admin client.
  // -------------------------------------------------------------------------
  await db.delete(restaurants).where(eq(restaurants.id, createdRestaurantId))

  if (createdAuthUserId) {
    await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId)
  }

  console.log(`CLEANUP PASS: test restaurant and auth user deleted`)
  console.log('ALL CHECKS PASSED')
}

main().then(() => process.exit(0)).catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
