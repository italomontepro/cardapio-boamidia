export type CartItem = {
  productId: string
  name: string
  price: number // already Number()-converted from products.price (string) by the caller
  qty: number
  notes: string
}
