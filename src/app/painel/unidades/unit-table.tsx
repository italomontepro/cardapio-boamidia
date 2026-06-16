'use client'

import { parsePhoneNumber } from 'libphonenumber-js/min'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import type { UnitRow } from './page'
import { UnitFormDialog } from './unit-form-dialog'
import { UnitDeleteDialog } from './unit-delete-dialog'

interface UnitTableProps {
  units: UnitRow[]
}

function formatWhatsapp(number: string): string {
  try {
    return parsePhoneNumber(number, 'BR')?.formatNational() ?? number
  } catch {
    return number
  }
}

export function UnitTable({ units }: UnitTableProps) {
  return (
    <Table className="[&_tbody]:divide-y [&_tbody]:divide-border [&_thead_tr]:border-b [&_tr]:border-0">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Nome</TableHead>
          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Endereço</TableHead>
          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">WhatsApp</TableHead>
          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Horários</TableHead>
          <TableHead className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {units.map((unit) => (
          <TableRow key={unit.id} className="hover:bg-muted/50">
            <TableCell className="font-medium">{unit.name}</TableCell>
            <TableCell className="text-muted-foreground">{unit.address ?? '—'}</TableCell>
            <TableCell>{formatWhatsapp(unit.whatsappNumber)}</TableCell>
            <TableCell className="text-muted-foreground">{unit.hours ?? '—'}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <UnitFormDialog mode="edit" unit={unit} />
                <UnitDeleteDialog id={unit.id} name={unit.name} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
