// VERIFY-AVAILABILITY -- integration tests for Phase 4 CTLG-07 sparse-table semantics.
// Run with: npm run verify-availability
// Requires scripts/seed.ts to have been run first (at least 1 restaurant seeded).
//
// Assertions (SPARSE-EXCLUSION model: row present = UNAVAILABLE, row absent = AVAILABLE):
//   CTLG-07 DEFAULT:     absence of row = product available (no insert yet)
//   CTLG-07 INSERT:      INSERT row -> exactly 1 row -> product now unavailable
//   CTLG-07 IDEMPOTENT:  second INSERT with onConflictDoNothing -> still 1 row (no error)
//   CTLG-07 ISOLATION:   toggling unitA does NOT affect unitB
//   CTLG-07 DELETE:      DELETE row -> 0 rows -> product available again
//   CTLG-07 DELETE-NOOP: second DELETE -> no error, still 0 rows
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
  const { restaurants, units, categories, products, productAvailability } = await import('../src/db/schema')
  const { eq, and } = await import('drizzle-orm')

  // -------------------------------------------------------------------------
  // Seed check: pick a test restaurant for relational fixtures.
  // -------------------------------------------------------------------------
  const [seedRestaurant] = await db.select().from(restaurants).limit(1)
  if (!seedRestaurant) {
    throw new Error('verify-availability: no restaurant seeded — run npm run seed first')
  }
  const restaurantId = seedRestaurant.id

  // -------------------------------------------------------------------------
  // CREATE FIXTURES: 1 category, 1 product, 2 units
  // -------------------------------------------------------------------------
  const runId = Date.now()

  const [testCat] = await db.insert(categories).values({
    restaurantId,
    name: `ZZ Avail Cat ${runId}`,
    sortOrder: 999,
  }).returning()

  const [testProd] = await db.insert(products).values({
    restaurantId,
    categoryId: testCat.id,
    name: `ZZ Avail Prod ${runId}`,
    description: 'verify-availability test product',
    price: '10.00',
    isFeatured: false,
    sortOrder: 0,
  }).returning()

  const [unitA] = await db.insert(units).values({
    restaurantId,
    name: `ZZ Avail Unit A ${runId}`,
    slug: `zz-avail-a-${runId}`,
    whatsappNumber: '+5511999990000',
    address: 'Rua Teste A',
    hours: 'Seg-Sex 9h-18h',
  }).returning()

  const [unitB] = await db.insert(units).values({
    restaurantId,
    name: `ZZ Avail Unit B ${runId}`,
    slug: `zz-avail-b-${runId}`,
    whatsappNumber: '+5511999990000',
    address: 'Rua Teste B',
    hours: 'Seg-Sex 9h-18h',
  }).returning()

  // -------------------------------------------------------------------------
  // ASSERTION 1: DEFAULT=AVAILABLE
  // Before any insert, no row for (prod, unitA) => product is available.
  // -------------------------------------------------------------------------
  const rowsBefore = await db
    .select()
    .from(productAvailability)
    .where(and(
      eq(productAvailability.productId, testProd.id),
      eq(productAvailability.unitId, unitA.id),
    ))

  if (rowsBefore.length !== 0) {
    throw new Error(`CTLG-07 DEFAULT FAIL: expected 0 rows before insert, got ${rowsBefore.length}`)
  }
  console.log('CTLG-07 DEFAULT PASS')

  // -------------------------------------------------------------------------
  // ASSERTION 2: MARK UNAVAILABLE (INSERT)
  // INSERT row for (prod, unitA) => product is now unavailable at unitA.
  // -------------------------------------------------------------------------
  await db
    .insert(productAvailability)
    .values({ productId: testProd.id, unitId: unitA.id })
    .onConflictDoNothing()

  const rowsAfterInsert = await db
    .select()
    .from(productAvailability)
    .where(and(
      eq(productAvailability.productId, testProd.id),
      eq(productAvailability.unitId, unitA.id),
    ))

  if (rowsAfterInsert.length !== 1) {
    throw new Error(`CTLG-07 INSERT FAIL: expected 1 row after insert, got ${rowsAfterInsert.length}`)
  }
  console.log('CTLG-07 INSERT PASS')

  // -------------------------------------------------------------------------
  // ASSERTION 3: IDEMPOTENT INSERT
  // Second INSERT with onConflictDoNothing => still exactly 1 row (no error, no duplicate).
  // -------------------------------------------------------------------------
  await db
    .insert(productAvailability)
    .values({ productId: testProd.id, unitId: unitA.id })
    .onConflictDoNothing()

  const rowsAfterSecondInsert = await db
    .select()
    .from(productAvailability)
    .where(and(
      eq(productAvailability.productId, testProd.id),
      eq(productAvailability.unitId, unitA.id),
    ))

  if (rowsAfterSecondInsert.length !== 1) {
    throw new Error(`CTLG-07 IDEMPOTENT FAIL: expected 1 row after second insert, got ${rowsAfterSecondInsert.length}`)
  }
  console.log('CTLG-07 IDEMPOTENT PASS')

  // -------------------------------------------------------------------------
  // ASSERTION 4: UNIT ISOLATION
  // Toggling unitA does NOT affect unitB — unitB row should still be absent.
  // -------------------------------------------------------------------------
  const rowsUnitB = await db
    .select()
    .from(productAvailability)
    .where(and(
      eq(productAvailability.productId, testProd.id),
      eq(productAvailability.unitId, unitB.id),
    ))

  if (rowsUnitB.length !== 0) {
    throw new Error(`CTLG-07 ISOLATION FAIL: expected 0 rows for unitB, got ${rowsUnitB.length}`)
  }
  console.log('CTLG-07 ISOLATION PASS')

  // -------------------------------------------------------------------------
  // ASSERTION 5: MARK AVAILABLE (DELETE)
  // DELETE row for (prod, unitA) => product is available again (0 rows).
  // -------------------------------------------------------------------------
  await db
    .delete(productAvailability)
    .where(and(
      eq(productAvailability.productId, testProd.id),
      eq(productAvailability.unitId, unitA.id),
    ))

  const rowsAfterDelete = await db
    .select()
    .from(productAvailability)
    .where(and(
      eq(productAvailability.productId, testProd.id),
      eq(productAvailability.unitId, unitA.id),
    ))

  if (rowsAfterDelete.length !== 0) {
    throw new Error(`CTLG-07 DELETE FAIL: expected 0 rows after delete, got ${rowsAfterDelete.length}`)
  }
  console.log('CTLG-07 DELETE PASS')

  // -------------------------------------------------------------------------
  // ASSERTION 6: DELETE NON-EXISTENT IS NO-OP
  // Second DELETE should not throw and still leave 0 rows.
  // -------------------------------------------------------------------------
  await db
    .delete(productAvailability)
    .where(and(
      eq(productAvailability.productId, testProd.id),
      eq(productAvailability.unitId, unitA.id),
    ))

  const rowsAfterNoopDelete = await db
    .select()
    .from(productAvailability)
    .where(and(
      eq(productAvailability.productId, testProd.id),
      eq(productAvailability.unitId, unitA.id),
    ))

  if (rowsAfterNoopDelete.length !== 0) {
    throw new Error(`CTLG-07 DELETE-NOOP FAIL: expected 0 rows after noop delete, got ${rowsAfterNoopDelete.length}`)
  }
  console.log('CTLG-07 DELETE-NOOP PASS')

  // -------------------------------------------------------------------------
  // CLEANUP: delete test product, category, and both units.
  // product_availability rows cascade on product/unit delete, but assertion 5
  // already cleared the only row we inserted.
  // -------------------------------------------------------------------------
  await db.delete(products).where(and(eq(products.id, testProd.id), eq(products.restaurantId, restaurantId)))
  await db.delete(categories).where(and(eq(categories.id, testCat.id), eq(categories.restaurantId, restaurantId)))
  await db.delete(units).where(and(eq(units.id, unitA.id), eq(units.restaurantId, restaurantId)))
  await db.delete(units).where(and(eq(units.id, unitB.id), eq(units.restaurantId, restaurantId)))

  console.log('ALL CHECKS PASSED')
}

main().then(() => process.exit(0)).catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
