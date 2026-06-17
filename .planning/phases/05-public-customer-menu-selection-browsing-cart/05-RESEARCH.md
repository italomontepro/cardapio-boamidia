# Phase 5: Public Customer Menu — Selection, Browsing & Cart - Research

**Researched:** 2026-06-17
**Domain:** Next.js 16 public-facing dynamic routes, Drizzle direct-Postgres queries, client-side cart state (React Context + localStorage), browser Geolocation API, base-ui-based shadcn components (Tabs, Sheet)
**Confidence:** HIGH

## Summary

This phase is mostly assembly of already-established project patterns, not new architecture. The codebase already has a settled Server Component + Drizzle data-fetching convention (`db.query.X.findMany({ with: {...} })`) and a settled Server Action convention — Phase 5 reuses the read side of that convention with no auth guard, since the menu is public. The single most important discovery is that **this project's Drizzle runtime connection (`DATABASE_URL_RUNTIME`) connects directly to Postgres as the `postgres` role through Supabase's pooler — not through PostgREST/supabase-js — which means RLS is never evaluated for Drizzle queries today.** RLS in this codebase is a defense-in-depth layer against direct anon REST/JS-client access, not something Drizzle ever interacts with. This fully resolves research question 1: no new RLS policies are needed, and Drizzle should be used directly in public Server Components exactly like it already is in `/painel`, just without `getCurrentAdmin()`.

The second major discovery is that `components.json` already declares `"style": "base-nova"`, which is shadcn's Base UI registry (not Radix). Verified directly against the live shadcn registry: the `base-nova` Tabs component imports from `@base-ui/react/tabs` and the `base-nova` Sheet component imports from `@base-ui/react/dialog` (Sheet is a styled Dialog variant in Base UI, no separate primitive). Running `npx shadcn@latest add tabs sheet` in this project is safe and will NOT introduce Radix — it will exactly match the existing `dialog.tsx`/`accordion.tsx` pattern.

Third, Next.js 16's caching model is a clean reversal from 13–15: **all routes are dynamic by default**, `force-dynamic` is deprecated/unnecessary, and nothing is cached unless explicitly wrapped in `use cache`. This project has no `cacheComponents` experimental flag and no existing `dynamic`/`generateStaticParams` usage anywhere — so the simplest path (plain async Server Components reading `await params`, no static generation, no Suspense gymnastics) is both idiomatic and sufficient for this MVP's traffic scale.

