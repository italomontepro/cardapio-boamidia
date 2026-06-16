import { db } from '@/db'
import { categories, products } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { getCurrentAdmin } from '@/lib/auth/session'
import { CategoryFormDialog } from './category-form-dialog'
import { CardapioAccordion } from './cardapio-accordion'
import { UtensilsCrossed } from 'lucide-react'

export default async function CardapioPage() {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return null

  const cats = await db.query.categories.findMany({
    where: eq(categories.restaurantId, admin.restaurantId),
    orderBy: [asc(categories.sortOrder)],
    with: { products: { orderBy: [asc(products.sortOrder)] } },
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Cardápio</h1>
        <CategoryFormDialog mode="create" />
      </div>

      {cats.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-12 text-center">
          <UtensilsCrossed className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">Nenhuma categoria ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Crie a primeira categoria do seu cardápio.</p>
        </div>
      ) : (
        <div className="max-w-3xl">
          <CardapioAccordion categories={cats} />
        </div>
      )}
    </div>
  )
}
