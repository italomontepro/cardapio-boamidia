---
phase: 4
slug: per-unit-availability-management
status: draft
shadcn_initialized: true
preset: none
created: 2026-06-16
---

# Phase 4 — UI Design Contract
## Disponibilidade por Unidade — Admin de Restaurante

> Visual and interaction contract for the per-unit availability management UI. Generated for Phase 4: CTLG-07.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui |
| Preset | none (shadcn default neutral theme, oklch tokens) |
| Component library | Radix UI (via shadcn) |
| Icon library | Lucide React (bundled with shadcn) |
| Font | Geist Sans (--font-geist-sans, already configured in layout) |

**New shadcn components required for this phase:**
- `switch` — NOT yet installed (confirm: `src/components/ui/switch.tsx` does not exist)
- `select` — NOT yet installed (for mobile unit selector)
- `tooltip` — NOT yet installed (for truncated product names in matrix)

Install before execution:
```bash
npx shadcn@latest add switch select tooltip
```

---

## DB Semantics (Critical — Affects All UI Logic)

The `product_availability` table is a **sparse exclusion table**:
- **Row exists** → product is **UNAVAILABLE** at that unit
- **Row absent** → product is **AVAILABLE** at that unit (default)

UI consequence: Switch "on" = disponível (no row), Switch "off" = indisponível (row exists). Toggle "off" = INSERT row. Toggle "on" = DELETE row. Never read `is_available` boolean — the column does not exist in this schema.

---

## Page Architecture Decision

### Why a dedicated `/painel/disponibilidade` page (not embedded in Cardápio or Unidades)

The availability matrix involves **two independent dimensions simultaneously** — all products (N rows) × all units (M columns). Embedding this in the Cardápio page (product-centric accordion) would require per-product per-unit toggles inside already-nested accordion content, making the UI extremely noisy and misrepresenting the task ("I want to manage this unit's availability globally" vs. "I want to edit this product"). Embedding in Unidades page has the inverse problem.

A dedicated page allows:
1. A scannable grid overview of the entire restaurant's availability state
2. Bulk mental model: admin can see at a glance which units have the most unavailable items
3. Clean mobile collapse: unit selector + filtered product list (one dimension at a time)

The page answers the question "What is available where?" not "What is this product's detail?"

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, switch label gap |
| sm | 8px | Cell padding, badge internal spacing |
| md | 16px | Row/column header padding, section gaps |
| lg | 24px | Page section breaks, card padding |
| xl | 32px | Page header bottom margin |
| 2xl | 48px | Major layout gaps |
| 3xl | 64px | Page-level spacing (not used in dense matrix) |

Exceptions: Matrix cell padding uses `p-3` (12px) to keep the grid compact while remaining tap-friendly on mobile.

---

## Typography

| Role | Size | Weight | Line-height | Tailwind class |
|------|------|--------|-------------|----------------|
| Page heading | 20px / text-xl | font-semibold (600) | 1.2 | `text-xl font-semibold` |
| Section label | 14px / text-sm | font-medium (500) | 1.5 | `text-sm font-medium` |
| Body / cell text | 14px / text-sm | font-medium (500) | 1.5 | `text-sm font-medium` |
| Caption / helper | 12px / text-xs | font-medium (500) | 1.4 | `text-xs font-medium text-muted-foreground` |
| Unit column header | 13px / text-[13px] | font-medium (500) | 1.2 | `text-[13px] font-medium` |
| Product row label | 14px / text-sm | font-medium (500) | 1.5 | `text-sm font-medium` |

---

## Color

| Role | Token | Usage |
|------|-------|-------|
| Dominant (60%) | `--background` (oklch 1 0 0) | Page background, matrix cell backgrounds |
| Secondary (30%) | `--muted` (oklch 0.97 0 0) | Header row/column cells, sidebar, alternating row tints |
| Accent (10%) | `--primary` (oklch 0.205 0 0) | Switch thumb (on state), active nav link |
| Destructive | `--destructive` (oklch 0.577 0.245 27.325) | Not used in this phase (no delete action) |
| Unavailable product row | `opacity-50` on product name + price + image | Visual de-emphasis without color meaning |
| Badge "Indisponível" | `bg-red-100 text-red-700` | Explicit unavailability label in product row |
| Badge "Disponível" | not rendered (default state, no badge needed) | Absence = available |

