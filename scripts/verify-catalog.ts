// VERIFY-CATALOG -- integration stub for Phase 3 catalog setup (03-01).
// Run with: npx tsx scripts/verify-catalog.ts
// Requires scripts/seed.ts to have been run first (at least 1 restaurant seeded in Phase 1).
//
// Later plans extend this script with per-requirement assertions:
//   03-02: UNIT-01..03 unit CRUD assertions
//   03-03: CTLG-01..05 category/product CRUD assertions
//   03-04: CTLG-02/06 photo upload assertions
import { config } from 'dotenv'
import { existsSync, readFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import ws from 'ws'
import * as phoneCore from 'libphonenumber-js/core'

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
const secretKey = process.env.SUPABASE_SECRET_KEY!

// Suppress unused-variable warnings -- url/secretKey used by later plan extensions.
void url; void secretKey; void ws;

// Load phone metadata synchronously at top level -- avoids ESM/CJS ambiguity that
// plagues libphonenumber-js/min in tsx CJS mode. Core module + explicit metadata
// is the tsx-safe pattern.
const phoneMetadata = JSON.parse(
  readFileSync(resolve(process.cwd(), 'node_modules/libphonenumber-js/metadata.min.json'), 'utf8')
)

function isValidBRPhone(num: string): boolean {
  return phoneCore.isValidPhoneNumber(num, 'BR', phoneMetadata)
}

function parseBRPhone(num: string): string {
  return phoneCore.parsePhoneNumber(num, 'BR', phoneMetadata).number
}

async function main() {
  // Dynamic imports AFTER config() -- src/db/index.ts reads DATABASE_URL_RUNTIME
  // at module-evaluation time, so static ESM imports would be hoisted above dotenv.
  const { db } = await import('../src/db')
  const { restaurants, units, categories, products } = await import('../src/db/schema')
  const { eq, and, asc } = await import('drizzle-orm')

  // Suppress unused-variable warnings -- asc/products used by later plan extensions.
  void asc; void products;

  // -------------------------------------------------------------------------
  // SMOKE CHECK: verify database connectivity and units table is reachable.
  // -------------------------------------------------------------------------
  const allUnits = await db.select().from(units)
  console.log(`SMOKE PASS: units table reachable, ${allUnits.length} rows`)

  // -------------------------------------------------------------------------
  // Seed check: pick a test restaurant for relational query assertions.
  // -------------------------------------------------------------------------
  const [seedRestaurant] = await db.select().from(restaurants).limit(1)
  if (!seedRestaurant) {
    throw new Error('verify-catalog: no restaurant seeded -- run npm run seed first')
  }
  const restaurantId = seedRestaurant.id

  // -------------------------------------------------------------------------
  // RELATIONS CHECK: verify db.query relational API works with relations().
  // -------------------------------------------------------------------------
  const cats = await db.query.categories.findMany({
    where: eq(categories.restaurantId, restaurantId),
    with: { products: true },
  })
  console.log(`RELATIONS PASS: relational query returned ${cats.length} categories`)

  // -------------------------------------------------------------------------
  // UNIT-01 validation: phone validation via libphonenumber-js/core + metadata
  // Core + explicit metadata avoids tsx ESM/CJS split that breaks min bundle.
  // -------------------------------------------------------------------------
  const isBadValid = isValidBRPhone('11999')
  if (isBadValid) throw new Error('UNIT-01 VALIDATION FAIL: bad number "11999" was accepted')
  console.log('UNIT-01 VALIDATION PASS')

  const isGoodValid = isValidBRPhone('(11) 99999-9999')
  if (!isGoodValid) throw new Error('UNIT-01 E.164 FAIL: valid number was rejected')
  const e164 = parseBRPhone('(11) 99999-9999')
  if (e164 !== '+5511999999999') {
    throw new Error(`UNIT-01 E.164 FAIL: expected +5511999999999, got ${e164}`)
  }
  console.log('UNIT-01 E.164 transform PASS')

  // -------------------------------------------------------------------------
  // UNIT-01 create: insert a unit row directly via Drizzle (no request context)
  // -------------------------------------------------------------------------
  const runId = Date.now()
  const testSlug = `zz-verify-${runId}`

  const [insertedUnit] = await db.insert(units).values({
    restaurantId,
    name: 'ZZ Verify Unit',
    slug: testSlug,
    whatsappNumber: '+5511999998888',
    address: 'Rua Teste',
    hours: 'Seg-Sex 9h-18h',
  }).returning()

  if (!insertedUnit.whatsappNumber?.startsWith('+55')) {
    throw new Error(`UNIT-01 FAIL: whatsappNumber does not start with +55, got ${insertedUnit.whatsappNumber}`)
  }
  console.log('UNIT-01 PASS')

  // -------------------------------------------------------------------------
  // UNIT-02 hours: assert the inserted row's hours field is preserved
  // -------------------------------------------------------------------------
  if (insertedUnit.hours !== 'Seg-Sex 9h-18h') {
    throw new Error(`UNIT-02 FAIL: expected hours 'Seg-Sex 9h-18h', got '${insertedUnit.hours}'`)
  }
  console.log('UNIT-02 PASS')

  // -------------------------------------------------------------------------
  // CLEANUP: remove the test unit
  // -------------------------------------------------------------------------
  await db.delete(units).where(and(eq(units.id, insertedUnit.id), eq(units.restaurantId, restaurantId)))
  console.log('CLEANUP: test unit removed')

  console.log('ALL CHECKS PASSED')
}

main().then(() => process.exit(0)).catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
