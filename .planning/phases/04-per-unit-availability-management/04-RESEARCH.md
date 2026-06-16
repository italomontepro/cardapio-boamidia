# Phase 4: Per-Unit Availability Management — Research

**Researched:** 2026-06-16
**Domain:** Next.js 16 App Router + Drizzle ORM + React 19 useOptimistic + shadcn/ui Switch
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CTLG-07 | Restaurant admin can toggle a product's availability on/off per unit; toggling one unit does not affect others; a documented default applies when no explicit row exists | Sparse-table semantics already in schema + RLS; useOptimistic pattern for instant toggle feedback; single Drizzle query for full availability matrix |
</phase_requirements>

---

## Summary

Phase 4 is purely an **admin UI + Server Action** phase. No new migrations are needed — the `product_availability` table already exists in production with the correct sparse-exclusion semantics (`row exists = unavailable`, `row absent = available`). The unique constraint `product_availability_product_unit_unique` is already in the DB, which makes the INSERT path naturally idempotent with an ON CONFLICT DO NOTHING clause.

The UI is a dedicated `/painel/disponibilidade` page (mandated by UI-SPEC) with a desktop availability matrix (sticky-header table, shadcn Switch at each product×unit intersection) and a mobile unit-selector + product-list view. Both views share a single `AvailabilitySwitch` sub-component that uses React 19's `useOptimistic` for immediate feedback. The Server Action performs either DELETE (toggle on = make available) or INSERT (toggle off = make unavailable).

Three new shadcn components need to be installed: `switch`, `select`, and `tooltip`. None of them are currently in `src/components/ui/`. No toast library (sonner) exists in the project yet — the UI-SPEC explicitly allows `console.error` + inline error state as a Phase 4 fallback, so no new dependency is required for error handling.

**Primary recommendation:** Follow the UI-SPEC exactly — sparse-table toggle (DELETE on `available=true`, INSERT ON CONFLICT DO NOTHING on `available=false`), `useOptimistic` per switch, three Drizzle queries in the Server Component page (units, categories+products, unavailability rows), no transaction needed.

---

## Standard Stack

### Core (already installed — verified from package.json)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| next | 16.2.9 | App Router, Server Components, Server Actions | No changes needed |
| react | 19.2.4 | useOptimistic, useTransition | React 19 ships these natively |
| drizzle-orm | 0.45.2 | DB queries (select, insert, delete) | Already configured in src/db/index.ts |
| @supabase/ssr | 0.12.0 | Auth cookie client (getCurrentAdmin) | Already in src/lib/supabase/ |
| tailwindcss | 4.x | Styling | Already configured |
| shadcn/ui | CLI-based | Switch, Select, Tooltip | Three components need installing |
| zod | 4.4.3 | Server Action input validation | Already present |

### New shadcn Components Required

| Component | Status | Install Command |
|-----------|--------|----------------|
| switch | NOT installed — `src/components/ui/switch.tsx` absent | `npx shadcn@latest add switch` |
| select | NOT installed — `src/components/ui/select.tsx` absent | `npx shadcn@latest add select` |
| tooltip | NOT installed — `src/components/ui/tooltip.tsx` absent | `npx shadcn@latest add tooltip` |

**Installation:**
```bash
npx shadcn@latest add switch select tooltip
```

No new npm packages are needed beyond the shadcn CLI copying component files.

---

## Architecture Patterns

### Recommended Project Structure

```
src/app/painel/disponibilidade/
  page.tsx                    <- Server Component: getCurrentAdmin + 3 Drizzle queries
  availability-matrix.tsx     <- 'use client': desktop sticky-header table
  availability-mobile.tsx     <- 'use client': mobile Select + product list
  actions.ts                  <- 'use server': toggleAvailability

src/app/painel/_components/
  sidebar-nav.tsx             <- Add 4th nav link (Disponibilidade)
```

### Pattern 1: Sparse-Table Toggle via Server Action

**What:** The `product_availability` table stores only UNAVAILABILITY exceptions. Toggle is DELETE (on→available) or INSERT (off→unavailable). The unique constraint `product_availability_product_unit_unique` makes INSERT idempotent via ON CONFLICT DO NOTHING.

