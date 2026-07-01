'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { moveCategoryUp, moveCategoryDown, moveProductUp, moveProductDown } from '@/lib/catalog/actions'
import { CategoryFormDialog } from './category-form-dialog'
import { CategoryDeleteDialog } from './category-delete-dialog'
import { ProductFormDialog } from './product-form-dialog'
import { ProductDeleteDialog } from './product-delete-dialog'

type ProductRow = {
  id: string
  name: string
  description: string | null
  price: string
  imageUrl: string | null
  isFeatured: boolean
  sortOrder: number
}

type CategoryRow = {
  id: string
  name: string
  sortOrder: number
  products: ProductRow[]
}

interface CardapioAccordionProps {
  categories: CategoryRow[]
}

export function CardapioAccordion({ categories }: CardapioAccordionProps) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function handleCategoryMove(id: string, direction: 'up' | 'down') {
    setPending(`cat-${direction}-${id}`)
    try {
      if (direction === 'up') {
        await moveCategoryUp(id)
      } else {
        await moveCategoryDown(id)
      }
      startTransition(() => router.refresh())
    } finally {
      setPending(null)
    }
  }

  async function handleProductMove(id: string, direction: 'up' | 'down') {
    setPending(`prod-${direction}-${id}`)
    try {
      if (direction === 'up') {
        await moveProductUp(id)
      } else {
        await moveProductDown(id)
      }
      startTransition(() => router.refresh())
    } finally {
      setPending(null)
    }
  }

  return (
    <Accordion multiple className="space-y-2">
      {categories.map((c, catIndex) => (
        <AccordionItem key={c.id} value={c.id} className="rounded-lg border">
          <div className="flex items-center gap-2 px-4 py-2">
            {/* Category reorder buttons — siblings to trigger, not nested inside */}
            <div className="flex flex-col gap-0.5">
              <Button
                variant="outline"
                size="sm"
                disabled={catIndex === 0 || pending !== null}
                onClick={() => handleCategoryMove(c.id, 'up')}
                aria-label="Mover categoria para cima"
                className="h-6 w-6 p-0"
              >
                <ChevronUp className="size-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={catIndex === categories.length - 1 || pending !== null}
                onClick={() => handleCategoryMove(c.id, 'down')}
                aria-label="Mover categoria para baixo"
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="size-3" />
              </Button>
            </div>

            {/* Accordion trigger for the category name */}
            <AccordionTrigger className="flex-1 font-semibold text-base tracking-tight py-0">
              {c.name}
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                ({c.products.length} {c.products.length === 1 ? 'produto' : 'produtos'})
              </span>
            </AccordionTrigger>

            {/* Category actions */}
            <div className="flex items-center gap-1">
              <CategoryFormDialog mode="edit" category={{ id: c.id, name: c.name }} />
              <CategoryDeleteDialog id={c.id} name={c.name} />
            </div>
          </div>

          <AccordionContent className="px-4 pb-3">
            {c.products.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-3">
                Nenhum produto nesta categoria ainda.
              </p>
            ) : (
              <ul className="space-y-2 mb-3">
                {c.products.map((p, prodIndex) => (
                  <li key={p.id} className="flex items-start gap-2 rounded-md border p-2">
                    {/* Product thumbnail */}
                    {p.imageUrl && (
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded">
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          className="object-cover"
                          unoptimized={false}
                        />
                      </div>
                    )}

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{p.name}</span>
                        {p.isFeatured && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Destaque
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {p.description}
                        </p>
                      )}
                      <span className="text-sm font-semibold mt-0.5 block">
                        R$ {Number(p.price).toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {/* Product actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={prodIndex === 0 || pending !== null}
                          onClick={() => handleProductMove(p.id, 'up')}
                          aria-label="Mover produto para cima"
                          className="h-6 w-6 p-0"
                        >
                          <ChevronUp className="size-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={prodIndex === c.products.length - 1 || pending !== null}
                          onClick={() => handleProductMove(p.id, 'down')}
                          aria-label="Mover produto para baixo"
                          className="h-6 w-6 p-0"
                        >
                          <ChevronDown className="size-3" />
                        </Button>
                      </div>
                      <ProductFormDialog
                        mode="edit"
                        categoryId={c.id}
                        allCategories={categories.map((cat) => ({ id: cat.id, name: cat.name }))}
                        product={p}
                      />
                      <ProductDeleteDialog id={p.id} name={p.name} />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Add product button at end of category */}
            <ProductFormDialog mode="create" categoryId={c.id} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