Accent reserved for: Switch `data-[state=checked]` background, active nav item `bg-accent`.

---

## Sidebar Navigation Update

Add "Disponibilidade" as the 4th item in `src/app/painel/_components/sidebar-nav.tsx`:

```typescript
const navLinks = [
  { href: '/painel',               label: 'Visão Geral',    exact: true  },
  { href: '/painel/unidades',      label: 'Unidades',       exact: false },
  { href: '/painel/cardapio',      label: 'Cardápio',       exact: false },
  { href: '/painel/disponibilidade', label: 'Disponibilidade', exact: false },
]
```

The active state uses the existing pattern: `bg-accent text-accent-foreground font-medium` when `pathname.startsWith('/painel/disponibilidade')`.

---

## Page Layout — `/painel/disponibilidade`

### File structure

```
src/app/painel/disponibilidade/
  page.tsx                        ← Server Component, data fetch
  availability-matrix.tsx         ← Client Component, desktop grid
  availability-mobile.tsx         ← Client Component, mobile view
  actions.ts                      ← Server Actions (toggleAvailability)
```

### Page header

```tsx
<div className="flex flex-col gap-4">
  <div className="flex items-center justify-between">
    <h1 className="text-xl font-semibold">Disponibilidade por Unidade</h1>
  </div>
  <p className="text-sm text-muted-foreground">
    Controle quais produtos estão disponíveis em cada unidade. 
    Produtos sem configuração explícita são exibidos como disponíveis por padrão.
  </p>
</div>
```

### Empty state — no units

```tsx
<div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
  <p className="text-sm text-muted-foreground">
    Nenhuma unidade cadastrada.
  </p>
  <p className="text-xs text-muted-foreground">
    Cadastre pelo menos uma unidade em{' '}
    <a href="/painel/unidades" className="underline underline-offset-2">Unidades</a>{' '}
    para gerenciar a disponibilidade.
  </p>
</div>
```

### Empty state — no products

```tsx
<div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
  <p className="text-sm text-muted-foreground">
    Nenhum produto cadastrado.
  </p>
  <p className="text-xs text-muted-foreground">
    Adicione produtos em{' '}
    <a href="/painel/cardapio" className="underline underline-offset-2">Cardápio</a>{' '}
    para gerenciar a disponibilidade.
  </p>
</div>
```

---

## Desktop: Availability Matrix (`availability-matrix.tsx`)

### Layout

The matrix is a sticky-header scrollable table with:
- **Rows**: products (grouped by category, category name as sticky section header)
- **Columns**: units (one per unit, sticky left-column for product name)
- **Cells**: shadcn/ui `Switch` component

Primary focal point: the availability switch column for each product row — the admin's eye moves left-to-right from product name to the switch cells, completing one toggle action per row.

Shown at breakpoints `md:` and above. Hidden on mobile.

### Outer container

```tsx
<div className="hidden md:block overflow-x-auto rounded-lg border">
  <table className="w-full border-collapse text-sm">
    ...
  </table>
</div>
```

### Column headers (unit names)

```tsx
<thead>
  <tr>
    {/* Sticky product name column header */}
    <th className="sticky left-0 z-10 bg-muted px-4 py-3 text-left text-[13px] font-medium text-muted-foreground w-[280px]">
      Produto
    </th>
    {/* Unit columns */}
    {units.map((unit) => (
      <th key={unit.id} className="bg-muted px-4 py-3 text-center text-[13px] font-medium min-w-[140px]">
        <span className="block truncate max-w-[120px] mx-auto" title={unit.name}>
          {unit.name}
        </span>
      </th>
    ))}
  </tr>
</thead>
```

### Category section header rows

```tsx
<tr>
  <td
    colSpan={units.length + 1}
    className="bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-t"
  >
    {category.name}
  </td>
</tr>
```

### Product rows