**Why sparse:** Schema decision D-05/D-06 is locked. UI-SPEC confirms: "Never read `is_available` boolean — the column does not exist in this schema." The table has no `is_available` column — presence of the row IS the unavailability signal.

**Server Action logic:**
```typescript
// src/app/painel/disponibilidade/actions.ts
'use server'

import { db } from '@/db'
import { productAvailability, products } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentAdmin } from '@/lib/auth/session'

export async function toggleAvailability({
  productId,
  unitId,
  available,
}: {
  productId: string
  unitId: string
  available: boolean
}): Promise<{ success: boolean; error?: string }> {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return { success: false, error: 'Não autorizado.' }

  // Tenant ownership check: product must belong to admin's restaurant
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.restaurantId, admin.restaurantId)))

  if (!product) return { success: false, error: 'Produto não encontrado.' }

  try {
    if (available) {
      // Mark available: DELETE the exclusion row (if exists)
      await db
        .delete(productAvailability)
        .where(
          and(
            eq(productAvailability.productId, productId),
            eq(productAvailability.unitId, unitId),
          ),
        )
    } else {
      // Mark unavailable: INSERT exclusion row, idempotent via ON CONFLICT DO NOTHING
      await db
        .insert(productAvailability)
        .values({ productId, unitId })
        .onConflictDoNothing()
    }
    revalidatePath('/painel/disponibilidade')
    return { success: true }
  } catch {
    return { success: false, error: 'Erro ao atualizar disponibilidade. Tente novamente.' }
  }
}
```

**No transaction needed:** Each toggle is a single atomic DELETE or INSERT. Transactions are only needed when two writes must be atomic together (like sort_order swaps in Phase 3). A single row write is inherently atomic in Postgres.

**Race condition analysis:** Two concurrent toggles on the same product×unit pair are safe because:
- DELETE on non-existent row is a no-op (0 rows affected, no error)
- INSERT with ON CONFLICT DO NOTHING on duplicate is a no-op
- The unique constraint prevents duplicate rows regardless of concurrency

### Pattern 2: Three-Query Page Data Fetch (Server Component)

**What:** Load all data for the matrix in three independent Drizzle queries in the Server Component. Do NOT do N×M queries.

```typescript
// src/app/painel/disponibilidade/page.tsx
import { db } from '@/db'
import { categories, products, units, productAvailability } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { getCurrentAdmin } from '@/lib/auth/session'

export default async function DisponibilidadePage() {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return null

  // Query 1: all units for this restaurant (sorted by name per UI-SPEC)
  const restaurantUnits = await db.query.units.findMany({
    where: eq(units.restaurantId, admin.restaurantId),
    orderBy: [asc(units.name)],
  })

  // Query 2: categories + products (nested, sorted by sort_order)
  const categoriesWithProducts = await db.query.categories.findMany({
    where: eq(categories.restaurantId, admin.restaurantId),
    orderBy: [asc(categories.sortOrder)],
    with: {
      products: { orderBy: [asc(products.sortOrder)] },
    },
  })

  // Query 3: sparse fetch — only unavailability rows for this restaurant's products
  // Uses innerJoin through products to scope by restaurant_id (no restaurant_id on product_availability)
  const unavailableRows = await db
    .select({
      productId: productAvailability.productId,
      unitId: productAvailability.unitId,
    })
    .from(productAvailability)
    .innerJoin(products, eq(productAvailability.productId, products.id))
    .where(eq(products.restaurantId, admin.restaurantId))

  // Pass serializable data to Client Components
  // ...
}
```

**Why this query structure for `unavailableRows`:** `product_availability` has no `restaurant_id` column (by design — sparse table only stores product_id + unit_id). Scoping to a restaurant requires joining through `products`. RLS already enforces this on the DB side, but the explicit WHERE clause in the action also validates it in JS for clear error messages.

### Pattern 3: useOptimistic per Switch (React 19)

**What:** Each `AvailabilitySwitch` component maintains its own `useOptimistic` state. The switch reflects the optimistic (immediate) state; if the Server Action fails, React rolls it back automatically.

**Key detail:** `useOptimistic` in React 19 takes a state value and an update function. For a simple boolean toggle, the updateFn is trivial. The transition is wrapped in `startTransition` so React can batch and schedule it correctly.