**Primary recommendation:** Public Server Components fetch via Drizzle directly (mirroring `/painel/disponibilidade/page.tsx`'s pattern: fetch categories+products, fetch unit-scoped unavailable IDs, filter in JS); cart state lives in a Client Component Context scoped to the `/r/[restaurantSlug]/[unitSlug]` route segment, persisted to `localStorage` keyed by `restaurantId:unitId`, read via a `useEffect`-gated hydration guard (not `useSyncExternalStore`, which is overkill for this single-tab use case); `npx shadcn@latest add tabs sheet` is safe to run as-is.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Seleção de unidade**
- D-01: More than one unit → card list (name, address, hours); tap card → that unit's menu.
- D-02: Only one unit → skip selection screen, go straight to that unit's menu.
- D-03: iFood-style — request browser geolocation permission, sort/suggest nearest unit using lat/lng (now available via Phase 04.1). No longer blocked.
- D-04: Last visited unit remembered via `localStorage`, scoped per restaurant.
- D-05: Current unit name always visible/fixed on the menu ("você está em: [unidade]").

**Layout do cardápio**
- D-06: Categories shown as tabs at the top — one category visible at a time.
- D-07: `is_featured=true` products appear in a "Destaques" strip fixed above the tabs (always visible regardless of selected tab) AND normally inside their category — both, not either/or.

**Carrinho — interação e persistência**
- D-08: Floating fixed footer button ("Ver carrinho — N itens") opens a bottom sheet with cart items.
- D-09: Tapping a product opens a Dialog (large photo, description, quantity stepper, notes field); "Adicionar ao carrinho" confirms and closes.
- D-10: Cart persists via `localStorage`, scoped per unit (`restaurantId` + `unitId`) — not shared across units of the same restaurant.
- D-11: Inside the bottom sheet, each item has an inline +/- stepper and a remove button — no reopening the Dialog to edit.

**Estados vazios e casos extremos**
- D-12: Invalid/disabled restaurant or unit slug → Next.js's generic 404 (`not-found.tsx`), no custom branding this phase.
- D-13: Category with zero available products at the selected unit → entire tab/category hidden (no empty-state message).

### Claude's Discretion
- Exact visual of the current-unit indicator (badge, sticky header, etc.).
- Exact PT-BR copy for error/empty messages.
- Client-side Haversine implementation (no new dependency — coordinates come ready from the DB).
- Price formatting via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Which shadcn components to install via CLI: `tabs` and `sheet`.
- Exact structure of the cart's React Context (reducer vs. simple state) and its `localStorage` sync hook.

### Deferred Ideas (OUT OF SCOPE)
- Admin unit-location map wizard — already delivered in Phase 04.1 (inserted before this phase specifically to unblock D-03). Nothing further deferred from this phase's scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MENU-01 | Customer opens restaurant's unique link and sees unit selection (or auto-skip if 1 unit) | "Public Data Access" + "Routing & Rendering Strategy" sections — `/r/[restaurantSlug]/page.tsx` Server Component pattern, D-01/D-02 logic |
| MENU-02 | Customer picks unit, sees menu organized by admin-defined category order | "Don't Hand-Roll" + Code Examples — mirrors `/painel/disponibilidade` category+product fetch with `orderBy: [asc(sortOrder)]` |
| MENU-03 | Only products available at selected unit shown | "Featured Products Query Pattern" — sparse exclusion Set filtering, single query reused for both category list and Destaques strip |
| MENU-04 | Featured products visually highlighted | Same as MENU-03 — `isFeatured` field already in schema, filter in JS from one fetched dataset |
| MENU-05 | Prices in pt-BR currency format, responsive/mobile-first layout | "pt-BR Price Formatting" section |
| MENU-06 | Empty states handled gracefully (no units, empty category) | D-13 (hide category entirely) + "Common Pitfalls" — no-units case still needs explicit handling (not in D-13, separate from category-empty case) |
| MENU-07 | (Geolocation-based nearest-unit / iFood-style D-03) | "Haversine + Browser Geolocation" section — full client-side implementation pattern |
| CART-01 | Add products to cart with quantities, per-item notes | "Client-Side Cart Architecture" — Context + Dialog (D-09) pattern |
| CART-02 | Adjust quantities / remove items afterward | "Client-Side Cart Architecture" — bottom sheet inline stepper (D-11) |
| CART-03 | Cart persists appropriately (scoped per unit) | "Client-Side Cart Architecture" — localStorage key scoping (D-10) |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.2 (installed, verified) | Public data fetching from Postgres | Already the project's sole ORM; no new pattern needed for public reads |
| @base-ui/react | 1.5.0 (installed, verified) | Tabs (D-06) and Sheet (D-08) primitives | Project's `components.json` is `"style": "base-nova"` — base-ui is the only primitive library in use (dialog.tsx, accordion.tsx, select.tsx, switch.tsx, tooltip.tsx all confirmed base-ui-based) |
| shadcn (CLI) | 4.11.0 (installed, verified) | Generates tabs.tsx / sheet.tsx into `src/components/ui/` | Already used for every existing UI primitive in this project |
| next/image | bundled with next@16.2.9 | Product photo rendering | `remotePatterns` for `*.supabase.co` already configured in `next.config.ts` — zero additional config needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Context + `useReducer` | bundled with react@19.2.7 | Cart state | First significant client state in the project (per CONTEXT.md) — no new dependency, scoped Provider at the `[unitSlug]` route segment |
| `Intl.NumberFormat` | native (Node/browser) | pt-BR currency formatting | Zero-dependency, locale-correct, works identically in RSC and client components |
| Geolocation API (`navigator.geolocation`) | native browser API | D-03 nearest-unit suggestion | No library needed; standard W3C API, supported in all evergreen mobile browsers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct Drizzle reads (no RLS-aware client) | New public RLS policies + supabase-js anon client | Unnecessary extra round trip through PostgREST and a second client library for a problem the project already doesn't have (Drizzle bypasses RLS via the `postgres` role already) — would only matter if a browser-side client ever queried Supabase directly, which this phase does not do |
| React Context + useReducer for cart | zustand / jotai | CONTEXT.md explicitly forbids new state libraries; Context is fully sufficient for a single nested route's cart with < 50 typical line items |
| Plain `useEffect`-gated localStorage read | `useSyncExternalStore`-based custom hook | `useSyncExternalStore` only pays off for cross-tab/cross-component sync of *external* mutable sources outside React's render; for a single Provider that owns the canonical state and only mirrors it into localStorage, a `useEffect` write-through + lazy `useState` initializer guarded by `typeof window !== 'undefined'` is simpler and is what most production Next.js cart implementations use |
| Server Component fetch via Drizzle | tRPC / REST API route | No existing API-route pattern in this project; Server Components reading Drizzle directly is the established convention for every other page |

**Installation:**
```bash
npx shadcn@latest add tabs sheet
```
No `npm install` of new base packages required — `@base-ui/react` and `class-variance-authority` are already dependencies; the CLI only adds new files under `src/components/ui/`.

**Version verification:**
```
shadcn: 4.11.0 (npm registry, matches package.json exactly)
@base-ui/react: 1.5.0 (npm registry, matches package.json exactly)
next: 16.2.9 (npm registry, matches package.json exactly)
react: 19.2.7 (npm registry; package.json pins ^19.2.4, resolves to 19.2.7)
tailwindcss: 4.3.1 (npm registry; package.json pins ^4)
```
All verified 2026-06-17 against the live npm registry — no drift between training-data assumptions and actual installed/available versions.

## Architecture Patterns

### Recommended Project Structure
```
src/app/r/[restaurantSlug]/
├── page.tsx                    # Server Component: fetch restaurant+units by slug,
│                                #   404 if missing/inactive, auto-redirect if 1 unit (D-02),
│                                #   render unit card list otherwise (D-01)
├── unit-picker.tsx              # Client Component: geolocation request + Haversine sort (D-03),
│                                #   localStorage "last visited unit" read/write (D-04)
└── [unitSlug]/
    ├── page.tsx                 # Server Component: fetch unit + categories/products/availability,
    │                             #   404 if unit missing/restaurant mismatch, render menu
    ├── menu-view.tsx             # Client Component: Tabs (D-06), Destaques strip (D-07),
    │                             #   current-unit indicator (D-05)
    ├── product-dialog.tsx        # Client Component: Dialog w/ stepper + notes (D-09)
    ├── cart-sheet.tsx             # Client Component: Sheet w/ inline steppers (D-08, D-11)
    ├── cart-provider.tsx          # Client Component: Context + useReducer + localStorage sync
    └── cart-fab.tsx               # Client Component: floating "Ver carrinho — N itens" button

src/lib/menu/
├── queries.ts                   # Server-only: getRestaurantBySlug, getUnitsForRestaurant,
│                                 #   getMenuForUnit (categories+products+availability filter)
└── format.ts                    # formatBRL(price), haversineDistanceKm(a, b)

src/app/r/[restaurantSlug]/[unitSlug]/not-found.tsx   # D-12 (or a shared one at src/app/r/ level —
                                                        # Next.js resolves the nearest not-found.tsx
                                                        # up the segment tree when notFound() is called)
```

### Pattern 1: Public Data Access via Drizzle (no RLS policy changes needed)
**What:** Server Components import `db` from `@/db` exactly like `/painel` pages do, but skip `getCurrentAdmin()` entirely since there is no session to check.
**When to use:** Every data read on the `/r/...` route tree.
**Why this is safe:** `src/db/index.ts` connects via `DATABASE_URL_RUNTIME`, a direct Postgres connection string (Supabase Transaction Mode pooler, port 6543) authenticated as the `postgres` role. Postgres RLS policies are not evaluated for the table owner/superuser by default (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` does not restrict superusers/owners unless `FORCE ROW LEVEL SECURITY` is also set, which this schema does not use). This means **every Drizzle query in this codebase — admin and now public — has always run with full table access, regardless of the RLS policies in `0002_rls_policies.sql`.** Those RLS policies exist purely to lock down the PostgREST/anon-key surface (e.g. if someone queries Supabase directly from a browser with the publishable key), which this project's public menu pages do not do — they render server-side via Drizzle.
**Required server-side filtering (since RLS provides no automatic safety net here):** Every public query MUST explicitly filter `restaurants.isActive = true` and scope all child fetches by the resolved `restaurantId`/`unitId` — there is no policy doing this implicitly. Get this wrong and an inactive/deleted restaurant's data would still render.
**Example:**
```typescript
// src/lib/menu/queries.ts — Server-only, no 'use server' (not a Server Action, never called from a form)
import { db } from '@/db'
import { restaurants, units, categories, products, productAvailability } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function getRestaurantBySlug(slug: string) {
  const restaurant = await db.query.restaurants.findFirst({
    where: and(eq(restaurants.slug, slug), eq(restaurants.isActive, true)),
  })
  return restaurant ?? null // caller invokes notFound() when null
}

export async function getUnitsForRestaurant(restaurantId: string) {
  return db.query.units.findMany({
    where: eq(units.restaurantId, restaurantId),
    orderBy: (u, { asc }) => [asc(u.name)],
  })
}

export async function getMenuForUnit(restaurantId: string, unitId: string) {
  // Mirrors src/app/painel/disponibilidade/page.tsx exactly, scoped to ONE unit
  // instead of all units, and pre-filtering instead of just labeling.
  const categoriesWithProducts = await db.query.categories.findMany({
    where: eq(categories.restaurantId, restaurantId),
    orderBy: (c, { asc }) => [asc(c.sortOrder)],
    with: { products: { orderBy: (p, { asc }) => [asc(p.sortOrder)] } },
  })

  const unavailableRows = await db
    .select({ productId: productAvailability.productId })
    .from(productAvailability)
    .where(eq(productAvailability.unitId, unitId))
  const unavailableIds = new Set(unavailableRows.map((r) => r.productId))

  const categoriesFiltered = categoriesWithProducts
    .map((cat) => ({
      ...cat,
      products: cat.products.filter((p) => !unavailableIds.has(p.id)),
    }))
    .filter((cat) => cat.products.length > 0) // D-13: hide empty categories entirely

  const featured = categoriesFiltered.flatMap((c) => c.products).filter((p) => p.isFeatured)

  return { categories: categoriesFiltered, featured }
}
```
This single `getMenuForUnit` call satisfies MENU-02, MENU-03, MENU-04, and D-13 with no second round-trip for the Destaques strip — `featured` is derived in JS from the already-fetched, already-availability-filtered list.

### Pattern 2: Auto-skip unit selection (D-02) + 404 on invalid slug (D-12)
**What:** `src/app/r/[restaurantSlug]/page.tsx` resolves the restaurant, fetches its units, and either redirects (1 unit) or renders the picker (2+ units) or calls `notFound()` (0 units is also arguably an empty state, not a 404 — see Common Pitfalls).
**Example:**
```typescript
// src/app/r/[restaurantSlug]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { getRestaurantBySlug, getUnitsForRestaurant } from '@/lib/menu/queries'
import UnitPicker from './unit-picker'

export default async function RestaurantPage({
  params,
}: { params: Promise<{ restaurantSlug: string }> }) {
  const { restaurantSlug } = await params // Next.js 16: params is always a Promise
  const restaurant = await getRestaurantBySlug(restaurantSlug)
  if (!restaurant) notFound() // D-12

  const restaurantUnits = await getUnitsForRestaurant(restaurant.id)
  if (restaurantUnits.length === 0) {
    // Empty state (MENU-06), distinct from D-12's "invalid slug" — restaurant IS valid,
    // it simply has no units yet. Render a message, do NOT 404.
    return <NoUnitsEmptyState restaurantName={restaurant.name} />
  }
  if (restaurantUnits.length === 1) {
    redirect(`/r/${restaurantSlug}/${restaurantUnits[0].slug}`) // D-02
  }

  return <UnitPicker restaurant={restaurant} units={restaurantUnits} /> // D-01, D-03, D-04
}
```

### Pattern 3: Cart Context scoped to the unit route segment
**What:** `CartProvider` wraps only `[unitSlug]/layout.tsx`, not the root layout — each unit's subtree gets its own Provider instance, and remounting on navigation between units is actually desirable (D-10 wants isolated per-unit carts, and a fresh Provider per unit naturally re-reads the correct localStorage key for that `restaurantId:unitId` pair).
**Example:**
```typescript
// src/app/r/[restaurantSlug]/[unitSlug]/layout.tsx
import { CartProvider } from './cart-provider'

export default async function UnitLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ restaurantSlug: string; unitSlug: string }> }) {
  // Resolve restaurantId/unitId here (or pass slugs down and resolve inside the Server Component
  // page that already does it) so CartProvider gets a stable storage key.
  return <CartProvider>{children}</CartProvider>
}
```
```typescript
// src/app/r/[restaurantSlug]/[unitSlug]/cart-provider.tsx
'use client'
import { createContext, useContext, useEffect, useReducer, useState } from 'react'

