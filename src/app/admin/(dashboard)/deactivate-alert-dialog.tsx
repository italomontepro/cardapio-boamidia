'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleRestaurantActive } from '@/lib/restaurants/actions'
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

interface DeactivateAlertDialogProps {
  id: string
  slug: string
}

export function DeactivateAlertDialog({ id }: DeactivateAlertDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDeactivate() {
    setLoading(true)
    try {
      await toggleRestaurantActive(id, false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        Desativar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desativar restaurante?</AlertDialogTitle>
          <AlertDialogDescription>
            O admin deste restaurante não conseguirá mais fazer login enquanto estiver desativado. Você pode reativar quando quiser.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={loading}
            onClick={handleDeactivate}
          >
            Desativar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