```typescript
// Within availability-matrix.tsx (or shared AvailabilitySwitch component)
'use client'

import { useOptimistic, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { toggleAvailability } from './actions'

function AvailabilitySwitch({
  productId,
  unitId,
  checked,        // true = available (no row), false = unavailable (row exists)
}: {
  productId: string
  unitId: string
  checked: boolean
}) {
  const [optimistic, setOptimistic] = useOptimistic(checked)
  const [isPending, startTransition] = useTransition()

  function handleToggle(newChecked: boolean) {
    startTransition(async () => {
      setOptimistic(newChecked)
      const result = await toggleAvailability({ productId, unitId, available: newChecked })
      if (!result.success) {
        // useOptimistic rolls back automatically when startTransition settles
        // Optionally set inline error state here
        console.error(result.error)
      }
    })
  }

  return (
    <Switch
      checked={optimistic}
      onCheckedChange={handleToggle}
      disabled={isPending}
      aria-label={
        optimistic
          ? 'Disponível — clique para marcar como indisponível'
          : 'Indisponível — clique para marcar como disponível'
      }
    />
  )
}
```

**updateFn signature:** `useOptimistic(initialState, updateFn?)`. When called with a single argument (just the state), `setOptimistic(newValue)` replaces the optimistic state directly. The `updateFn` is only needed for complex merges. For a simple boolean, `useOptimistic(checked)` with `setOptimistic(newChecked)` is sufficient — this matches the UI-SPEC exactly.

**Rollback behavior:** React 19 `useOptimistic` automatically reverts to the server-confirmed value when the `startTransition` completes. If the action succeeds, the revalidated server state (matching the optimistic value) confirms it. If the action fails, the original `checked` prop value (from the Server Component re-render or the stable initial value) is restored.

### Pattern 4: unavailableSet for O(1) lookups

**What:** Convert the flat list of unavailability rows into a `Set<string>` keyed by `"productId:unitId"` for O(1) lookup in the render loop.

```typescript
// In the Server Component, before passing to Client Components
const unavailableSet = new Set(
  unavailableRows.map((r) => `${r.productId}:${r.unitId}`)
)

// In Client Component render:
const isUnavailable = unavailableSet.has(`${product.id}:${unit.id}`)
const switchChecked = !isUnavailable   // true = available, false = unavailable
```

**Why this matters for Phase 5:** The same `unavailableSet` pattern is what Phase 5's public menu will use to filter products. Phase 5 queries `WHERE NOT EXISTS (SELECT 1 FROM product_availability WHERE ...)` — the sparse-table design means the public query is a simple NOT EXISTS join, not a full scan of all product×unit combos.

### Pattern 5: Sidebar Nav Update

**What:** Add "Disponibilidade" as the 4th item in `src/app/painel/_components/sidebar-nav.tsx`.

**Current state of sidebar-nav.tsx (verified):**
```typescript
const navLinks = [
  { href: '/painel', label: 'Visão Geral', exact: true },
  { href: '/painel/unidades', label: 'Unidades', exact: false },
  { href: '/painel/cardapio', label: 'Cardápio', exact: false },
]
```

**Required change (verbatim from UI-SPEC):**
```typescript
const navLinks = [
  { href: '/painel',                   label: 'Visão Geral',    exact: true  },
  { href: '/painel/unidades',          label: 'Unidades',       exact: false },
  { href: '/painel/cardapio',          label: 'Cardápio',       exact: false },
  { href: '/painel/disponibilidade',   label: 'Disponibilidade', exact: false },
]
```

The existing active-state pattern (`pathname.startsWith(href)`) works correctly for `/painel/disponibilidade`.

### Anti-Patterns to Avoid

