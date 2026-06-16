import { createClient } from '@/lib/supabase/server'
import { RestaurantFormDialog } from './restaurant-form-dialog'
import { RestaurantTable } from './restaurant-table'
import { Building2 } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug, is_active, created_at')
    .order('name')

  const { data: adminUsersData } = await supabase
    .from('admin_users')
    .select('restaurant_id')

  const adminCounts = new Map<string, number>()
  if (adminUsersData) {
    for (const row of adminUsersData) {
      if (row.restaurant_id) {
        adminCounts.set(row.restaurant_id, (adminCounts.get(row.restaurant_id) ?? 0) + 1)
      }
    }
  }

  const rows = (restaurants ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    isActive: r.is_active,
    createdAt: r.created_at,
    adminCount: adminCounts.get(r.id) ?? 0,
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Restaurantes</h1>
        <RestaurantFormDialog mode="create" />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-12 text-center">
          <Building2 className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">Nenhum restaurante cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre o primeiro restaurante da plataforma. Clique em &quot;Novo Restaurante&quot; para criar o cadastro.
          </p>
        </div>
      ) : (
        <RestaurantTable restaurants={rows} />
      )}
    </div>
  )
}
