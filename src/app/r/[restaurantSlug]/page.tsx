import { notFound, redirect } from 'next/navigation'
import { getRestaurantBySlug, getUnitsForRestaurant } from '@/lib/menu/queries'
import UnitPicker from './unit-picker'

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params
  const restaurant = await getRestaurantBySlug(restaurantSlug)
  if (!restaurant) notFound() // D-12: nonexistent or inactive

  const restaurantUnits = await getUnitsForRestaurant(restaurant.id)

  if (restaurantUnits.length === 0) {
    // MENU-06: valid restaurant, no units yet — graceful empty state, NOT a 404.
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold">{restaurant.name}</h1>
        <p className="text-muted-foreground">
          Este restaurante ainda não tem unidades cadastradas.
        </p>
      </main>
    )
  }

  if (restaurantUnits.length === 1) {
    redirect(`/r/${restaurantSlug}/${restaurantUnits[0].slug}`) // D-02
  }

  return (
    <UnitPicker
      restaurantSlug={restaurantSlug}
      restaurantName={restaurant.name}
      units={restaurantUnits}
    /> // D-01/D-03/D-04
  )
}