type CartItem = { productId: string; name: string; price: number; qty: number; notes: string }
type CartState = { items: CartItem[] }
type CartAction =
  | { type: 'ADD'; item: CartItem }
  | { type: 'SET_QTY'; productId: string; qty: number }
  | { type: 'REMOVE'; productId: string }
  | { type: 'HYDRATE'; items: CartItem[] }

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'HYDRATE': return { items: action.items }
    case 'ADD': return { items: [...state.items, action.item] }
    case 'SET_QTY':
      return { items: state.items.map((i) => i.productId === action.productId ? { ...i, qty: action.qty } : i) }
    case 'REMOVE':
      return { items: state.items.filter((i) => i.productId !== action.productId) }
  }
}

const CartContext = createContext<{ state: CartState; dispatch: React.Dispatch<CartAction> } | null>(null)

export function CartProvider({
  children, storageKey,
}: { children: React.ReactNode; storageKey: string }) {
  const [state, dispatch] = useReducer(reducer, { items: [] })
  const [hydrated, setHydrated] = useState(false)

  // Read localStorage AFTER mount only — avoids SSR/client hydration mismatch,
  // since the server has no access to localStorage and would always render { items: [] }.
  useEffect(() => {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      try { dispatch({ type: 'HYDRATE', items: JSON.parse(raw) }) } catch { /* corrupt data, ignore */ }
    }
    setHydrated(true)
  }, [storageKey])

  // Write-through AFTER initial hydration — prevents the hydration read from
  // immediately re-triggering a write of the default empty state, which would
  // clobber existing localStorage data on first render.
  useEffect(() => {
    if (hydrated) localStorage.setItem(storageKey, JSON.stringify(state.items))
  }, [state, hydrated, storageKey])

  return <CartContext.Provider value={{ state, dispatch }}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
