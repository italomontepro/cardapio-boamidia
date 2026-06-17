import { db } from '@/db'
import { restaurants, units, categories, products, productAvailability } from '@/db/schema'
import { eq, and, asc } from 'drizzle-orm'

export async function getRestaurantBySlug(slug: string) {
  const restaurant = await db.query.restaurants.findFirst({
    where: and(eq(restaurants.slug, slug), eq(restaurants.isActive, true)),
  })
  return restaurant ?? null
}

export async function getUnitsForRestaurant(restaurantId: string) {
  return db.query.units.findMany({
    where: eq(units.restaurantId, restaurantId),
    orderBy: [asc(units.name)],
  })
}

export async function getUnitBySlug(restaurantId: string, unitSlug: string) {
  const unit = await db.query.units.findFirst({
    where: and(eq(units.restaurantId, restaurantId), eq(units.slug, unitSlug)),
  })
  return unit ?? null
}

export async function getMenuForUnit(restaurantId: string, unitId: string) {
  const categoriesWithProducts = await db.query.categories.findMany({
    where: eq(categories.restaurantId, restaurantId),
    orderBy: [asc(categories.sortOrder)],
    with: { products: { orderBy: [asc(products.sortOrder)] } },
  })

  const unavailableRows = await db
    .select({ productId: productAvailability.productId })
    .from(productAvailability)
    .where(eq(productAvailability.unitId, unitId))
  const unavailableIds = new Set(unavailableRows.map((r) => r.productId))

  const categoriesFiltered = categoriesWithProducts
    .map((cat) => ({
      ...cat,
      products: cat.products.filter((p) => !unavailableIds.has(p.id)),
    }))
    .filter((cat) => cat.products.length > 0) // D-13: hide empty categories entirely

  const featured = categoriesFiltered.flatMap((c) => c.products).filter((p) => p.isFeatured)

  return { categories: categoriesFiltered, featured }
}
