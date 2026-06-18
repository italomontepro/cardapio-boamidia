'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatBRL } from '@/lib/menu/format'
import { useCart } from './cart-provider'
import type { ProductRow } from './menu-view'

function ProductDialogBody({
  product,
  onOpenChange,
}: {
  product: ProductRow
  onOpenChange: (open: boolean) => void
}) {
  const { dispatch } = useCart()
  // Keying this component by product.id (see export below) resets qty/notes
  // for free whenever a new product opens — no reset-on-prop-change effect needed.
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')

  function handleAdd() {
    dispatch({
      type: 'ADD',
      item: {
        productId: product.id,
        name: product.name,
        price: Number(product.price), // products.price is a NUMERIC string; CartItem.price is a number
        qty,
        notes,
      },
    })
    onOpenChange(false)
  }

  return (
    <>
      <div className="relative -mx-4 -mt-4 h-40 w-[calc(100%+2rem)] overflow-hidden bg-muted">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Sem foto
          </div>
        )}
      </div>

      <DialogTitle>{product.name}</DialogTitle>
      {product.description && <DialogDescription>{product.description}</DialogDescription>}

      <p className="text-sm font-semibold">{formatBRL(Number(product.price))}</p>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Quantidade</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            −
          </Button>
          <span className="w-6 text-center text-sm">{qty}</span>
          <Button type="button" variant="outline" size="icon-sm" onClick={() => setQty((q) => q + 1)}>
            +
          </Button>
        </div>
      </div>

      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Alguma observação? (ex: sem cebola)"
      />

      <DialogFooter>
        <Button type="button" onClick={handleAdd}>
          Adicionar ao carrinho
        </Button>
      </DialogFooter>
    </>
  )
}

export default function ProductDialog({
  product,
  open,
  onOpenChange,
}: {
  product: ProductRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {product && (
          <ProductDialogBody key={product.id} product={product} onOpenChange={onOpenChange} />
        )}
      </DialogContent>
    </Dialog>
  )
}
