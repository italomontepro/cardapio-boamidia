import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function PainelPage() {
  const supabase = await createClient()

  // No tenant filter -- the current_admin_restaurant_id() RLS policy on
  // `restaurants` (plan 01-03) scopes this query to exactly the restaurant_admin's
  // own restaurant. This query IS the D-09 proof of cross-tenant isolation.
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug, is_active, created_at')

  const restaurant = restaurants?.[0]

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Painel do Restaurante</h1>

      {!restaurant ? (
        <p className="text-sm text-destructive">
          Nenhum restaurante associado a esta conta.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{restaurant.name}</CardTitle>
            <CardDescription>
              /{restaurant.slug} -- {restaurant.is_active ? 'ativo' : 'inativo'}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
