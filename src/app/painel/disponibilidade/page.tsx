import { db } from '@/db'
import { categories, products, units, productAvailability } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { getCurrentAdmin } from '@/lib/auth/session'
import AvailabilityMatrix from './availability-matrix'
import AvailabilityMobile from './availability-mobile'

export default async function DisponibilidadePage() {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return null

  const restaurantUnits = await db.query.units.findMany({
    where: eq(units.restaurantId, admin.restaurantId),
    orderBy: [asc(units.name)],
  })

  const categoriesWithProducts = await db.query.categories.findMany({
    where: eq(categories.restaurantId, admin.restaurantId),
    orderBy: [asc(categories.sortOrder)],
    with: {
      products: { orderBy: [asc(products.sortOrder)] },
    },
  })

  const unavailableRows = await db
    .select({ productId: productAvailability.productId, unitId: productAvailability.unitId })
    .from(productAvailability)
    .innerJoin(products, eq(productAvailability.productId, products.id))
    .where(eq(products.restaurantId, admin.restaurantId))

  const unavailableKeys = unavailableRows.map((r) => `${r.productId}:${r.unitId}`)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Disponibilidade por Unidade</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Controle quais produtos estão disponíveis em cada unidade.{' '}
        Produtos sem configuração explícita são exibidos como disponíveis por padrão.
      </p>

      {restaurantUnits.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-12 text-center">
          <p className="text-sm font-medium text-foreground">Nenhuma unidade cadastrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre pelo menos uma unidade em{' '}
            <a href="/painel/unidades" className="underline underline-offset-2">Unidades</a>{' '}
            para gerenciar a disponibilidade.
          </p>
        </div>
      ) : categoriesWithProducts.every((c) => c.products.length === 0) ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-12 text-center">
          <p className="text-sm font-medium text-foreground">Nenhum produto cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione produtos em{' '}
            <a href="/painel/cardapio" className="underline underline-offset-2">Cardápio</a>{' '}
            para gerenciar a disponibilidade.
          </p>
        </div>
      ) : (
        <>
          <AvailabilityMatrix units={restaurantUnits} categories={categoriesWithProducts} unavailableKeys={unavailableKeys} />
          <AvailabilityMobile units={restaurantUnits} categories={categoriesWithProducts} unavailableKeys={unavailableKeys} />
        </>
      )}
    </div>
  )
}
