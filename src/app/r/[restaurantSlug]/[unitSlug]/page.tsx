import { notFound } from 'next/navigation'
import { getRestaurantBySlug, getUnitBySlug, getMenuForUnit } from '@/lib/menu/queries'
import MenuView from './menu-view'
import CartFab from './cart-fab'

export default async function MenuPage({
  params,
}: {
  params: Promise<{ restaurantSlug: string; unitSlug: string }>
}) {
  const { restaurantSlug, unitSlug } = await params
  const restaurant = await getRestaurantBySlug(restaurantSlug)
  if (!restaurant) notFound() // D-12

  const unit = await getUnitBySlug(restaurant.id, unitSlug)
  if (!unit) notFound() // D-12

  const { categories, featured } = await getMenuForUnit(restaurant.id, unit.id)

  return (
    <>
      <MenuView unitName={unit.name} categories={categories} featured={featured} />
      <CartFab
        unitName={unit.name}
        restaurantName={restaurant.name}
        whatsappNumber={unit.whatsappNumber}
      />
    </>
  )
}
