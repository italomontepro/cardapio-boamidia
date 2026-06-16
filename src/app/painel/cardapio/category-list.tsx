'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { moveCategoryUp, moveCategoryDown } from '@/lib/catalog/actions'
import { Button } from '@/components/ui/button'
import { CategoryFormDialog } from './category-form-dialog'
import { CategoryDeleteDialog } from './category-delete-dialog'

type CategoryRow = {
  id: string
  name: string
  sortOrder: number
}

interface CategoryListProps {
  categories: CategoryRow[]
}

export function CategoryList({ categories }: CategoryListProps) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function handleMove(id: string, direction: 'up' | 'down') {
    setPending(`${direction}-${id}`)
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

  return (
    <ul className="space-y-2">
      {categories.map((c, index) => (
        <li key={c.id} className="flex items-center gap-2 rounded-lg border p-3">
          <div className="flex flex-col gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={index === 0 || pending !== null}
              onClick={() => handleMove(c.id, 'up')}
              aria-label="Mover para cima"
            >
              ↑
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={index === categories.length - 1 || pending !== null}
              onClick={() => handleMove(c.id, 'down')}
              aria-label="Mover para baixo"
            >
              ↓
            </Button>
          </div>
          <span className="flex-1 font-medium">{c.name}</span>
          <CategoryFormDialog mode="edit" category={c} />
          <CategoryDeleteDialog id={c.id} name={c.name} />
        </li>
      ))}
    </ul>
  )
}