- **Dense table approach:** Do NOT insert a row for every product×unit pair. The schema comment at the top of `schema.ts` explicitly prohibits this ("SPARSE TABLE CONVENTION — only insert on explicit 'mark unavailable' actions"). Phase 5's public menu query relies on the sparse model.
- **Reading `is_available` column:** The column does not exist in `product_availability`. The schema has only `id`, `product_id`, `unit_id`, `created_at`. Do not attempt to read or write an `is_available` boolean.
- **N+1 queries in the matrix:** Do not query availability per-product or per-unit inside the render loop. All availability data is loaded in one JOIN query in the Server Component.
- **useOptimistic outside startTransition:** `setOptimistic(newValue)` MUST be called inside `startTransition`. Calling it outside will either throw or not batch correctly in React 19.
- **Skipping the ownership check in the Server Action:** RLS enforces tenant isolation at the DB level, but the explicit product ownership check in the action produces clearer error messages and defense-in-depth. Do not remove it.
- **Installing sonner for toasts in this phase:** The UI-SPEC explicitly allows `console.error` + inline error state as a Phase 4 fallback. Sonner is not yet in the project and the spec does not require it for this phase.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible toggle switch | Custom `<input type="checkbox">` styled as switch | `shadcn Switch` (Radix UI Switch primitive) | Handles keyboard nav, aria-checked, focus ring, disabled state automatically |
| Idempotent insert | Manual SELECT-then-INSERT pattern | `db.insert(...).onConflictDoNothing()` | Drizzle's `.onConflictDoNothing()` maps to `INSERT ... ON CONFLICT DO NOTHING` — atomic, race-safe |
| Select/dropdown (mobile unit picker) | Custom `<select>` or bespoke dropdown | `shadcn Select` (Radix UI Select) | Accessible, keyboard navigable, works on iOS/Android |
| Tooltip on truncated names | Custom hover div | `shadcn Tooltip` (Radix UI Tooltip) | Proper ARIA role, delay, portal positioning |
| Optimistic UI state | Manual `useState` + rollback on error | `useOptimistic` (React 19 built-in) | Automatic rollback, integrates with concurrent rendering and startTransition |

**Key insight:** This phase's complexity lives entirely in the data model semantics (sparse vs. dense) and optimistic UI pattern. All the UI primitives (Switch, Select, Tooltip) are well-solved problems via shadcn/Radix. Do not reinvent them.

---

## Common Pitfalls

### Pitfall 1: Reading a non-existent `is_available` column

**What goes wrong:** Developer assumes the schema has `is_available: boolean` on `product_availability` and tries to read it. TypeScript will catch this if using Drizzle's inferred types, but it's an easy conceptual mistake.

**Why it happens:** The table name suggests it stores availability state; one might assume a boolean column exists.

**How to avoid:** The table has columns: `id`, `product_id`, `unit_id`, `created_at`. Existence of a row = unavailable. Check the schema at `src/db/schema.ts` line 77-86.

**Warning signs:** TypeScript error "Property 'isAvailable' does not exist on type..."; SQL error "column is_available does not exist".

### Pitfall 2: useOptimistic state mismatch after page revalidation

**What goes wrong:** The Server Action calls `revalidatePath('/painel/disponibilidade')`. React re-renders the Server Component which re-fetches DB state. The `AvailabilitySwitch` receives a new `checked` prop. If the developer tracks component identity incorrectly, the optimistic state and the prop can diverge.

**Why it happens:** `useOptimistic` holds state keyed to the component instance. If the parent re-renders and changes the `checked` prop, the optimistic state should reconcile. It does reconcile in React 19 — the pending optimistic value takes priority, and once the transition settles, the latest prop wins.

**How to avoid:** Ensure the `key` prop on each `AvailabilitySwitch` is stable: `key={product.id + ':' + unit.id}`. This ensures component identity is preserved across re-renders.

### Pitfall 3: Scoping the unavailability query incorrectly

**What goes wrong:** Developer queries `db.select().from(productAvailability)` without a WHERE clause, getting ALL unavailability rows for ALL restaurants (RLS would prevent this, but the query should also be explicit).

**Why it happens:** `product_availability` has no `restaurant_id` column; the join through `products` is non-obvious.

**How to avoid:** Always join through `products` to scope by `restaurant_id`:
```typescript
await db
  .select({ productId: productAvailability.productId, unitId: productAvailability.unitId })
  .from(productAvailability)
  .innerJoin(products, eq(productAvailability.productId, products.id))
  .where(eq(products.restaurantId, admin.restaurantId))
```
RLS provides a second enforcement layer, but the explicit WHERE is for defense-in-depth and performance.

### Pitfall 4: Using `db.query.productAvailability.findMany` with `with` instead of the join query

**What goes wrong:** The relational API `db.query.productAvailability.findMany({ with: { product: true } })` would load the full product objects. This is more data than needed (only `productId` and `unitId` are needed), and the WHERE condition requires a nested field.

