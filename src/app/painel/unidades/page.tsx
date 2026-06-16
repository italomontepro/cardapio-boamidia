import { createClient } from '@/lib/supabase/server'
import { UnitFormDialog } from './unit-form-dialog'
import { UnitTable } from './unit-table'

export interface UnitRow {
  id: string
  name: string
  address: string | null
  whatsappNumber: string
  hours: string | null
}

export default async function UnidadesPage() {
  const supabase = await createClient()

  // RLS scopes this to the logged-in admin's restaurant automatically.
  const { data } = await supabase
    .from('units')
    .select('id, name, address, whatsapp_number, hours')
    .order('name')

  const units: UnitRow[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address ?? null,
    whatsappNumber: row.whatsapp_number ?? '',
    hours: row.hours ?? null,
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Unidades</h1>
        <UnitFormDialog mode="create" />
      </div>

      {units.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-12 text-center">
          <p className="text-sm font-medium text-foreground">Nenhuma unidade ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Cadastre a primeira filial do seu restaurante.</p>
        </div>
      ) : (
        <UnitTable units={units} />
      )}
    </div>
  )
}
