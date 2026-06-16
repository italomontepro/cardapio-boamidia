'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { AvailabilitySwitch } from './availability-matrix'

type Unit = { id: string; name: string }
type Product = { id: string; name: string; price: string; imageUrl: string | null }
type Category = { id: string; name: string; products: Product[] }
type Props = { units: Unit[]; categories: Category[]; unavailableKeys: string[] }

export default function AvailabilityMobile({ units, categories, unavailableKeys }: Props) {
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const unavailableSet = new Set(unavailableKeys)

  const selectedUnit = units.find((u) => u.id === selectedUnitId)

  return (
    <div className="block md:hidden">
      <div className="mb-4">
        <label className="text-sm font-medium mb-1.5 block">Selecionar unidade</label>
        <Select value={selectedUnitId} onValueChange={(value) => setSelectedUnitId(value ?? '')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Escolha uma unidade..." />
          </SelectTrigger>
          <SelectContent>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>
                {unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedUnit ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Selecione uma unidade acima para ver e editar a disponibilidade dos produtos.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {categories.map((category) => (
            <div key={category.id}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 py-2">
                {category.name}
              </p>
              {category.products.map((product) => {
                const isUnavailable = unavailableSet.has(`${product.id}:${selectedUnitId}`)
                return (
                  <div
                    key={product.id}
                    className={cn(
                      'flex items-center gap-3 rounded-md border p-3 transition-colors',
                      isUnavailable && 'opacity-60 bg-muted/30'
                    )}
                  >
                    {product.imageUrl && (
                      <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded">
                        <Image src={product.imageUrl} alt="" fill className="object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        R$ {Number(product.price).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    {isUnavailable && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 shrink-0">
                        Indisponível
                      </span>
                    )}
                    <AvailabilitySwitch
                      productId={product.id}
                      unitId={selectedUnitId}
                      checked={!isUnavailable}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
