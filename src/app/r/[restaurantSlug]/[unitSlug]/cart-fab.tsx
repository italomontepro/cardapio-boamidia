'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCart } from './cart-provider'
import CartSheet from './cart-sheet'

export default function CartFab({
  unitName,
  restaurantName,
  whatsappNumber,
}: {
  unitName: string
  restaurantName: string
  whatsappNumber: string | null
}) {
  const { state } = useCart()
  const [open, setOpen] = useState(false)

  const count = state.items.reduce((sum, item) => sum + item.qty, 0)

  if (count === 0) return null

  return (
    <>
      <Button
        type="button"
        className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 shadow-lg"
        onClick={() => setOpen(true)}
      >
        {`Ver carrinho — ${count} ${count === 1 ? 'item' : 'itens'}`}
      </Button>
      <CartSheet
        open={open}
        onOpenChange={setOpen}
        unitName={unitName}
        restaurantName={restaurantName}
        whatsappNumber={whatsappNumber}
      />
    </>
  )
}
