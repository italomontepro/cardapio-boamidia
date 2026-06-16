'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toggleRestaurantActive } from '@/lib/restaurants/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { RestaurantFormDialog } from './restaurant-form-dialog'
import { DeactivateAlertDialog } from './deactivate-alert-dialog'

export interface RestaurantRow {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: string
  adminCount: number
}

interface RestaurantTableProps {
  restaurants: RestaurantRow[]
}

export function RestaurantTable({ restaurants }: RestaurantTableProps) {
  const router = useRouter()
  const [activatingId, setActivatingId] = useState<string | null>(null)

  async function handleActivate(id: string) {
    setActivatingId(id)
    try {
      await toggleRestaurantActive(id, true)
      router.refresh()
    } finally {
      setActivatingId(null)
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Link</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Criado em</TableHead>
          <TableHead>Admins</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {restaurants.map((restaurant) => (
          <TableRow key={restaurant.id} className="min-h-[44px]">
            <TableCell className="font-medium">{restaurant.name}</TableCell>
            <TableCell className="text-muted-foreground">/r/{restaurant.slug}</TableCell>
            <TableCell>
              {restaurant.isActive ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  ativo
                </Badge>
              ) : (
                <Badge variant="secondary">inativo</Badge>
              )}
            </TableCell>
            <TableCell>
              {new Date(restaurant.createdAt).toLocaleDateString('pt-BR')}
            </TableCell>
            <TableCell>{restaurant.adminCount}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <RestaurantFormDialog
                  mode="edit"
                  restaurant={{
                    id: restaurant.id,
                    name: restaurant.name,
                    slug: restaurant.slug,
                    is_active: restaurant.isActive,
                  }}
                />
                {restaurant.isActive ? (
                  <DeactivateAlertDialog id={restaurant.id} slug={restaurant.slug} />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activatingId === restaurant.id}
                    onClick={() => handleActivate(restaurant.id)}
                  >
                    Ativar
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