**How to avoid:** Use the explicit SELECT + INNER JOIN + WHERE pattern (Pitfall 3 shows the correct form). It returns only the two ID columns needed, minimizing data transfer.

### Pitfall 5: Drizzle's `.onConflictDoNothing()` vs `.onConflictDoUpdate()`

**What goes wrong:** Developer uses `.onConflictDoUpdate({ target: ..., set: { ... } })` instead of `.onConflictDoNothing()`. Since the table has no `is_available` column, there's nothing to update — the operation is semantically "ensure the row exists."

**How to avoid:** Use `.onConflictDoNothing()` — this is the correct idiom for idempotent "ensure row exists" insertions with a unique constraint.

### Pitfall 6: shadcn Switch `checked` vs `defaultChecked`

**What goes wrong:** Using `defaultChecked` (uncontrolled) instead of `checked` (controlled). With `defaultChecked`, the Switch ignores prop updates after initial render, so optimistic state changes have no visual effect.

**How to avoid:** Always use `checked={optimistic}` (controlled mode) as shown in the UI-SPEC and Pattern 3 above.

---

## Code Examples

Verified patterns from official sources and the existing codebase:

### Drizzle INSERT ON CONFLICT DO NOTHING (idempotent insert)

```typescript
// Source: Drizzle ORM docs — insert with onConflictDoNothing
await db
  .insert(productAvailability)
  .values({ productId, unitId })
  .onConflictDoNothing()
```

The unique constraint `product_availability_product_unit_unique` on `(product_id, unit_id)` ensures this is safe to call multiple times.

### Drizzle DELETE (toggle to available)

```typescript
// Source: existing pattern from src/lib/catalog/actions.ts (deleteCategory)
await db
  .delete(productAvailability)
  .where(
    and(
      eq(productAvailability.productId, productId),
      eq(productAvailability.unitId, unitId),
    ),
  )
```

### Drizzle relational query with nested `with` (same pattern as CardapioPage)

```typescript
// Source: src/app/painel/cardapio/page.tsx (existing, verified)
const categoriesWithProducts = await db.query.categories.findMany({
  where: eq(categories.restaurantId, admin.restaurantId),
  orderBy: [asc(categories.sortOrder)],
  with: {
    products: { orderBy: [asc(products.sortOrder)] },
  },
})
```

### useOptimistic for simple boolean toggle (React 19)

```typescript
// Source: React 19 docs — useOptimistic
import { useOptimistic, useTransition } from 'react'

const [optimistic, setOptimistic] = useOptimistic(checked)
const [isPending, startTransition] = useTransition()

function handleToggle(newChecked: boolean) {
  startTransition(async () => {
    setOptimistic(newChecked)   // immediate UI update
    await toggleAvailability({ productId, unitId, available: newChecked })
    // on failure: React rolls back optimistic to the prop value after transition settles
  })
}
```

### revalidatePath for availability page

```typescript
// Source: existing pattern from src/lib/catalog/actions.ts
import { revalidatePath } from 'next/cache'
revalidatePath('/painel/disponibilidade')
```

---

## DB Semantics Summary (locked decisions)

