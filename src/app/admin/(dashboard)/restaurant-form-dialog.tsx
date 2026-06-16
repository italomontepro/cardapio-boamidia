'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createRestaurant, updateRestaurant } from '@/lib/restaurants/actions'
import {
  createRestaurantSchema,
  updateRestaurantSchema,
  type CreateRestaurantInput,
  type UpdateRestaurantInput,
} from '@/lib/restaurants/schema'
import { generateSlug } from '@/lib/restaurants/slug'
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
import { CreatedSuccessDialog } from './created-success-dialog'

interface RestaurantForEdit {
  id: string
  name: string
  slug: string
  is_active: boolean
}

type CreateProps = {
  mode: 'create'
  restaurant?: never
}

type EditProps = {
  mode: 'edit'
  restaurant: RestaurantForEdit
}

type RestaurantFormDialogProps = CreateProps | EditProps

interface SuccessData {
  slug: string
  tempPassword: string
  adminEmail: string
}

// ------------ Create form -------------------------------------------------

interface CreateFormProps {
  onSuccess: (data: SuccessData) => void
  onClose: () => void
}

function CreateForm({ onSuccess, onClose }: CreateFormProps) {
  const [slugTouched, setSlugTouched] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateRestaurantInput>({
    resolver: zodResolver(createRestaurantSchema),
    defaultValues: { name: '', slug: '', adminEmail: '' },
  })

  const currentSlug = watch('slug')

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value
    setValue('name', name)
    if (!slugTouched) {
      setValue('slug', generateSlug(name))
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugTouched(true)
    setValue('slug', e.target.value)
  }

  async function onSubmit(data: CreateRestaurantInput) {
    const result = await createRestaurant(data)
    if ('error' in result) {
      const errs = result.error
      if (errs.name) setError('name', { message: errs.name[0] })
      if (errs.slug) setError('slug', { message: errs.slug[0] })
      if (errs.adminEmail) setError('adminEmail', { message: errs.adminEmail[0] })
      return
    }
    onSuccess({
      slug: result.restaurant.slug,
      tempPassword: result.tempPassword,
      adminEmail: result.adminEmail,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="create-name">Nome do restaurante</Label>
        <Input
          id="create-name"
          {...register('name')}
          onChange={handleNameChange}
          placeholder="Ex: Pizzaria do João"
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="create-slug">Link (slug)</Label>
        <Input
          id="create-slug"
          {...register('slug')}
          onChange={handleSlugChange}
          placeholder="pizzaria-do-joao"
          aria-invalid={!!errors.slug}
          value={currentSlug}
        />
        <p className="text-xs text-muted-foreground">
          Gerado automaticamente a partir do nome. Você pode editar antes de salvar.
        </p>
        {errors.slug && (
          <p className="text-sm text-destructive">{errors.slug.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="create-adminEmail">E-mail do administrador do restaurante</Label>
        <Input
          id="create-adminEmail"
          type="email"
          {...register('adminEmail')}
          placeholder="admin@restaurante.com"
          aria-invalid={!!errors.adminEmail}
        />
        {errors.adminEmail && (
          <p className="text-sm text-destructive">{errors.adminEmail.message}</p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          Criar Restaurante
        </Button>
      </DialogFooter>
    </form>
  )
}

// ------------ Edit form ---------------------------------------------------

interface EditFormProps {
  restaurant: RestaurantForEdit
  onClose: () => void
}

function EditForm({ restaurant, onClose }: EditFormProps) {
  const router = useRouter()
  const [slugTouched, setSlugTouched] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateRestaurantInput>({
    resolver: zodResolver(updateRestaurantSchema),
    defaultValues: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug },
  })

  const currentSlug = watch('slug')

  // D-06 warning: show when editing an ACTIVE restaurant and slug has changed
  const showSlugWarning =
    restaurant.is_active &&
    currentSlug !== restaurant.slug &&
    currentSlug !== ''

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value
    setValue('name', name)
    if (!slugTouched) {
      setValue('slug', generateSlug(name))
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugTouched(true)
    setValue('slug', e.target.value)
  }

  async function onSubmit(data: UpdateRestaurantInput) {
    const result = await updateRestaurant(data)
    if ('error' in result) {
      const errs = result.error
      if (errs.name) setError('name', { message: errs.name[0] })
      if (errs.slug) setError('slug', { message: errs.slug[0] })
      return
    }
    onClose()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <input type="hidden" {...register('id')} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-name">Nome do restaurante</Label>
        <Input
          id="edit-name"
          {...register('name')}
          onChange={handleNameChange}
          placeholder="Ex: Pizzaria do João"
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-slug">Link (slug)</Label>
        <Input
          id="edit-slug"
          {...register('slug')}
          onChange={handleSlugChange}
          placeholder="pizzaria-do-joao"
          aria-invalid={!!errors.slug}
          value={currentSlug}
        />
        <p className="text-xs text-muted-foreground">
          Gerado automaticamente a partir do nome. Você pode editar antes de salvar.
        </p>
        {showSlugWarning && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Atenção: ao alterar o link, o endereço antigo (/r/{restaurant.slug}) deixará de funcionar.
          </p>
        )}
        {errors.slug && (
          <p className="text-sm text-destructive">{errors.slug.message}</p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          Salvar Alterações
        </Button>
      </DialogFooter>
    </form>
  )
}

// ------------ Main component ----------------------------------------------

export function RestaurantFormDialog({ mode, restaurant }: RestaurantFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [successData, setSuccessData] = useState<SuccessData | null>(null)

  const isCreate = mode === 'create'

  function handleOpen() {
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
  }

  function handleCreateSuccess(data: SuccessData) {
    setOpen(false)
    setSuccessData(data)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
        <Button
          variant={isCreate ? 'default' : 'ghost'}
          size={isCreate ? 'default' : 'sm'}
          onClick={handleOpen}
        >
          {isCreate ? 'Novo Restaurante' : 'Editar'}
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isCreate ? 'Novo Restaurante' : 'Editar Restaurante'}
            </DialogTitle>
            <DialogDescription>
              {isCreate
                ? 'Preencha os dados abaixo para criar o restaurante e provisionar o administrador.'
                : 'Atualize os dados do restaurante.'}
            </DialogDescription>
          </DialogHeader>

          {isCreate ? (
            <CreateForm onSuccess={handleCreateSuccess} onClose={handleClose} />
          ) : (
            <EditForm restaurant={restaurant} onClose={handleClose} />
          )}
        </DialogContent>
      </Dialog>

      {/* D-08: one-time success dialog — shown after create, temp password NEVER persisted */}
      {successData && (
        <CreatedSuccessDialog
          slug={successData.slug}
          tempPassword={successData.tempPassword}
          adminEmail={successData.adminEmail}
          open={!!successData}
          onOpenChange={(isOpen) => {
            if (!isOpen) setSuccessData(null)
          }}
        />
      )}
    </>
  )
}
