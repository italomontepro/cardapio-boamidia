// VERIFY-CATALOG -- integration stub for Phase 3 catalog setup (03-01).
// Run with: npx tsx scripts/verify-catalog.ts
// Requires scripts/seed.ts to have been run first (at least 1 restaurant seeded in Phase 1).
//
// Later plans extend this script with per-requirement assertions:
//   03-02: UNIT-01..03 unit CRUD assertions
//   03-03: CTLG-01..05 category/product CRUD assertions
//   03-04: CTLG-02/06 photo upload assertions
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
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
const secretKey = process.env.SUPABASE_SECRET_KEY!

// Suppress unused-variable warnings — url/secretKey used by later plan extensions.
void url; void secretKey; void ws;

async function main() {
  // Dynamic imports AFTER config() -- src/db/index.ts reads DATABASE_URL_RUNTIME
  // at module-evaluation time, so static ESM imports would be hoisted above dotenv.
  const { db } = await import('../src/db')
  const { restaurants, units, categories, products } = await import('../src/db/schema')
  const { eq, asc } = await import('drizzle-orm')

  // Suppress unused-variable warnings — asc/products used by later plan extensions.
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
    throw new Error('verify-catalog: no restaurant seeded — run npm run seed first')
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

  console.log('ALL CHECKS PASSED')
}

main().then(() => process.exit(0)).catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
