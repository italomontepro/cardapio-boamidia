'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { MessageCircle, Trash2 } from 'lucide-react'
import { formatBRL } from '@/lib/menu/format'
import { buildOrderMessage, buildWhatsAppUrl, type DeliveryType } from '@/lib/menu/whatsapp'
import { useCart } from './cart-provider'

export default function CartSheet({
  open,
  onOpenChange,
  unitName,
  restaurantName,
  whatsappNumber,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  unitName: string
  restaurantName: string
  whatsappNumber: string | null
}) {
  const { state, dispatch } = useCart()
  const [customerName, setCustomerName] = useState('')
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(null)

  const subtotal = state.items.reduce((sum, item) => sum + item.price * item.qty, 0)

  function handleSendOrder() {
    const message = buildOrderMessage({
      unitName,
      restaurantName,
      customerName,
      deliveryType,
      items: state.items,
    })
    const url = buildWhatsAppUrl(whatsappNumber!, message) // only reachable when whatsappNumber is non-null
    window.open(url, '_blank') // synchronous — do NOT await anything before this
    toast.success('Pedido enviado! Confira o WhatsApp.') // D-07, synchronous, safe
    // Cart is NOT cleared (D-06) — do not dispatch CLEAR here.
  }

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

              <Separator />

              <div className="flex flex-col gap-4">
                {whatsappNumber === null ? (
                  <p className="text-destructive text-sm">
                    Esta unidade ainda não configurou WhatsApp para pedidos.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="customer-name">Seu nome (opcional)</Label>
                      <Input
                        id="customer-name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Como podemos te chamar?"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label>Como você quer receber?</Label>
                      <Tabs
                        value={deliveryType ?? ''}
                        onValueChange={(v) => setDeliveryType((v || null) as DeliveryType)}
                      >
                        <TabsList>
                          <TabsTrigger value="pickup">Retirar no local</TabsTrigger>
                          <TabsTrigger value="delivery">Receber em casa</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    <Button type="button" className="w-full" onClick={handleSendOrder}>
                      <MessageCircle /> Enviar pedido via WhatsApp
                    </Button>
                  </>
                )}

                <AlertDialog>
                  <AlertDialogTrigger render={<Button type="button" variant="ghost" size="sm" />}>
                    <Trash2 /> Limpar carrinho
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Limpar carrinho?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Todos os itens serão removidos. Essa ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => dispatch({ type: 'CLEAR' })}
                      >
                        Limpar tudo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
