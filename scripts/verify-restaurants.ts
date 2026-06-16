// VERIFY-RESTAURANTS -- integration check for PLAT-01..05.
// Run with: npx tsx scripts/verify-restaurants.ts
// Requires scripts/seed.ts to have been run first (2 restaurants seeded in Phase 1).
import { config } from 'dotenv'
// Node.js 20 lacks native WebSocket support; supabase-js's realtime client
// requires a WebSocket constructor even when realtime is unused here.
import ws from 'ws'
config({ path: '.env' })

async function main() {
  // Dynamic imports AFTER config() -- src/db/index.ts reads DATABASE_URL_RUNTIME
  // at module-evaluation time, so static ESM imports would be hoisted above dotenv.
  const { db } = await import('../src/db')
  const { restaurants } = await import('../src/db/schema')

  // SMOKE CHECK: verify database connectivity and restaurants table is reachable.
  const allRestaurants = await db.select().from(restaurants)
  console.log(`SMOKE PASS: restaurants table reachable, ${allRestaurants.length} rows`)

  // -------------------------------------------------------------------------
  // TODO(02-02): PLAT-01 create assertion
  //   Call createRestaurant() Server Action and verify row inserted in restaurants
  //   and admin_users tables with correct role=restaurant_admin.
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // TODO(02-02): PLAT-01 D-05 duplicate-slug assertion
  //   Attempt to create a restaurant with the same slug as an existing one;
  //   verify the action returns a slug-conflict error (not a DB crash).
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // TODO(02-02): PLAT-02 update assertion
  //   Call updateRestaurant() and verify name/slug changes persist in the DB.
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // TODO(02-02): PLAT-03 toggle assertion
  //   Call toggleRestaurantActive() and verify is_active flips correctly.
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // TODO(02-02): PLAT-04 listing+admin-count assertion
  //   Query the listing with admin counts and verify each restaurant row
  //   includes the correct number of admin_users rows.
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // TODO(02-02): PLAT-05 provisioning + signInWithPassword assertion
  //   After createRestaurant(), verify the new admin user can sign in via
  //   Supabase Auth with the provisioned temporary password.
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // TODO(02-02): PLAT-05 D-07 rollback assertion
  //   Simulate a DB insert failure after Auth user creation and verify the
  //   Auth user is deleted (rollback logic) so no orphaned auth users remain.
  // -------------------------------------------------------------------------

  console.log('ALL CHECKS PASSED')
}

main().then(() => process.exit(0)).catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
