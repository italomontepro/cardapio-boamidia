import type { CartItem } from './cart-types'
import { formatBRL } from './format'

export type DeliveryType = 'pickup' | 'delivery' | null

export function buildOrderMessage(params: {
  unitName: string
  restaurantName: string
  customerName: string // '' if omitted
  deliveryType: DeliveryType
  items: CartItem[]
}): string {
  const { unitName, restaurantName, customerName, deliveryType, items } = params
  const lines: string[] = []

  lines.push(`Pedido - ${restaurantName} (${unitName})`)
  if (customerName.trim()) lines.push(`Cliente: ${customerName.trim()}`)
  if (deliveryType === 'pickup') lines.push('Retirar no local')
  if (deliveryType === 'delivery') lines.push('Receber em casa')
  lines.push('') // blank line before item list

  for (const item of items) {
    lines.push(`${item.qty}x ${item.name} - ${formatBRL(item.price * item.qty)}`)
    if (item.notes.trim()) lines.push(`  Obs: ${item.notes.trim()}`)
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  lines.push('')
  lines.push(`Subtotal: ${formatBRL(subtotal)}`)

  return lines.join('\n')
}

export function buildWhatsAppUrl(whatsappNumberE164: string, message: string): string {
  const digitsOnly = whatsappNumberE164.replace(/[^0-9]/g, '')
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`
}
