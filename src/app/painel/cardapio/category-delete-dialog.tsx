'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCategory } from '@/lib/catalog/actions'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

interface CategoryDeleteDialogProps {
  id: string
  name: string
}

export function CategoryDeleteDialog({ id, name }: CategoryDeleteDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteCategory(id)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        Remover
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
          <AlertDialogDescription>
            A categoria &quot;{name}&quot; e TODOS os seus produtos serão removidos permanentemente. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={loading}
            onClick={handleDelete}
          >
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