```
`storageKey` should be computed as `` `cart:${restaurantId}:${unitId}` `` (D-10) and passed down from the Server Component page/layout that already resolved both IDs — do not resolve slugs to IDs again on the client.

### Anti-Patterns to Avoid
- **Fetching `product_availability` per-product in a loop:** Always fetch the full unavailable-ID set for the unit in one query and filter in-memory (as established in `/painel/disponibilidade`), never N+1 query per product.
- **Using `force-dynamic` or `generateStaticParams`:** Next.js 16 makes all routes dynamic by default; adding `export const dynamic = 'force-dynamic'` is a no-op leftover from pre-16 habits and Next.js's own migration guide says to remove it. Don't add it preemptively.
- **Reaching for `useSyncExternalStore` for the cart:** Tempting given the localStorage angle, but this is the Provider-owns-canonical-state-and-mirrors-to-storage pattern, not the read-from-external-store pattern `useSyncExternalStore` is designed for. Simpler `useEffect`-based hydrate/persist is the idiomatic choice here and is what most current Next.js cart tutorials converge on.
- **Mixing Radix and Base UI components:** Do not hand-write a Tabs/Sheet component from `@radix-ui/react-tabs` even if a recalled tutorial uses Radix — this project's `components.json` style (`base-nova`) and every existing overlay component is Base UI. Always run `npx shadcn@latest add <name>` and let the CLI read `components.json` rather than copy-pasting code from shadcn's default (Radix) docs examples.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Tabs UI (D-06) | Custom tab-switching state + ARIA roles | `npx shadcn@latest add tabs` (Base UI-backed) | Accessibility (keyboard nav, ARIA) is handled correctly out of the box; matches existing component conventions |
| Bottom sheet (D-08) | Custom fixed-position drawer + focus trap | `npx shadcn@latest add sheet` (Base UI Dialog variant, side="bottom") | Focus trapping, ESC-to-close, backdrop, and animation states are already solved exactly like `dialog.tsx` |
| pt-BR currency formatting | Manual string manipulation (`R$ ${price.toFixed(2).replace('.', ',')}`) | `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` | Native API handles thousands separators (`.`), decimal comma, and the `R$` symbol placement correctly for all magnitudes; manual string logic breaks on values ≥ 1000 |
| Distance calculation (D-03) | Pulling in a geo library (turf.js, geolib) | Inline ~10-line Haversine function | CONTEXT.md explicitly calls for "sem dependência externa nova"; Haversine is simple enough that a library adds bundle weight for zero benefit at this precision (restaurant-unit-picking, not navigation-grade accuracy) |
| Slug-based 404 handling (D-12) | Custom error boundary / redirect-to-error-page logic | Next.js's `notFound()` + a `not-found.tsx` file | This is exactly what the App Router convention exists for; D-12 explicitly asks for the generic default, so no custom UI is even needed beyond the default file |

**Key insight:** Every "don't hand-roll" item in this phase already has a zero-cost, zero-new-dependency native or already-installed solution. The discretion items in CONTEXT.md (Haversine, Intl.NumberFormat, shadcn component choice, Context structure) were pre-vetted by the user/planner specifically because they're the "right size" for a hand-rolled approach — anything bigger should raise a flag.

## Common Pitfalls

### Pitfall 1: Confusing "0 units" with "invalid slug" (D-12 vs MENU-06)
**What goes wrong:** Treating a restaurant with zero registered units the same as an invalid/inactive restaurant slug, calling `notFound()` for both.
**Why it happens:** D-12 only says "invalid restaurant/unit slug → 404"; a restaurant that exists, is active, but has 0 units is a *valid* restaurant in an *empty state*, not an invalid link.
**How to avoid:** `notFound()` only when the restaurant row doesn't exist or `isActive=false`. A 0-units restaurant should render a graceful "este restaurante ainda não tem unidades cadastradas" message (MENU-06 empty state), not a 404.
**Warning signs:** Newly-provisioned (Phase 2) restaurants with no units yet would incorrectly 404 instead of showing an expected pre-launch state.

### Pitfall 2: SSR/client hydration mismatch from reading localStorage during render
**What goes wrong:** Reading `localStorage.getItem(...)` directly in a component body (not inside `useEffect`) causes a React hydration error, because the server-rendered HTML has no localStorage access and always assumes empty state, while the client's first paint may differ.
**Why it happens:** Next.js Server Components + the first client render must produce identical output; localStorage is only available client-side, after mount.
**How to avoid:** Always gate the read inside `useEffect` (as shown in Pattern 3), and render a consistent "empty/loading" cart state until `hydrated` flips true. Optionally show a skeleton for the floating cart button during the brief pre-hydration window.
**Warning signs:** React DevTools/console hydration mismatch warnings; cart count flickering from 0 to N right after page load.

### Pitfall 3: Writing the empty default state back to localStorage before hydration completes
**What goes wrong:** If the persist-effect runs before the hydrate-effect populates real data, it overwrites existing cart data in localStorage with `[]`.
**Why it happens:** `useReducer`'s initial state and the persist `useEffect` both run on first render, before the hydrate effect's `dispatch` resolves.
**How to avoid:** Gate the persist effect behind the `hydrated` boolean (shown in Pattern 3) so it never writes until after the hydrate read has completed.
**Warning signs:** Customer revisits a unit page and finds their previously-added cart items gone.

### Pitfall 4: Geolocation permission denial breaking the unit picker
**What goes wrong:** Treating `getCurrentPosition`'s error callback as a fatal error instead of a graceful fallback, e.g. showing an error message blocking the page instead of just falling back to the unsorted card list.
**Why it happens:** Easy to forget that denial (`error.code === 1`, `PERMISSION_DENIED`), timeout (`error.code === 3`), or `POSITION_UNAVAILABLE` (`error.code === 2`) are all *expected, common* outcomes — many mobile users deny location by default or are indoors with poor GPS.
**How to avoid:** Wrap the geolocation call so any error path simply renders the plain D-01 card list (no sorting, no error banner) — this is explicitly required by D-03's "graceful fallback" language in the phase description. Never call `getCurrentPosition` without both success and error callbacks supplied.
**Warning signs:** Picker page appears broken/blank for users who deny the permission prompt.

### Pitfall 5: Geolocation requires HTTPS in production
**What goes wrong:** `navigator.geolocation` silently fails (rejects immediately, or the API is `undefined`) when the page is served over plain HTTP.
**Why it happens:** Browsers restrict the Geolocation API to secure contexts (HTTPS or localhost) as a privacy/security measure.
**How to avoid:** Not an issue for this project — Vercel deploys are HTTPS by default — but `localhost` dev testing also works fine since `localhost` counts as a secure context. Worth a defensive `if (!navigator.geolocation) { /* fall back silently */ }` check regardless, for older/unusual browsers.
**Warning signs:** Geolocation works in local dev over `http://localhost` but a staging/preview deploy served over HTTP (not HTTPS) would break it — verify Vercel preview URLs are HTTPS (they are, by default).

