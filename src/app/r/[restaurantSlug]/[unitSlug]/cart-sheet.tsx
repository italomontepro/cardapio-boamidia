'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatBRL } from '@/lib/menu/format'
import { useCart } from './cart-provider'

export default function CartSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { state, dispatch } = useCart()

  const subtotal = state.items.reduce((sum, item) => sum + item.price * item.qty, 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Seu carrinho</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4">
          {state.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Seu carrinho está vazio
            </p>
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                {state.items.map((item) => (
                  <li key={item.productId} className="flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm font-semibold">
                        {formatBRL(item.price * item.qty)}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground">{item.notes}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() =>
                            dispatch({ type: 'SET_QTY', productId: item.productId, qty: item.qty - 1 })
                          }
                        >
                          −
                        </Button>
                        <span className="w-6 text-center text-sm">{item.qty}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() =>
                            dispatch({ type: 'SET_QTY', productId: item.productId, qty: item.qty + 1 })
                          }
                        >
                          +
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => dispatch({ type: 'REMOVE', productId: item.productId })}
                      >
                        Remover
                      </Button>
                    </div>
                    <Separator className="mt-2" />
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">Subtotal</span>
                <span className="text-base font-semibold">{formatBRL(subtotal)}</span>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
