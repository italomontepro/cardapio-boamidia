'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { upsertProduct, removeProductPhoto } from '@/lib/catalog/actions'
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type CategoryOption = { id: string; name: string }

type ProductForEdit = {
  id: string
  name: string
  description: string | null
  price: string
  imageUrl: string | null
  isFeatured: boolean
}

type CreateProps = {
  mode: 'create'
  categoryId: string
  allCategories?: never
  product?: never
}

type EditProps = {
  mode: 'edit'
  categoryId: string
  allCategories: CategoryOption[]
  product: ProductForEdit
}

type ProductFormDialogProps = CreateProps | EditProps

export function ProductFormDialog(props: ProductFormDialogProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isRemoving, startRemoveTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const isEdit = props.mode === 'edit'
  const product = isEdit ? props.product : null

  const [previewUrl, setPreviewUrl] = useState<string | null>(product?.imageUrl ?? null)
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false)
  const [selectedCategoryId, setSelectedCategoryId] = useState(props.categoryId)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setErrors({})
      setPreviewUrl(product?.imageUrl ?? null)
      setIsFeatured(product?.isFeatured ?? false)
      setSelectedCategoryId(props.categoryId)
      formRef.current?.reset()
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
    }
  }

  function handleRemovePhoto() {
    if (previewUrl?.startsWith('blob:')) {
      setPreviewUrl(null)
      const input = formRef.current?.querySelector<HTMLInputElement>('input[name="photo"]')
      if (input) input.value = ''
      return
    }

    if (isEdit && product?.id) {
      startRemoveTransition(async () => {
        await removeProductPhoto(product.id)
        setPreviewUrl(null)
      })
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    formData.set('isFeatured', isFeatured ? 'true' : 'false')
    // Select component value isn't in FormData — set it manually
    formData.set('categoryId', selectedCategoryId)

    startTransition(async () => {
      const result = await upsertProduct(formData)

      if ('error' in result) {
        setErrors(result.error as Record<string, string[]>)
        return
      }

      setOpen(false)
      setErrors({})
      router.refresh()
    })
  }

  const defaultPrice = product
    ? Number(product.price).toFixed(2).replace('.', ',')
    : ''

  return (
    <>
      <Button
        variant={props.mode === 'create' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {props.mode === 'create' ? 'Adicionar produto' : 'Editar'}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Edite os dados do produto.'
                : 'Adicione um novo produto à categoria.'}
            </DialogDescription>
          </DialogHeader>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Hidden fields — categoryId is handled via state for edit mode */}
            <input type="hidden" name="categoryId" value={selectedCategoryId} />
            {isEdit && <input type="hidden" name="id" value={product!.id} />}

            {/* Category selector — edit mode only */}
            {isEdit && props.allCategories.length > 0 && (
              <div className="space-y-1">
                <Label htmlFor="product-category">Categoria</Label>
                <Select
                  value={selectedCategoryId}
                  onValueChange={(v) => { if (v) setSelectedCategoryId(v) }}
                >
                  <SelectTrigger id="product-category">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.allCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="product-name">Nome</Label>
              <Input
                id="product-name"
                name="name"
                placeholder="Ex: Hambúrguer Clássico"
                defaultValue={product?.name ?? ''}
                required
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name[0]}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="product-description">Descrição</Label>
              <Textarea
                id="product-description"
                name="description"
                placeholder="Descreva os ingredientes ou diferenciais do produto"
                defaultValue={product?.description ?? ''}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description[0]}</p>
              )}
            </div>

            {/* Price */}
            <div className="space-y-1">
              <Label htmlFor="product-price">Preço (R$)</Label>
              <Input
                id="product-price"
                name="price"
                inputMode="decimal"
                placeholder="29,90"
                defaultValue={defaultPrice}
                required
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price[0]}</p>
              )}
            </div>

            {/* Featured checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="product-featured"
                checked={isFeatured}
                onCheckedChange={(checked) => setIsFeatured(checked === true)}
              />
              <Label htmlFor="product-featured" className="cursor-pointer">
                Produto em destaque
              </Label>
            </div>

            {/* Photo upload */}
            <div className="space-y-2">
              <Label htmlFor="product-photo">Foto do produto</Label>
              {previewUrl && (
                <div className="flex items-end gap-3">
                  <div className="relative h-20 w-28 overflow-hidden rounded border">
                    <Image
                      src={previewUrl}
                      alt="Pré-visualização"
                      fill
                      className="object-cover"
                      unoptimized={previewUrl.startsWith('blob:')}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleRemovePhoto}
                    disabled={isRemoving}
                  >
                    {isRemoving ? 'Removendo...' : 'Remover foto'}
                  </Button>
                </div>
              )}
              <input
                id="product-photo"
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="block text-sm text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium hover:file:bg-muted/80"
              />
              {errors.photo && (
                <p className="text-sm text-destructive">{errors.photo[0]}</p>
              )}
            </div>

            {/* Form-level error */}
            {errors._form && (
              <p className="text-sm text-destructive">{errors._form[0]}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