### Pitfall 6: Assuming shadcn docs examples use the same primitive as this project
**What goes wrong:** Copying a Tabs/Sheet code snippet straight from `ui.shadcn.com`'s rendered documentation page, which defaults to showing Radix-based examples, into this Base UI project.
**Why it happens:** As of the shadcn January 2026 Base UI release, the public docs site supports toggling between Radix and Base UI examples, but the default/landing view is often Radix, and prop APIs differ subtly between the two (e.g., Base UI's `onValueChange` patterns, as already noted in this project's STATE.md for Select: "base-ui Select onValueChange passes string|null").
**How to avoid:** Never hand-copy from the docs site. Always run `npx shadcn@latest add tabs sheet` (the CLI reads `components.json`'s `"style": "base-nova"` and pulls the correct registry variant automatically — verified directly against `https://ui.shadcn.com/r/styles/base-nova/tabs.json` and `.../sheet.json`, both of which import from `@base-ui/react/*`).
**Warning signs:** TypeScript errors on `Tabs.Root`/`onValueChange` props that don't match Base UI's actual API shape; runtime errors about missing Radix peer dependencies that aren't installed in this project.

### Pitfall 7: Double-counting featured products or re-querying for the Destaques strip
**What goes wrong:** Running a second Drizzle query filtered by `isFeatured=true` for the Destaques strip, in addition to the per-category query — doubling round-trips and risking the two lists drifting (e.g., a featured product hidden by availability in one query but not the other).
**How to avoid:** Derive `featured` in JS from the same already-availability-filtered `categoriesFiltered` array (shown in Pattern 1) via `.flatMap(...).filter(p => p.isFeatured)`. Guarantees the featured strip never shows an unavailable product.

## Code Examples

### pt-BR Price Formatting
```typescript
// src/lib/menu/format.ts
export function formatBRL(price: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)
}
// formatBRL(12.5) -> "R$ 12,50"
// formatBRL(1234.5) -> "R$ 1.234,50"
```
Note: `products.price` is stored as Drizzle `numeric` (string in JS by default unless `mode: 'number'` is set — confirm via `schema.ts`: `price: numeric('price', { precision: 10, scale: 2 })` has NO `mode: 'number'`, so it arrives as a **string** from Drizzle, same as `units.lat`/`lng` would without `mode: 'number'`). Convert with `Number(product.price)` before passing to `formatBRL`. This mirrors the existing pattern in `src/lib/catalog/actions.ts` where `price.toFixed(2)` is called on a Zod-parsed number before insert — the round-trip back out needs an explicit `Number()` cast since Drizzle's pg `numeric` type (without `mode: 'number'`) returns strings to preserve precision.

### Haversine Distance (client-side, D-03)
```typescript
// src/lib/menu/format.ts (or a dedicated geo.ts)
function toRad(deg: number): number { return (deg * Math.PI) / 180 }

export function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng
  return 2 * R * Math.asin(Math.sqrt(h))
}
```
Units missing `lat`/`lng` (nullable per Phase 04.1) must be excluded from distance sorting (treat as "unknown distance", sort to the end) rather than crashing on `null` arithmetic.

### Browser Geolocation with Graceful Fallback (D-03)
```typescript
// inside unit-picker.tsx ('use client')
function requestLocation(
  onSuccess: (coords: { lat: number; lng: number }) => void,
  onFallback: () => void,
) {
  if (!navigator.geolocation) { onFallback(); return }
  navigator.geolocation.getCurrentPosition(
    (pos) => onSuccess({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    () => onFallback(), // covers PERMISSION_DENIED (1), POSITION_UNAVAILABLE (2), TIMEOUT (3) uniformly
    { timeout: 8000, maximumAge: 60_000 },
  )
}
```
Per D-03 and Pitfall 4: every error code collapses to the same fallback (render the unsorted D-01 card list) — there's no requirement to distinguish error types in the UI for this phase.

### Resolving params in Next.js 16 (async params)
```typescript
// Every dynamic route segment in this phase
export default async function Page({
  params,
}: { params: Promise<{ restaurantSlug: string; unitSlug: string }> }) {
  const { restaurantSlug, unitSlug } = await params // MUST await — params is a Promise in Next.js 16
  // ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| `params`/`searchParams` as plain sync objects | Both are `Promise`s, must `await` | Next.js 15 (continued in 16) | Every dynamic route handler in this phase must `await params` — forgetting this is a common upgrade pitfall but is a compile error in TS, not a silent bug |
| Static-by-default rendering, opt into dynamic via `force-dynamic` | Dynamic-by-default; caching is explicit via `use cache` | Next.js 16 | No `force-dynamic` exports needed anywhere in this phase; nothing should be cached unless deliberately wrapped, which this phase does not need (MVP traffic scale, mostly-fresh-on-every-request menu data is fine) |
| shadcn components hardcoded to Radix UI | shadcn supports a registry-selectable primitive: Radix or Base UI, chosen via `components.json`'s `style` field at `init` time | December 2025 (`npx shadcn create`) / January 2026 (full Base UI docs) | This project already locked in `"style": "base-nova"` — Base UI — before this phase; `add tabs sheet` will correctly continue that choice |

**Deprecated/outdated:**
- `export const dynamic = 'force-dynamic'`: no longer necessary in Next.js 16 (dynamic is the default); Next's own migration guide says to remove it.
- Copying shadcn's default rendered docs examples verbatim: as of the dual-registry (Radix/Base UI) docs, the visually-first example shown may not match this project's locked-in `base-nova` style — always use the CLI, never hand-copy.

## Open Questions

1. **Should "0 units registered" render a custom message or 404?**
   - What we know: D-12 only covers invalid/inactive *slugs*. MENU-06 requires "empty states handled gracefully," which implies a real empty-state UI, not a 404.
   - What's unclear: CONTEXT.md doesn't explicitly address the 0-units case (only D-13's "category with 0 products" is explicit).
   - Recommendation: Treat 0-units as a graceful empty state (see Pitfall 1), not a 404 — consistent with MENU-06's spirit and distinct from D-12's narrower "invalid slug" framing. Flag this interpretation to the planner/user if precision matters.

2. **Where exactly does `not-found.tsx` need to live for D-12 to cover both restaurant-level and unit-level invalid slugs?**
   - What we know: Next.js resolves `notFound()` to the nearest `not-found.tsx` up the route segment tree; a single `src/app/r/not-found.tsx` (or even the root `src/app/not-found.tsx`, which Next.js scaffolds by default in some setups — this project currently has none) would catch both cases since `notFound()` can be called from any nested Server Component.
   - What's unclear: Whether a single shared file is sufficient or the planner should create one per segment for any (currently unforeseen) reason to differentiate messaging — but D-12 explicitly says "no custom branding," so a single generic file should suffice.
   - Recommendation: Create exactly one `not-found.tsx`, ideally at `src/app/not-found.tsx` (root) since Next.js doesn't currently have one and the default Next.js 404 page is otherwise used — confirm this file doesn't already exist (checked: it does not).

3. **Does `units.lat`/`units.lng` ever need `mode: 'number'` confirmation before this phase reads them?**
   - What we know: `schema.ts` defines `lat`/`lng` as `numeric('lat', { precision: 10, scale: 7, mode: 'number' })` — `mode: 'number'` IS set (confirmed by direct read), unlike `products.price` which lacks it.
   - What's unclear: Nothing — this was directly verified in `src/db/schema.ts`. Flagging here only so the planner doesn't second-guess it: `unit.lat`/`unit.lng` arrive as JS `number | null` directly from Drizzle, no `Number()` cast needed (unlike `price`).
   - Recommendation: No action needed; documented for clarity since `price` and `lat`/`lng` behave differently (one is string-mode, the other number-mode) and conflating them would cause a bug.

## Environment Availability

No external service dependencies beyond what's already configured for this project (Supabase Postgres via existing `DATABASE_URL_RUNTIME`, already verified working in Phases 1–4.1). The browser Geolocation API is a client runtime dependency, not a build/dev-environment one — no probing needed.

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| @base-ui/react | Tabs, Sheet (D-06, D-08) | ✓ | 1.5.0 (installed) | — |
| shadcn CLI | Generating tabs.tsx/sheet.tsx | ✓ | 4.11.0 (installed) | — |
| Browser Geolocation API | D-03 nearest-unit | N/A (client runtime, not dev env) | — | Graceful fallback to unsorted card list on any failure (built into D-03's own requirement) |
| Supabase Postgres (DATABASE_URL_RUNTIME) | All menu data reads | ✓ | Already live, used by every prior phase | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — geolocation already has its fallback behavior specified as a phase requirement, not an environment gap.

## Validation Architecture

> `.planning/config.json` confirms `workflow.nyquist_validation: true` explicitly — section included per protocol.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no `jest.config.*`, `vitest.config.*`, or `*.test.*`/`*.spec.*` files found anywhere in `src/`. The project's only existing "verification" pattern is hand-written `scripts/verify-*.ts` files run via `tsx` (e.g. `scripts/verify-availability.ts`, `scripts/verify-units-location.ts`), executed against the **live** Supabase database, not a unit-test framework. |
| Config file | none — see Wave 0 |
| Quick run command | `npx tsx scripts/verify-menu.ts` (to be created, following the exact pattern of `scripts/verify-availability.ts`) |
| Full suite command | same — this project has no separate "quick vs full" distinction; each phase's verify script is its own full regression check |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|-------------|
| MENU-01 | Unit list shown for multi-unit restaurant; auto-skip for single-unit | live-db smoke script | `npx tsx scripts/verify-menu.ts` (assert unit count branching) | ❌ Wave 0 |
| MENU-02 | Categories returned in `sortOrder` | live-db smoke script | same | ❌ Wave 0 |
| MENU-03 | Unavailable products excluded from `getMenuForUnit` result | live-db smoke script | same | ❌ Wave 0 |
| MENU-04 | `isFeatured` products present in derived `featured` array | live-db smoke script | same | ❌ Wave 0 |
| MENU-05 | `formatBRL` output matches pt-BR format | unit-style assertion inside the same script (no framework needed, just `assert`/`console.error`+exit code, matching this project's existing convention) | same | ❌ Wave 0 |
| MENU-06 | 0-units and 0-available-products-in-category cases produce expected filtered output | live-db smoke script | same | ❌ Wave 0 |
| MENU-07 / D-03 | `haversineDistanceKm` correctness against known coordinate pairs | pure-function assertion inside same script | same | ❌ Wave 0 |
| CART-01/02/03 | Cart reducer logic (add/set-qty/remove) and localStorage key scoping | **manual-only** — this project has no client-side/component test framework (no Vitest/Jest/RTL installed), and the existing `scripts/verify-*.ts` pattern only exercises server-side/DB logic via `tsx`, which cannot render React or access `localStorage`/`window`. Automating this would require introducing a new test framework, which is out of scope for this phase per the "no new dependency" cart constraint's spirit. | manual test plan in PLAN.md / SUMMARY.md, exercised in a real browser | — |

### Sampling Rate
- **Per task commit:** `npx tsx scripts/verify-menu.ts` (covers all server-side/data-shape logic — categories, availability filtering, featured derivation, Haversine math, BRL formatting)
- **Per wave merge:** same script, plus a manual click-through of the cart flow (add → adjust qty → remove → reload page → confirm persistence) since there's no automated client-side test harness in this project
- **Phase gate:** `verify-menu.ts` green + manual cart click-through documented in the final plan's SUMMARY.md before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/verify-menu.ts` — new script, following `scripts/verify-availability.ts`'s exact structure (dotenv walk-up, dynamic imports after `config()`), asserting: (1) `getRestaurantBySlug` returns null for inactive/nonexistent slugs, (2) `getUnitsForRestaurant` ordering, (3) `getMenuForUnit` correctly excludes unavailable products and correctly derives `featured`, (4) category with all products unavailable is absent from the result (D-13), (5) `haversineDistanceKm` against 2-3 known coordinate pairs with expected distances, (6) `formatBRL` output strings for a few representative values.
- [ ] No framework install needed — this project's convention is hand-written `tsx` scripts with `assert`, not Jest/Vitest. Introducing a new framework solely for this phase would be inconsistent with the established pattern across Phases 1–4.1 and is not recommended.

## Sources

### Primary (HIGH confidence)
- Direct codebase reads: `src/db/schema.ts`, `src/db/index.ts`, `src/db/migrations/0002_rls_policies.sql`, `src/lib/units/actions.ts`, `src/lib/units/schema.ts`, `src/lib/catalog/actions.ts`, `src/app/painel/disponibilidade/actions.ts` + `page.tsx`, `src/lib/auth/session.ts`, `src/lib/restaurants/actions.ts`, `src/components/ui/dialog.tsx`, `src/components/ui/accordion.tsx`, `components.json`, `package.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `.env.example`
- `https://ui.shadcn.com/r/styles/base-nova/tabs.json` — direct registry fetch confirming `@base-ui/react/tabs` import
- `https://ui.shadcn.com/r/styles/base-nova/sheet.json` — direct registry fetch confirming `@base-ui/react/dialog` import (Sheet = styled Dialog variant in Base UI)
- npm registry direct queries (`npm view`) — shadcn 4.11.0, @base-ui/react 1.5.0, next 16.2.9, react 19.2.7, tailwindcss 4.3.1 — all match installed versions exactly

### Secondary (MEDIUM confidence)
- [Next.js Caching Guide / Migrating to Cache Components](https://nextjs.org/docs/app/guides/migrating-to-cache-components) — official docs, confirms dynamic-by-default in Next.js 16, `force-dynamic` deprecated
- [shadcn/ui January 2026 Base UI changelog](https://ui.shadcn.com/docs/changelog/2026-01-base-ui) — confirms dual Radix/Base UI registry support, `style` field selecting the registry
- MDN Geolocation API error codes (PERMISSION_DENIED=1, POSITION_UNAVAILABLE=2, TIMEOUT=3) — standard, stable W3C API, well-established in training data and consistent with current web search results

### Tertiary (LOW confidence)
- General web search results on `useSyncExternalStore` cart patterns and Next.js 16 App Router guides from third-party blogs (dev.to, getcraftly.dev) — used only to corroborate the recommendation against `useSyncExternalStore`, not as the basis for any factual claim about API behavior

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version verified directly against npm registry and matches installed `package.json`/`node_modules`; no training-data guesses
- Architecture: HIGH — all patterns mirror directly-read existing code in this exact codebase (Server Component + Drizzle, Server Action conventions); Next.js 16 dynamic-params/caching behavior confirmed via official docs
- Pitfalls: HIGH — RLS/Drizzle bypass behavior confirmed by reading the actual connection string and migration SQL, not assumed; Base UI vs Radix confirmed by direct registry JSON fetch, not assumed from training data

**Research date:** 2026-06-17
**Valid until:** 30 days (stable internal patterns); re-verify shadcn registry behavior and Next.js 16 caching docs if more than ~60 days pass, as both are actively evolving areas (shadcn's dual-registry support is < 6 months old as of this research date)
