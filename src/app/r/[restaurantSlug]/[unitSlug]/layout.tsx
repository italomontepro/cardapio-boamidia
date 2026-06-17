import { notFound } from 'next/navigation'
import { getRestaurantBySlug, getUnitBySlug } from '@/lib/menu/queries'
import { CartProvider } from './cart-provider'

export default async function UnitLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ restaurantSlug: string; unitSlug: string }>
}) {
  const { restaurantSlug, unitSlug } = await params
  const restaurant = await getRestaurantBySlug(restaurantSlug)
  if (!restaurant) notFound() // D-12: invalid/inactive restaurant slug

  const unit = await getUnitBySlug(restaurant.id, unitSlug)
  if (!unit) notFound() // D-12: invalid unit slug for this restaurant

  return <CartProvider storageKey={`cart:${restaurant.id}:${unit.id}`}>{children}</CartProvider>
}
