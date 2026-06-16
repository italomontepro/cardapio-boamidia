'use client'

import { useOptimistic, useTransition } from 'react'
import Image from 'next/image'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { toggleAvailability } from './actions'

type Unit = { id: string; name: string }
type Product = { id: string; name: string; price: string; imageUrl: string | null }
type Category = { id: string; name: string; products: Product[] }
type Props = { units: Unit[]; categories: Category[]; unavailableKeys: string[] }

export function AvailabilitySwitch({
  productId,
  unitId,
  checked,
}: {
  productId: string
  unitId: string
  checked: boolean
}) {
  const [optimistic, setOptimistic] = useOptimistic(checked)
  const [isPending, startTransition] = useTransition()

  function handleToggle(newChecked: boolean) {
    startTransition(async () => {
      setOptimistic(newChecked)
      const result = await toggleAvailability({ productId, unitId, available: newChecked })
      if (!result.success) console.error(result.error)
    })
  }

  return (
    <Switch
      checked={optimistic}
      onCheckedChange={handleToggle}
      disabled={isPending}
      aria-label={optimistic ? 'Disponível — clique para marcar como indisponível' : 'Indisponível — clique para marcar como disponível'}
    />
  )
}

export default function AvailabilityMatrix({ units, categories, unavailableKeys }: Props) {
  const unavailableSet = new Set(unavailableKeys)

  return (
    <div className="hidden md:block overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-muted px-4 py-3 text-left text-[13px] font-medium text-muted-foreground w-[280px]">
              Produto
            </th>
            {units.map((unit) => (
              <th key={unit.id} className="bg-muted px-4 py-3 text-center text-[13px] font-medium min-w-[140px]">
                <span className="block truncate max-w-[120px] mx-auto" title={unit.name}>
                  {unit.name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <>
              <tr key={`cat-${category.id}`}>
                <td
                  colSpan={units.length + 1}
                  className="bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-t"
                >
                  {category.name}
                </td>
              </tr>
              {category.products.map((product) => {
                const isUnavailableEverywhere = units.every((u) => unavailableSet.has(`${product.id}:${u.id}`))
                return (
                  <tr
                    key={product.id}
                    className={cn(
                      'border-t transition-colors',
                      isUnavailableEverywhere && 'bg-muted/30'
                    )}
                  >
                    <td className="sticky left-0 z-10 bg-background px-4 py-3 w-[280px]">
                      <div className="flex items-center gap-2">
                        {product.imageUrl && (
                          <div className="relative h-8 w-10 shrink-0 overflow-hidden rounded">
                            <Image src={product.imageUrl} alt="" fill className={cn('object-cover', isUnavailableEverywhere && 'opacity-50')} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className={cn('block truncate text-sm', isUnavailableEverywhere && 'text-muted-foreground')}>
                            {product.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            R$ {Number(product.price).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    </td>
                    {units.map((unit) => {
                      const isUnavailable = unavailableSet.has(`${product.id}:${unit.id}`)
                      return (
                        <td key={unit.id} className="px-4 py-3 text-center">
                          <AvailabilitySwitch
                            key={`${product.id}:${unit.id}`}
                            productId={product.id}
                            unitId={unit.id}
                            checked={!isUnavailable}
                          />
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
