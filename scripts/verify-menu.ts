// VERIFY-MENU -- Wave 0 regression script for the public menu data/format layer.
// Run with: npm run verify-menu
// Requires scripts/seed.ts to have been run first (at least 1 restaurant seeded).
//
// Assertions:
//   MENU slug-resolve: getRestaurantBySlug returns null for nonexistent/inactive slugs,
//                       non-null for an active seeded restaurant.
//   MENU-02:            getMenuForUnit returns categories ordered by sortOrder ascending.
//   MENU-03:             products marked unavailable at a unit are excluded from that unit's menu.
//   MENU-04:             featured array reflects only available + isFeatured products.
//   MENU-06 / D-13:       categories whose only product is unavailable are dropped entirely.
//   MENU-05:             formatBRL produces pt-BR currency strings.
//   MENU-07:             haversineDistanceKm returns correct great-circle distances.
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
  const { getRestaurantBySlug, getUnitsForRestaurant, getUnitBySlug, getMenuForUnit } = await import('../src/lib/menu/queries')
  const { formatBRL, haversineDistanceKm } = await import('../src/lib/menu/format')

  // -------------------------------------------------------------------------
  // Seed check: pick a test restaurant for relational fixtures.
  // -------------------------------------------------------------------------
  const [seedRestaurant] = await db.select().from(restaurants).limit(1)
  if (!seedRestaurant) {
    throw new Error('verify-menu: no restaurant seeded — run npm run seed first')
  }
  const restaurantId = seedRestaurant.id

  // -------------------------------------------------------------------------
  // CREATE FIXTURES: 2 categories, 3 products, 1 unit
  // -------------------------------------------------------------------------
  const runId = Date.now()

  const [catA] = await db.insert(categories).values({
    restaurantId,
    name: `ZZ Menu Cat A ${runId}`,
    sortOrder: 0,
  }).returning()

  const [catB] = await db.insert(categories).values({
    restaurantId,
    name: `ZZ Menu Cat B ${runId}`,
    sortOrder: 1,
  }).returning()

  const [featuredProd] = await db.insert(products).values({
    restaurantId,
    categoryId: catA.id,
    name: `ZZ Menu Featured Prod ${runId}`,
    description: 'verify-menu featured test product',
    price: '10.00',
    isFeatured: true,
    sortOrder: 0,
  }).returning()

  const [plainProd] = await db.insert(products).values({
    restaurantId,
    categoryId: catA.id,
    name: `ZZ Menu Plain Prod ${runId}`,
    description: 'verify-menu non-featured test product',
    price: '10.00',
    isFeatured: false,
    sortOrder: 1,
  }).returning()

  const [catBOnlyProd] = await db.insert(products).values({
    restaurantId,
    categoryId: catB.id,
    name: `ZZ Menu CatB Only Prod ${runId}`,
    description: 'verify-menu category-B sole product',
    price: '10.00',
    isFeatured: false,
    sortOrder: 0,
  }).returning()

  const [testUnit] = await db.insert(units).values({
    restaurantId,
    name: `ZZ Menu Unit ${runId}`,
    slug: `zz-menu-${runId}`,
    whatsappNumber: '+5511999990000',
    address: 'Rua Teste Menu',
    hours: 'Seg-Sex 9h-18h',
  }).returning()

  // -------------------------------------------------------------------------
  // ASSERTION: SLUG RESOLVE (nonexistent / inactive / active)
  // -------------------------------------------------------------------------
  const nonexistent = await getRestaurantBySlug(`zzz-does-not-exist-${runId}`)
  if (nonexistent !== null) {
    throw new Error(`MENU slug-resolve FAIL: expected null for nonexistent slug, got ${JSON.stringify(nonexistent)}`)
  }

  const activeResolved = await getRestaurantBySlug(seedRestaurant.slug)
  if (!activeResolved) {
    throw new Error('MENU slug-resolve FAIL: expected non-null for seeded active restaurant slug')
  }

  if (seedRestaurant.isActive === true) {
    await db.update(restaurants).set({ isActive: false }).where(eq(restaurants.id, restaurantId))
    const inactiveResolved = await getRestaurantBySlug(seedRestaurant.slug)
    if (inactiveResolved !== null) {
      throw new Error(`MENU slug-resolve FAIL: expected null while restaurant inactive, got ${JSON.stringify(inactiveResolved)}`)
    }
    await db.update(restaurants).set({ isActive: true }).where(eq(restaurants.id, restaurantId))
  }
  console.log('MENU slug-resolve PASS')

  // -------------------------------------------------------------------------
  // Sanity: getUnitsForRestaurant / getUnitBySlug resolve the test unit.
  // -------------------------------------------------------------------------
  const unitsForRestaurant = await getUnitsForRestaurant(restaurantId)
  if (!unitsForRestaurant.some((u) => u.id === testUnit.id)) {
    throw new Error('MENU units FAIL: expected getUnitsForRestaurant to include test unit')
  }

  const unitBySlug = await getUnitBySlug(restaurantId, testUnit.slug)
  if (!unitBySlug || unitBySlug.id !== testUnit.id) {
    throw new Error('MENU units FAIL: expected getUnitBySlug to resolve test unit by slug')
  }
  console.log('MENU units PASS')

  // -------------------------------------------------------------------------
  // ASSERTION MENU-02: categories ordered by sortOrder ascending.
  // -------------------------------------------------------------------------
  const menuInitial = await getMenuForUnit(restaurantId, testUnit.id)
  const testCats = menuInitial.categories.filter((c) => c.id === catA.id || c.id === catB.id)
  for (let i = 1; i < testCats.length; i++) {
    if (testCats[i].sortOrder < testCats[i - 1].sortOrder) {
      throw new Error('MENU-02 FAIL: categories not ordered by sortOrder ascending')
    }
  }
  if (testCats.length !== 2) {
    throw new Error(`MENU-02 FAIL: expected both test categories present initially, got ${testCats.length}`)
  }
  console.log('MENU-02 PASS')

  // -------------------------------------------------------------------------
  // ASSERTION MENU-03: marking the featured product unavailable excludes it.
  // -------------------------------------------------------------------------
  await db.insert(productAvailability).values({ productId: featuredProd.id, unitId: testUnit.id }).onConflictDoNothing()

  const menuAfterUnavailable = await getMenuForUnit(restaurantId, testUnit.id)
  const allProductIdsAfterUnavailable = menuAfterUnavailable.categories.flatMap((c) => c.products.map((p) => p.id))
  if (allProductIdsAfterUnavailable.includes(featuredProd.id)) {
    throw new Error('MENU-03 FAIL: expected unavailable product to be excluded from getMenuForUnit')
  }
  console.log('MENU-03 PASS')

  // -------------------------------------------------------------------------
  // ASSERTION MENU-04: featured array reflects only available + isFeatured products.
  // -------------------------------------------------------------------------
  await db.delete(productAvailability).where(and(
    eq(productAvailability.productId, featuredProd.id),
    eq(productAvailability.unitId, testUnit.id),
  ))

  const menuAfterAvailable = await getMenuForUnit(restaurantId, testUnit.id)
  const featuredIds = menuAfterAvailable.featured.map((p) => p.id)
  if (!featuredIds.includes(featuredProd.id)) {
    throw new Error('MENU-04 FAIL: expected available featured product in featured array')
  }
  if (featuredIds.includes(plainProd.id)) {
    throw new Error('MENU-04 FAIL: expected non-featured product to be absent from featured array')
  }
  console.log('MENU-04 PASS')

  // -------------------------------------------------------------------------
  // ASSERTION MENU-06 / D-13: category whose only product is unavailable is dropped.
  // -------------------------------------------------------------------------
  await db.insert(productAvailability).values({ productId: catBOnlyProd.id, unitId: testUnit.id }).onConflictDoNothing()

  const menuAfterCatBEmpty = await getMenuForUnit(restaurantId, testUnit.id)
  if (menuAfterCatBEmpty.categories.some((c) => c.id === catB.id)) {
    throw new Error('MENU-06 FAIL: expected category with only-unavailable product to be absent (D-13)')
  }
  console.log('MENU-06 PASS')

  // Restore catB availability before cleanup (not strictly required, but tidy).
  await db.delete(productAvailability).where(and(
    eq(productAvailability.productId, catBOnlyProd.id),
    eq(productAvailability.unitId, testUnit.id),
  ))

  // -------------------------------------------------------------------------
  // ASSERTION MENU-05: formatBRL produces pt-BR currency strings.
  // -------------------------------------------------------------------------
  const formatted1 = formatBRL(12.5)
  if (!formatted1.startsWith('R$') || !formatted1.includes('12,50')) {
    throw new Error(`MENU-05 FAIL: formatBRL(12.5) = ${JSON.stringify(formatted1)}`)
  }
  const formatted2 = formatBRL(1234.5)
  if (!formatted2.includes('1.234,50')) {
    throw new Error(`MENU-05 FAIL: formatBRL(1234.5) = ${JSON.stringify(formatted2)}`)
  }
  console.log('MENU-05 PASS')

  // -------------------------------------------------------------------------
  // ASSERTION MENU-07: haversineDistanceKm returns correct great-circle distances.
  // -------------------------------------------------------------------------
  const dZero = haversineDistanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })
  if (dZero !== 0) {
    throw new Error(`MENU-07 FAIL: expected 0 for identical points, got ${dZero}`)
  }
  const dSpRj = haversineDistanceKm({ lat: -23.5505, lng: -46.6333 }, { lat: -22.9068, lng: -43.1729 })
  if (dSpRj < 355 || dSpRj > 365) {
    throw new Error(`MENU-07 FAIL: expected SP-RJ distance within 355..365 km, got ${dSpRj}`)
  }
  console.log('MENU-07 PASS')

  // -------------------------------------------------------------------------
  // CLEANUP: delete inserted productAvailability rows, products, categories, unit.
  // -------------------------------------------------------------------------
  await db.delete(productAvailability).where(eq(productAvailability.unitId, testUnit.id))
  await db.delete(products).where(and(eq(products.restaurantId, restaurantId), eq(products.categoryId, catA.id)))
  await db.delete(products).where(and(eq(products.restaurantId, restaurantId), eq(products.categoryId, catB.id)))
  await db.delete(categories).where(and(eq(categories.id, catA.id), eq(categories.restaurantId, restaurantId)))
  await db.delete(categories).where(and(eq(categories.id, catB.id), eq(categories.restaurantId, restaurantId)))
  await db.delete(units).where(and(eq(units.id, testUnit.id), eq(units.restaurantId, restaurantId)))

  console.log('ALL CHECKS PASSED')
}

main().then(() => process.exit(0)).catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
