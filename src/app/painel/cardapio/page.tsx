import { createClient } from '@/lib/supabase/server'
import { CategoryFormDialog } from './category-form-dialog'
import { CategoryList } from './category-list'

type CategoryRow = {
  id: string
  name: string
  sortOrder: number
}

export default async function CardapioPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true })

  const categories: CategoryRow[] = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sort_order,
  }))

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cardápio</h1>
        <CategoryFormDialog mode="create" />
      </div>

      {categories.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-10 text-center text-muted-foreground">
          Nenhuma categoria cadastrada. Crie a primeira categoria do seu cardápio.
        </div>
      ) : (
        <CategoryList categories={categories} />
      )}
    </div>
  )
}
