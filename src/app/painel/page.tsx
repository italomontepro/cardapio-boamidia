import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Building2 } from 'lucide-react'

export default async function PainelPage() {
  const supabase = await createClient()

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug, is_active, created_at')

  const restaurant = restaurants?.[0]

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Visão Geral</h1>

      {!restaurant ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-12 text-center">
          <Building2 className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">Nenhum restaurante associado</p>
          <p className="text-sm text-muted-foreground mt-1">Esta conta não está vinculada a um restaurante. Contate o administrador da plataforma.</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{restaurant.name}</CardTitle>
            <CardDescription>
              /r/{restaurant.slug} · {restaurant.is_active ? 'ativo' : 'inativo'}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