```tsx
{products.map((product) => {
  const isUnavailableEverywhere = units.every((u) => unavailableSet.has(`${product.id}:${u.id}`))
  return (
    <tr
      key={product.id}
      className={cn(
        "border-t transition-colors",
        isUnavailableEverywhere && "bg-muted/30"
      )}
    >
      {/* Sticky product name cell */}
      <td className="sticky left-0 z-10 bg-background px-4 py-3 w-[280px]">
        <div className="flex items-center gap-2">
          {product.imageUrl && (
            <div className="relative h-8 w-10 shrink-0 overflow-hidden rounded">
              <Image src={product.imageUrl} alt="" fill className={cn("object-cover", isUnavailableEverywhere && "opacity-50")} />
            </div>
          )}
          <div className="min-w-0">
            <span className={cn("block truncate text-sm", isUnavailableEverywhere && "text-muted-foreground")}>
              {product.name}
            </span>
            <span className="block text-xs text-muted-foreground">
              R$ {Number(product.price).toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      </td>

      {/* Switch cells, one per unit */}
      {units.map((unit) => {
        const isUnavailable = unavailableSet.has(`${product.id}:${unit.id}`)
        return (
          <td key={unit.id} className="px-4 py-3 text-center">
            <AvailabilitySwitch
              productId={product.id}
              unitId={unit.id}
              checked={!isUnavailable}
            />
          </td>
        )
      })}
    </tr>
  )
})}
```

### AvailabilitySwitch component (within availability-matrix.tsx)

```tsx
'use client'

function AvailabilitySwitch({
  productId,
  unitId,
  checked,
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
      await toggleAvailability({ productId, unitId, available: newChecked })
    })
  }

  return (
    <Switch
      checked={optimistic}
      onCheckedChange={handleToggle}
      disabled={isPending}
      aria-label={optimistic ? 'Disponível — clique para marcar como indisponível' : 'Indisponível — clique para marcar como disponível'}
    />
  )
}
```

**Switch states:**
| Visual state | `checked` value | DB state | Label |
|---|---|---|---|
| Switch ON (thumb right, dark track) | `true` | No row in product_availability | "Disponível" |
| Switch OFF (thumb left, light track) | `false` | Row exists in product_availability | "Indisponível" |
| Pending (opacity-70, pointer-events-none) | — | Optimistic update in flight | — |

---

## Mobile: Unit Selector + Product List (`availability-mobile.tsx`)

Shown at breakpoints below `md:`. The matrix collapses to a two-step interaction.

### Step 1: Unit selector (Select component)

```tsx
<div className="block md:hidden">
  <div className="mb-4">
    <label className="text-sm font-medium mb-1.5 block">Selecionar unidade</label>
    <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Escolha uma unidade..." />
      </SelectTrigger>
      <SelectContent>
        {units.map((unit) => (
          <SelectItem key={unit.id} value={unit.id}>
            {unit.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  ...
</div>
```

### Step 2: Product list with toggles (when unit selected)

```tsx
{selectedUnit && (
  <div className="flex flex-col gap-1">
    {categoriesWithProducts.map((category) => (
      <div key={category.id}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 py-2">
          {category.name}
        </p>
        {category.products.map((product) => {
          const isUnavailable = unavailableSet.has(`${product.id}:${selectedUnitId}`)
          return (
            <div
              key={product.id}
              className={cn(
                "flex items-center gap-3 rounded-md border p-3 transition-colors",
                isUnavailable && "opacity-60 bg-muted/30"
              )}
            >
              {/* Thumbnail */}
              {product.imageUrl && (
                <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded">
                  <Image src={product.imageUrl} alt="" fill className="object-cover" />
                </div>
              )}

              {/* Product info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  R$ {Number(product.price).toFixed(2).replace('.', ',')}
                </p>
              </div>

              {/* Unavailable badge (only when off) */}
              {isUnavailable && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 shrink-0">
                  Indisponível
                </span>
              )}

              {/* Switch */}
              <AvailabilitySwitch
                productId={product.id}
                unitId={selectedUnitId}
                checked={!isUnavailable}
              />
            </div>
          )
        })}
      </div>
    ))}
  </div>
)}
```

### No unit selected state (mobile)

```tsx
<div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
  <p className="text-sm text-muted-foreground">
    Selecione uma unidade acima para ver e editar a disponibilidade dos produtos.
  </p>
</div>
```

---

## Server Action Contract (`actions.ts`)

