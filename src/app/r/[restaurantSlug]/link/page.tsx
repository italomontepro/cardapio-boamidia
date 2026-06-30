import { notFound } from 'next/navigation'
import { getRestaurantBySlug, getUnitsForRestaurant } from '@/lib/menu/queries'
import { buildWhatsAppUrl } from '@/lib/menu/whatsapp'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function LinkPage({
  params,
}: {
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params
  const restaurant = await getRestaurantBySlug(restaurantSlug)
  if (!restaurant) notFound()

  const restaurantUnits = await getUnitsForRestaurant(restaurant.id)

  if (restaurantUnits.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold">{restaurant.name}</h1>
        <p className="text-muted-foreground">
          Este restaurante ainda não tem unidades cadastradas.
        </p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-4 py-10 sm:py-16">
      <div className="flex w-full max-w-md flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-center text-2xl font-bold tracking-tight">
            {restaurant.name}
          </h1>
          <p className="text-center text-sm text-muted-foreground">
            Escolha uma unidade e fale com a gente no WhatsApp
          </p>
        </div>

        {/* Units list */}
        <div className="flex flex-col gap-3">
          {restaurantUnits.map((unit) => {
            const message = `Olá! Vim pelo link e gostaria de fazer um pedido da unidade ${unit.name}.`

            if (unit.whatsappNumber) {
              return (
                <a
                  key={unit.id}
                  href={buildWhatsAppUrl(unit.whatsappNumber, message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'h-auto w-full justify-center whitespace-normal rounded-full py-4 text-base font-semibold shadow-sm',
                  )}
                >
                  <span className="flex flex-col items-center">
                    <span>{unit.name}</span>
                    {unit.address && (
                      <span className="text-xs font-normal opacity-80">
                        {unit.address}
                      </span>
                    )}
                  </span>
                </a>
              )
            }

            return (
              <div
                key={unit.id}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'h-auto w-full cursor-not-allowed justify-center whitespace-normal rounded-full py-4 text-base opacity-50',
                )}
                aria-disabled="true"
              >
                <span className="flex flex-col items-center">
                  <span>{unit.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    WhatsApp indisponível
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
