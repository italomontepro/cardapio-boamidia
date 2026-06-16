'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { parsePhoneNumber } from 'libphonenumber-js/min'
import { createUnit, updateUnit } from '@/lib/units/actions'
import { upsertUnitSchema, type UpsertUnitInput } from '@/lib/units/schema'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { UnitRow } from './page'

type CreateProps = { mode: 'create'; unit?: never }
type EditProps = { mode: 'edit'; unit: UnitRow }
type UnitFormDialogProps = CreateProps | EditProps

export function UnitFormDialog({ mode, unit }: UnitFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const isCreate = mode === 'create'

  function getDefaultWhatsapp(): string {
    if (!unit?.whatsappNumber) return ''
    try {
      return parsePhoneNumber(unit.whatsappNumber, 'BR')?.formatNational() ?? unit.whatsappNumber
    } catch {
      return unit.whatsappNumber
    }
  }

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpsertUnitInput>({
    resolver: zodResolver(upsertUnitSchema),
    defaultValues: isCreate
      ? { name: '', address: '', whatsappNumber: '', hours: '' }
      : {
          id: unit.id,
          name: unit.name,
          address: unit.address ?? '',
          whatsappNumber: getDefaultWhatsapp(),
          hours: unit.hours ?? '',
        },
  })

  async function onSubmit(data: UpsertUnitInput) {
    setFormError(null)
    const result = isCreate ? await createUnit(data) : await updateUnit(data)

    if ('error' in result) {
      const errs = result.error
      if (errs.name) setError('name', { message: errs.name[0] })
      if (errs.address) setError('address', { message: errs.address[0] })
      if (errs.whatsappNumber) setError('whatsappNumber', { message: errs.whatsappNumber[0] })
      if (errs.hours) setError('hours', { message: errs.hours[0] })
      if (errs._form) setFormError(errs._form[0])
      return
    }

    setOpen(false)
    reset()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant={isCreate ? 'default' : 'ghost'}
        size={isCreate ? 'default' : 'sm'}
        onClick={() => setOpen(true)}
      >
        {isCreate ? 'Nova Unidade' : 'Editar'}
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isCreate ? 'Nova Unidade' : 'Editar Unidade'}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? 'Preencha os dados da nova unidade/filial.'
              : 'Atualize os dados desta unidade.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {!isCreate && <input type="hidden" {...register('id')} />}

          {formError && (
            <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit-name">Nome</Label>
            <Input
              id="unit-name"
              {...register('name')}
              placeholder="Ex: Centro"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit-address">Endereço (opcional)</Label>
            <Input
              id="unit-address"
              {...register('address')}
              placeholder="Ex: Rua das Flores, 123"
              aria-invalid={!!errors.address}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit-whatsapp">WhatsApp</Label>
            <Input
              id="unit-whatsapp"
              {...register('whatsappNumber')}
              placeholder="(11) 99999-9999"
              aria-invalid={!!errors.whatsappNumber}
            />
            {errors.whatsappNumber && (
              <p className="text-sm text-destructive">{errors.whatsappNumber.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit-hours">Horários (opcional)</Label>
            <Input
              id="unit-hours"
              {...register('hours')}
              placeholder="Seg–Sex 11h–22h"
              aria-invalid={!!errors.hours}
            />
            {errors.hours && (
              <p className="text-sm text-destructive">{errors.hours.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isCreate ? 'Criar Unidade' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
