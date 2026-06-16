'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createCategory, updateCategory } from '@/lib/catalog/actions'
import { upsertCategorySchema, type UpsertCategoryInput } from '@/lib/catalog/schema'
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

type CategoryForEdit = {
  id: string
  name: string
}

type CreateProps = {
  mode: 'create'
  category?: never
}

type EditProps = {
  mode: 'edit'
  category: CategoryForEdit
}

type CategoryFormDialogProps = CreateProps | EditProps

export function CategoryFormDialog(props: CategoryFormDialogProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpsertCategoryInput>({
    resolver: zodResolver(upsertCategorySchema),
    defaultValues: {
      id: props.mode === 'edit' ? props.category.id : undefined,
      name: props.mode === 'edit' ? props.category.name : '',
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) reset()
  }

  async function onSubmit(data: UpsertCategoryInput) {
    const result =
      props.mode === 'create'
        ? await createCategory({ name: data.name })
        : await updateCategory({ id: data.id, name: data.name })

    if ('error' in result) {
      const err = result.error as Record<string, string[]>
      if (err.name) setError('name', { message: err.name[0] })
      if (err._form) setError('root', { message: err._form[0] })
      return
    }

    setOpen(false)
    reset()
    router.refresh()
  }

  return (
    <>
      <Button
        variant={props.mode === 'create' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {props.mode === 'create' ? 'Nova Categoria' : 'Editar'}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {props.mode === 'create' ? 'Nova Categoria' : 'Editar Categoria'}
            </DialogTitle>
            <DialogDescription>
              {props.mode === 'create'
                ? 'Crie uma nova categoria para o seu cardápio.'
                : 'Altere o nome da categoria.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="category-name">Nome</Label>
              <Input
                id="category-name"
                placeholder="Ex: Entradas, Pratos Principais..."
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
