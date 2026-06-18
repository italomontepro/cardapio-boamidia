'use client'
import { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import type { CartItem } from '@/lib/menu/cart-types'

type CartState = { items: CartItem[] }
type CartAction =
  | { type: 'ADD'; item: CartItem }
  | { type: 'SET_QTY'; productId: string; qty: number }
  | { type: 'REMOVE'; productId: string }
  | { type: 'HYDRATE'; items: CartItem[] }
  | { type: 'CLEAR' }

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'HYDRATE':
      return { items: action.items }
    case 'ADD': {
      // If the same productId already exists, merge by summing qty (avoids duplicate lines for repeated adds).
      const existing = state.items.find((i) => i.productId === action.item.productId)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === action.item.productId
              ? { ...i, qty: i.qty + action.item.qty, notes: action.item.notes || i.notes }
              : i,
          ),
        }
      }
      return { items: [...state.items, action.item] }
    }
    case 'SET_QTY':
      return {
        items:
          action.qty <= 0
            ? state.items.filter((i) => i.productId !== action.productId)
            : state.items.map((i) => (i.productId === action.productId ? { ...i, qty: action.qty } : i)),
      }
    case 'REMOVE':
      return { items: state.items.filter((i) => i.productId !== action.productId) }
    case 'CLEAR':
      return { items: [] }
  }
}

const CartContext = createContext<{ state: CartState; dispatch: React.Dispatch<CartAction> } | null>(null)

export function CartProvider({ children, storageKey }: { children: React.ReactNode; storageKey: string }) {
  const [state, dispatch] = useReducer(reducer, { items: [] })
  const hydratedRef = useRef(false)

  useEffect(() => {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      try {
        dispatch({ type: 'HYDRATE', items: JSON.parse(raw) })
      } catch {
        /* corrupt, ignore */
      }
    }
    hydratedRef.current = true
  }, [storageKey])

  useEffect(() => {
    if (hydratedRef.current) localStorage.setItem(storageKey, JSON.stringify(state.items))
  }, [state, storageKey])

  return <CartContext.Provider value={{ state, dispatch }}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
