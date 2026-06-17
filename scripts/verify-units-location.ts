// VERIFY-UNITS-LOCATION -- Wave 0 integration tests for Phase 04.1 unit geolocation.
// Run with: npm run verify-units-location
// Requires scripts/seed.ts to have been run first (at least 1 restaurant seeded).
//
// Assertions:
//   LOCATION-NULL:     unit inserted without lat/lng persists lat/lng as null
//   LOCATION-PERSIST:  unit inserted WITH lat/lng round-trips as JS numbers (mode:'number')
//   GEOCODE-SUCCESS:   geocodeAddress() resolves a real address to {lat,lng} numbers (Plan 02+)
//   GEOCODE-NOTFOUND:  geocodeAddress() returns null for a nonsense address (Plan 02+)
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { dirname, join } from 'path'

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

async function main() {
  // Dynamic imports AFTER config() -- src/db/index.ts reads DATABASE_URL_RUNTIME
  // at module-evaluation time, so static ESM imports would be hoisted above dotenv.
  const { db } = await import('../src/db')
  const { restaurants, units } = await import('../src/db/schema')
  const { eq, and } = await import('drizzle-orm')

  // -------------------------------------------------------------------------
  // Seed check: pick a test restaurant for relational fixtures.
  // -------------------------------------------------------------------------
  const [seedRestaurant] = await db.select().from(restaurants).limit(1)
  if (!seedRestaurant) {
    throw new Error('verify-units-location: no restaurant seeded — run npm run seed first')
  }
  const restaurantId = seedRestaurant.id
  const runId = Date.now()

  // -------------------------------------------------------------------------
  // ASSERTION 1: LOCATION-NULL
  // Insert a unit with NO lat/lng => persists as null (Phase-3 units stay valid).
  // -------------------------------------------------------------------------
  const [u1] = await db.insert(units).values({
    restaurantId,
    name: `ZZ Loc NoGeo ${runId}`,
    slug: `zz-loc-nogeo-${runId}`,
    whatsappNumber: '+5511999990000',
  }).returning()

  if (u1.lat !== null || u1.lng !== null) {
    throw new Error(`LOCATION-NULL FAIL: expected null lat/lng, got ${u1.lat}/${u1.lng}`)
  }
  console.log('LOCATION-NULL PASS')

  // -------------------------------------------------------------------------
  // ASSERTION 2: LOCATION-PERSIST
  // Insert a unit WITH lat/lng => round-trips as JS numbers (mode:'number'), not strings.
  // -------------------------------------------------------------------------
  const [u2] = await db.insert(units).values({
    restaurantId,
    name: `ZZ Loc Geo ${runId}`,
    slug: `zz-loc-geo-${runId}`,
    whatsappNumber: '+5511999990000',
    lat: -23.5505,
    lng: -46.6333,
  }).returning()

  if (
    typeof u2.lat !== 'number'
    || typeof u2.lng !== 'number'
    || Math.abs(u2.lat - -23.5505) >= 0.0001
    || Math.abs(u2.lng - -46.6333) >= 0.0001
  ) {
    throw new Error(`LOCATION-PERSIST FAIL: expected number -23.5505/-46.6333, got ${typeof u2.lat} ${u2.lat}/${u2.lng}`)
  }
  console.log('LOCATION-PERSIST PASS')

  // -------------------------------------------------------------------------
  // ASSERTION 3: GEOCODE-SUCCESS / GEOCODE-NOTFOUND
  // Live network call to Nominatim, gated so a missing module (geocode.ts is
  // created in Plan 02) or network failure doesn't false-fail the schema checks.
  // -------------------------------------------------------------------------
  try {
    const { geocodeAddress } = await import('../src/lib/units/geocode')
    const ok = await geocodeAddress('Avenida Paulista, Sao Paulo, Brazil')
    if (!ok || typeof ok.lat !== 'number' || typeof ok.lng !== 'number') {
      throw new Error(`GEOCODE-SUCCESS FAIL: expected {lat,lng}, got ${JSON.stringify(ok)}`)
    }
    console.log('GEOCODE-SUCCESS PASS')

    // Respect Nominatim's 1 req/sec policy between sequential calls.
    await new Promise((r) => setTimeout(r, 1100))

    const bad = await geocodeAddress('zzzqxqxqx not a real place 999888')
    if (bad !== null) {
      throw new Error(`GEOCODE-NOTFOUND FAIL: expected null, got ${JSON.stringify(bad)}`)
    }
    console.log('GEOCODE-NOTFOUND PASS')
  } catch (e) {
    if (e instanceof Error && e.message.includes('Cannot find module')) {
      console.log('GEOCODE SKIP (geocode.ts not created yet — Plan 02)')
    } else {
      throw e
    }
  }

  // -------------------------------------------------------------------------
  // CLEANUP: delete both test units.
  // -------------------------------------------------------------------------
  await db.delete(units).where(and(eq(units.id, u1.id), eq(units.restaurantId, restaurantId)))
  await db.delete(units).where(and(eq(units.id, u2.id), eq(units.restaurantId, restaurantId)))

  console.log('ALL CHECKS PASSED')
}

main().then(() => process.exit(0)).catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
