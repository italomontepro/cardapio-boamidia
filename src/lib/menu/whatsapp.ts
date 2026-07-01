import type { CartItem } from './cart-types'
import { formatBRL } from './format'

export type DeliveryType = 'pickup' | 'delivery' | null

export function buildOrderMessage(params: {
  unitName: string
  restaurantName: string
  customerName: string // '' if omitted
  deliveryType: DeliveryType
  neighborhood: string  // '' if omitted (delivery only)
  addressNumber: string // '' if omitted (delivery only)
  location: string      // '' if omitted (delivery only)
  paymentMethod: string // '' if omitted
  items: CartItem[]
}): string {
  const { unitName, restaurantName, customerName, deliveryType, neighborhood, addressNumber, location, paymentMethod, items } = params
  const lines: string[] = []

  lines.push(`Pedido - ${restaurantName} (${unitName})`)
  lines.push('')

  if (customerName.trim()) lines.push(`Nome: ${customerName.trim()}`)

  if (deliveryType === 'delivery') {
    lines.push('Entrega em domicílio')
    if (neighborhood.trim()) lines.push(`Bairro: ${neighborhood.trim()}`)
    if (addressNumber.trim()) lines.push(`N° da residência: ${addressNumber.trim()}`)
    if (location.trim()) lines.push(`Localização: ${location.trim()}`)
  } else if (deliveryType === 'pickup') {
    lines.push('Retirar no local')
  }

  if (paymentMethod.trim()) lines.push(`Forma de pagamento: ${paymentMethod.trim()}`)

  lines.push('')
  lines.push('Pedido:')
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