```typescript
'use server'

export async function toggleAvailability({
  productId,
  unitId,
  available,
}: {
  productId: string
  unitId: string
  available: boolean
}): Promise<{ success: boolean; error?: string }>
```

**Logic:**
- `available = true` → DELETE row WHERE product_id = productId AND unit_id = unitId (if exists)
- `available = false` → INSERT row (product_id, unit_id) — INSERT OR IGNORE semantics (unique constraint handles idempotency)
- Validate that product belongs to admin's restaurant (RLS provides backend enforcement; also check in action for clear error messages)
- Returns `{ success: true }` or `{ success: false, error: "mensagem" }`

---

## Copywriting Contract

| Element | Copy (pt-BR) |
|---------|------|
| Page title | "Disponibilidade por Unidade" |
| Page description | "Controle quais produtos estão disponíveis em cada unidade. Produtos sem configuração explícita são exibidos como disponíveis por padrão." |
| Switch aria-label (on) | "Disponível — clique para marcar como indisponível" |
| Switch aria-label (off) | "Indisponível — clique para marcar como disponível" |
| Badge unavailable | "Indisponível" |
| Mobile unit selector placeholder | "Escolha uma unidade..." |
| Mobile no-unit-selected | "Selecione uma unidade acima para ver e editar a disponibilidade dos produtos." |
| Empty state — no units heading | "Nenhuma unidade cadastrada." |
| Empty state — no units body | "Cadastre pelo menos uma unidade em Unidades para gerenciar a disponibilidade." |
| Empty state — no products heading | "Nenhum produto cadastrado." |
| Empty state — no products body | "Adicione produtos em Cardápio para gerenciar a disponibilidade." |
| Category section header | `{category.name}` (uppercase via CSS `uppercase tracking-wide`) |
| Product column header | "Produto" |
| Error toast (toggle fail) | "Erro ao atualizar disponibilidade. Tente novamente." |

---

## Default Availability Rule (CTLG-07 Requirement 3)

**Documented default:** Absence of a row in `product_availability` = product is **AVAILABLE** at that unit.

The UI enforces this by:
1. Loading only existing unavailability rows from DB (sparse fetch)
2. Computing `unavailableSet = new Set(rows.map(r => \`${r.productId}:${r.unitId}\`))`
3. Switch `checked = !unavailableSet.has(\`${product.id}:${unit.id}\`)`

This means NEW products and NEW units are automatically visible in the menu without any admin action. Admins only act to **mark as unavailable**.

---

## Data Fetch Pattern (page.tsx)

```typescript
// Server Component in page.tsx
const admin = await getCurrentAdmin()
if (!admin?.restaurantId) return null

// Fetch all units for this restaurant
const units = await db.query.units.findMany({
  where: eq(units.restaurantId, admin.restaurantId),
  orderBy: [asc(units.name)],
})

// Fetch all products with their category, ordered for display
const categories = await db.query.categories.findMany({
  where: eq(categories.restaurantId, admin.restaurantId),
  orderBy: [asc(categories.sortOrder)],
  with: {
    products: { orderBy: [asc(products.sortOrder)] },
  },
})

// Sparse fetch: only rows that represent UNAVAILABLity
const unavailableRows = await db
  .select({ productId: productAvailability.productId, unitId: productAvailability.unitId })
  .from(productAvailability)
  .innerJoin(products, eq(productAvailability.productId, products.id))
  .where(eq(products.restaurantId, admin.restaurantId))

// Pass serializable data to Client Components
```

---

## Optimistic Update Pattern

Use React 19's `useOptimistic` hook in `AvailabilitySwitch`. The Server Action runs in background; UI updates immediately. On Server Action error, the optimistic state is rolled back automatically. Show a toast (shadcn `toast` or `sonner` — not yet installed, use `console.error` + inline error state as fallback in Phase 4 if toast not present).

**No confirmation dialog** is needed for availability toggles — this is a low-stakes, reversible action. Toggle is immediate.

---

## Registry Safety

| Registry | Components Used | Safety Gate |
|----------|----------------|-------------|
| shadcn official | Switch, Select, Tooltip, (existing: Button, Badge, Table, Image) | not required |
| Third-party | none | n/a |

All components from shadcn official registry. No third-party registry components.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
