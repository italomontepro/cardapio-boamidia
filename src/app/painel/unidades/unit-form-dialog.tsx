'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { parsePhoneNumber } from 'libphonenumber-js/min'
import { createUnit, updateUnit, geocodeUnitAddress } from '@/lib/units/actions'
import { upsertUnitSchema, type UpsertUnitInput } from '@/lib/units/schema'
import { UnitLocationMap } from './unit-location-map-loader'
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

const STEP_FIELDS = {
  1: ['name'] as const,
  2: ['whatsappNumber', 'address', 'hours'] as const,
  3: ['lat', 'lng'] as const,
}

const STEP_TITLES: Record<1 | 2 | 3, string> = {
  1: 'Básico',
  2: 'Contato e Horário',
  3: 'Localização',
}

const BR_CENTER = { lat: -14.235, lng: -51.9253 }

export function UnitFormDialog({ mode, unit }: UnitFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const isCreate = mode === 'create'
  const [searchValue, setSearchValue] = useState(() => unit?.address ?? '')
  const [geoStatus, setGeoStatus] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const autoGeoDone = useRef(false)

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
    trigger,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<UpsertUnitInput>({
    resolver: zodResolver(upsertUnitSchema),
    defaultValues: isCreate
      ? { name: '', address: '', whatsappNumber: '', hours: '', lat: undefined, lng: undefined }
      : {
          id: unit.id,
          name: unit.name,
          address: unit.address ?? '',
          whatsappNumber: getDefaultWhatsapp(),
          hours: unit.hours ?? '',
          lat: unit.lat ?? undefined,
          lng: unit.lng ?? undefined,
        },
  })

  function openDialog() {
    setStep(1)
    autoGeoDone.current = false
    setGeoStatus(null)
    setSearchValue(unit?.address ?? '')
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
    setStep(1)
    autoGeoDone.current = false
    setGeoStatus(null)
  }

  async function goNext() {
    const valid = await trigger(STEP_FIELDS[step])
    if (!valid) return
    setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s))
  }

  function goBack() {
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))
  }

  const lat = watch('lat')
  const lng = watch('lng')
  const mapLat = lat != null && !Number.isNaN(lat) ? lat : BR_CENTER.lat
  const mapLng = lng != null && !Number.isNaN(lng) ? lng : BR_CENTER.lng

  async function runGeocode(query: string) {
    const q = query.trim()
    if (!q) {
      setGeoStatus('Digite um endereço para buscar.')
      return
    }
    setGeoLoading(true)
    setGeoStatus('Buscando endereço…')
    const res = await geocodeUnitAddress(q)
    setGeoLoading(false)
    if ('error' in res) {
      setGeoStatus(res.error)
      return
    }
    setValue('lat', res.lat, { shouldValidate: true })
    setValue('lng', res.lng, { shouldValidate: true })
    setGeoStatus(null)
  }

  useEffect(() => {
    if (step === 3 && !autoGeoDone.current && lat == null && lng == null) {
      autoGeoDone.current = true
      const addr = getValues('address')
      if (addr && addr.trim()) runGeocode(addr)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

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
    setStep(1)
    reset()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? openDialog() : closeDialog())}>
      <Button
        variant={isCreate ? 'default' : 'ghost'}
        size={isCreate ? 'default' : 'sm'}
        onClick={openDialog}
      >
        {isCreate ? 'Nova Unidade' : 'Editar'}
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isCreate ? 'Nova Unidade' : 'Editar Unidade'} — {STEP_TITLES[step]}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? 'Preencha os dados da nova unidade/filial.'
              : 'Atualize os dados desta unidade.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Etapa {step} de 3</span>
          <div className="ml-auto flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`size-2 rounded-full ${n <= step ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {!isCreate && <input type="hidden" {...register('id')} />}
          {/* type="number" (not "hidden") -- only "number"/"date"/"range" inputs support the
              native valueAsNumber DOM property that { valueAsNumber: true } relies on; a
              type="hidden" input always reports valueAsNumber as NaN, corrupting lat/lng on
              every re-validation (e.g. clicking "Próximo"). step="any" disables the implicit
              step="1" native constraint -- otherwise decimal coordinates (e.g. -23.5578909)
              trigger a silent stepMismatch that blocks submit (the hidden field can't be
              focused to show the native error). */}
          <input type="number" step="any" style={{ display: 'none' }} {...register('lat', { valueAsNumber: true })} />
          <input type="number" step="any" style={{ display: 'none' }} {...register('lng', { valueAsNumber: true })} />

          {formError && (
            <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <div style={{ display: step === 1 ? 'block' : 'none' }} className="flex flex-col gap-4">
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
          </div>

          <div style={{ display: step === 2 ? 'block' : 'none' }} className="flex flex-col gap-4">
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
          </div>

          <div style={{ display: step === 3 ? 'block' : 'none' }} className="flex flex-col gap-4" data-step3-map>
            <div className="flex gap-2">
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Buscar endereço no mapa"
              />
              <Button
                type="button"
                variant="outline"
                disabled={geoLoading}
                onClick={() => runGeocode(searchValue)}
              >
                Buscar
              </Button>
            </div>
            {geoStatus && <p className="text-sm text-muted-foreground">{geoStatus}</p>}

            <UnitLocationMap
              lat={mapLat}
              lng={mapLng}
              onChange={(newLat, newLng) => {
                setValue('lat', newLat, { shouldValidate: true })
                setValue('lng', newLng, { shouldValidate: true })
              }}
            />
            <p className="text-xs text-muted-foreground">
              Arraste o pino para ajustar a posição exata. Esta etapa é opcional — você pode salvar sem marcar.
            </p>
          </div>

          <DialogFooter>
            {step === 1 && (
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
            )}
            {step > 1 && (
              <Button type="button" variant="outline" onClick={goBack}>
                Voltar
              </Button>
            )}
            {step < 3 && (
              <Button type="button" onClick={goNext}>
                Próximo
              </Button>
            )}
            {step === 3 && (
              <Button type="submit" disabled={isSubmitting}>
                {isCreate ? 'Criar Unidade' : 'Salvar Alterações'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
