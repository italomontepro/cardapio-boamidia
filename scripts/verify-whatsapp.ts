// VERIFY-WHATSAPP -- Wave 0 regression script for the WhatsApp order-generation helper (Phase 6).
// Run with: npm run verify-whatsapp
// DB-FREE: imports pure functions directly, no env loading or database needed.
//
// Assertions:
//   CART-04: buildOrderMessage produces a plain-text order summary with title, optional
//            name/delivery lines, itemized list with indented notes, and a subtotal line.
//   CART-05: buildWhatsAppUrl strips the stored E.164 whatsappNumber to digits-only and
//            encodeURIComponent-encodes the message; encode/decode round-trips losslessly.
import { buildOrderMessage, buildWhatsAppUrl } from '../src/lib/menu/whatsapp'
import type { CartItem } from '../src/lib/menu/cart-types'

function assert(cond: boolean, label: string) {
  if (!cond) {
    console.error(`FAIL: ${label}`)
    process.exit(1)
  }
  console.log(`PASS: ${label}`)
}

function main() {
  const items: CartItem[] = [
    { productId: 'p1', name: 'Pizza Margherita', price: 35, qty: 2, notes: 'sem cebola' },
    { productId: 'p2', name: 'Refrigerante', price: 6, qty: 1, notes: '' },
  ]

  // -------------------------------------------------------------------------
  // CART-04: message structure
  // -------------------------------------------------------------------------
  const msg = buildOrderMessage({
    restaurantName: 'Boa Pizza',
    unitName: 'Centro',
    customerName: 'Ana',
    deliveryType: 'pickup',
    items,
  })

  assert(
    msg.split('\n')[0] === 'Pedido - Boa Pizza (Centro)',
    'CART-04: first line is "Pedido - <restaurantName> (<unitName>)"',
  )
  assert(msg.includes('Cliente: Ana'), 'CART-04: includes "Cliente: <name>" line')
  assert(msg.includes('Retirar no local'), 'CART-04: includes "Retirar no local" for pickup')
  assert(msg.includes('2x Pizza Margherita - '), 'CART-04: item line format "qty x name - price"')
  assert(msg.includes('1x Refrigerante - '), 'CART-04: second item line format')
  assert(
    msg.split('\n').some((line) => line.startsWith('  Obs: sem cebola')),
    'CART-04: note line indented two spaces "  Obs: <notes>"',
  )

  const expectedSubtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const subtotalLine = msg.split('\n').filter((l) => l.length > 0).pop()
  assert(
    subtotalLine === `Subtotal: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expectedSubtotal)}`,
    'CART-04: last non-empty line is "Subtotal: <formatBRL(sum)>"',
  )

  // Test 2: customerName '' -> no Cliente: line
  const msgNoName = buildOrderMessage({
    restaurantName: 'Boa Pizza',
    unitName: 'Centro',
    customerName: '',
    deliveryType: 'pickup',
    items,
  })
  assert(!msgNoName.includes('Cliente:'), 'CART-04: empty customerName omits "Cliente:" line')

  // Test 3: deliveryType null -> neither pickup nor delivery line
  const msgNoDelivery = buildOrderMessage({
    restaurantName: 'Boa Pizza',
    unitName: 'Centro',
    customerName: 'Ana',
    deliveryType: null,
    items,
  })
  assert(
    !msgNoDelivery.includes('Retirar no local') && !msgNoDelivery.includes('Receber em casa'),
    'CART-04: deliveryType null omits both delivery-type lines',
  )

  // Test 4: deliveryType 'delivery' -> "Receber em casa" present
  const msgDelivery = buildOrderMessage({
    restaurantName: 'Boa Pizza',
    unitName: 'Centro',
    customerName: 'Ana',
    deliveryType: 'delivery',
    items,
  })
  assert(msgDelivery.includes('Receber em casa'), 'CART-04: deliveryType "delivery" includes "Receber em casa"')

  // -------------------------------------------------------------------------
  // CART-05: URL encoding
  // -------------------------------------------------------------------------
  const url = buildWhatsAppUrl('+5511999999999', 'oi')
  assert(url === 'https://wa.me/5511999999999?text=oi', 'CART-05: buildWhatsAppUrl basic structure')
  assert(
    url.split('?')[0] === 'https://wa.me/5511999999999',
    'CART-05: no literal "+" in the wa.me path segment',
  )

  // Round-trip: accented item name + multi-item cart -> decodeURIComponent(text) === original message
  const accentedItems: CartItem[] = [
    { productId: 'p3', name: 'Pão de Açúcar', price: 12, qty: 1, notes: 'capricha' },
    ...items,
  ]
  const roundTripMessage = buildOrderMessage({
    restaurantName: 'Boa Pizza',
    unitName: 'Centro',
    customerName: 'Ana',
    deliveryType: 'delivery',
    items: accentedItems,
  })
  const roundTripUrl = buildWhatsAppUrl('+5511999999999', roundTripMessage)
  const textParam = roundTripUrl.split('?text=')[1]
  assert(
    decodeURIComponent(textParam) === roundTripMessage,
    'CART-05: decodeURIComponent(text param) round-trips to the original message (accents + newlines)',
  )

  console.log('verify-whatsapp: all assertions passed')
}

main()
