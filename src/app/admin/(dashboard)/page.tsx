import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function AdminPage() {
  const supabase = await createClient()

  // No tenant filter -- the is_super_admin() RLS policy on `restaurants`
  // (plan 01-03) allows super_admin to read every row. This query IS the
  // D-09 proof that super_admin sees all restaurants.
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug, is_active, created_at')
    .order('name')

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Painel da Plataforma -- Restaurantes</h1>

      {!restaurants || restaurants.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum restaurante cadastrado.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {restaurants.map((restaurant) => (
            <Card key={restaurant.id}>
              <CardHeader>
                <CardTitle>{restaurant.name}</CardTitle>
                <CardDescription>
                  /{restaurant.slug} -- {restaurant.is_active ? 'ativo' : 'inativo'}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