| Decision | Value | Source |
|----------|-------|--------|
| Sparse or dense | **Sparse** — row = unavailable, absence = available | schema.ts comment D-05/D-06; UI-SPEC |
| `is_available` column | **Does not exist** | schema.ts lines 77-86; migration 0000 |
| Unique constraint | `product_availability_product_unit_unique` on `(product_id, unit_id)` | migration 0000; schema.ts line 83 |
| RLS policy | `scoped via product's restaurant or super_admin` — EXISTS join through products | migration 0002_rls_policies.sql lines 103-116 |
| Default when no row | **Available** (true) | UI-SPEC "Default Availability Rule" section |
| Toggle ON (switch checked=true) | No row in table | UI-SPEC switch states table |
| Toggle OFF (switch checked=false) | Row exists in table | UI-SPEC switch states table |

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond the already-running project stack — no new services, CLIs, or runtimes required for this phase).

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | tsx scripts (no jest/vitest — project uses integration scripts) |
| Config file | none — scripts run directly via `npx tsx scripts/verify-X.ts` |
| Quick run command | `npm run verify-catalog` (extends existing script) |
| Full suite command | `npm run verify-auth && npm run verify-catalog` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTLG-07 (toggle) | INSERT row on mark-unavailable, DELETE row on mark-available | Integration | `npm run verify-availability` | Wave 0 (new script needed) |
| CTLG-07 (isolation) | Toggling unit A does not affect unit B for same product | Integration | `npm run verify-availability` | Wave 0 |
| CTLG-07 (default) | Product with no row is treated as available (absence = available) | Integration | `npm run verify-availability` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run verify-availability` (the new script, fast — direct Drizzle queries)
- **Per wave merge:** `npm run verify-auth && npm run verify-catalog && npm run verify-availability`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `scripts/verify-availability.ts` — covers CTLG-07 (toggle, isolation, default semantics)
  - Pattern: reuse the dotenv + dynamic import + db structure from `verify-catalog.ts`
  - Assertions: INSERT creates row, DELETE removes row, two units isolated, absence = available
  - Add `"verify-availability": "tsx scripts/verify-availability.ts"` to `package.json` scripts

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `useActionState` for mutation state | `useOptimistic` + `useTransition` for optimistic UI | Immediate feedback without waiting for server round-trip |
| Dense availability table (all combos pre-populated) | Sparse exclusion table (only exceptions stored) | Simpler queries, faster inserts, natural default-available semantics |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` (already in use) | No change needed — already on correct library |

**No deprecated patterns to address in this phase.**

---

## Open Questions

1. **`lucide-react` version compatibility with shadcn switch/select/tooltip**
   - What we know: `lucide-react@1.18.0` is installed (package.json). Shadcn components import icons from lucide-react.
   - What's unclear: Whether the specific icons used by switch/select/tooltip are available in this version.
   - Recommendation: Run `npx shadcn@latest add switch select tooltip` — if icon imports fail, update lucide-react. This is extremely unlikely to be an issue given the minor version gap.

2. **Tooltip necessity**
   - What we know: UI-SPEC lists tooltip as required "for truncated product names in matrix." The desktop matrix truncates long product names with `truncate` CSS class.
   - What's unclear: The UI-SPEC's AvailabilityMatrix code example uses native `title={unit.name}` on the span, not the Tooltip component, for unit column headers. The tooltip install is listed but usage may be limited to product name cells.
   - Recommendation: Install tooltip anyway (required by UI-SPEC), use it on product name cells in the matrix. If not needed after implementation, component file is harmless.

---

## Sources

### Primary (HIGH confidence)

- `src/db/schema.ts` — Actual Drizzle schema confirming sparse table, no `is_available` column, unique constraint
- `src/db/migrations/0000_useful_krista_starr.sql` — Applied migration confirming DB columns
- `src/db/migrations/0002_rls_policies.sql` — RLS policy on `product_availability` (EXISTS join through products)
- `.planning/phases/04-per-unit-availability-management/04-UI-SPEC.md` — Locked UI contract, DB semantics, action contract
- `src/app/painel/cardapio/page.tsx` — Existing pattern for Drizzle relational query with `with:`
- `src/lib/catalog/actions.ts` — Existing Server Action patterns (delete, transaction, revalidatePath)
- `src/app/painel/_components/sidebar-nav.tsx` — Current nav state (3 items, needs 4th)
- `src/components/ui/` — Confirmed absent: switch.tsx, select.tsx, tooltip.tsx
- `package.json` — Confirmed installed stack and scripts

### Secondary (MEDIUM confidence)

- React 19 `useOptimistic` docs — useOptimistic(state) with setOptimistic(newValue) inside startTransition pattern
- Drizzle ORM docs — `.onConflictDoNothing()` for idempotent inserts

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json + existing codebase
- DB semantics: HIGH — verified from migration SQL + schema.ts comments
- Architecture: HIGH — directly derived from UI-SPEC (locked contract) + existing code patterns
- useOptimistic pattern: HIGH — UI-SPEC prescribes exact pattern; matches React 19 docs
- Pitfalls: HIGH — derived from locked schema decisions and existing code patterns

**Research date:** 2026-06-16
**Valid until:** 2026-07-16 (stable stack — Next.js 16, React 19, Drizzle 0.45)
