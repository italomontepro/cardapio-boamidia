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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Endereço</TableHead>
          <TableHead>WhatsApp</TableHead>
          <TableHead>Horários</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {units.map((unit) => (
          <TableRow key={unit.id}>
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
