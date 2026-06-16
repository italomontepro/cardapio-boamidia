import { createClient } from '@/lib/supabase/server'
import { RestaurantFormDialog } from './restaurant-form-dialog'
import { RestaurantTable } from './restaurant-table'

export default async function AdminPage() {
  const supabase = await createClient()

  // No tenant filter -- is_super_admin() RLS policy on `restaurants`
  // (plan 01-03) allows super_admin to read every row. This query IS the
  // D-09 proof that super_admin sees all restaurants.
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug, is_active, created_at')
    .order('name')

  // Admin count (RESEARCH Pattern 4): second RLS-scoped query on admin_users.
  // super_admin RLS allows reading all rows. Count per restaurant_id in JS.
  // NOT using Drizzle here — preserves the Phase 1 D-09 security proof.
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
        <h1 className="text-xl font-semibold">Painel da Plataforma -- Restaurantes</h1>
        <RestaurantFormDialog mode="create" />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-sm font-semibold">Nenhum restaurante cadastrado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre o primeiro restaurante da plataforma para começar. Clique em &quot;Novo Restaurante&quot; para criar o cadastro e provisionar o admin.
          </p>
        </div>
      ) : (
        <RestaurantTable restaurants={rows} />
      )}
    </div>
  )
}
