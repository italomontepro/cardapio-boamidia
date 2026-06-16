# Phase 3: Restaurant Admin — Units, Catalog & Photos - Research

**Researched:** 2026-06-16
**Domain:** Next.js 16 Server Actions + Supabase Storage + libphonenumber-js + shadcn accordion/checkbox/textarea + sort_order swap pattern
**Confidence:** HIGH

## Summary

Phase 3 extends the already-established codebase patterns from Phase 2 (Server Actions, shadcn Table+Dialog+AlertDialog, react-hook-form+zod, Drizzle queries) with three new technical surfaces: (1) Supabase Storage file upload from a Server Action using `File`/`Blob` extracted from `FormData`, (2) `libphonenumber-js` WhatsApp number validation integrated into a zod schema, and (3) a `sort_order` swap operation implemented as two Drizzle UPDATE statements inside `db.transaction()`.

The highest-complexity item is the file upload: Next.js 16 Server Actions can receive `FormData` directly (no multipart middleware needed), and `formData.get('photo')` returns a `File` object on the server. The `supabase.storage.from('product-images').upload(path, file)` call accepts `File` as a valid `FileBody`. The upload must use the **service_role client** (`createAdminClient()`) to bypass Storage RLS for writes, while the public URL is read via the session client's `getPublicUrl()` (no auth required for public buckets). The bucket `product-images` must be created (via Supabase dashboard or a manual SQL migration) with a public read policy and an authenticated-user write policy scoped by `restaurant_id` path prefix.

The sidebar layout evolution is straightforward: add `nav + ul/li` as a sibling to `<main>` inside the existing `/painel` layout, using `usePathname()` from `next/navigation` (requires a `'use client'` wrapper component for the nav since `layout.tsx` is a Server Component). Four shadcn components need to be added via CLI: `accordion`, `textarea`, `checkbox`, `separator`. Their Radix UI backing packages are not yet installed.

**Primary recommendation:** Follow the existing Phase 2 pattern for all CRUD operations (Server Action → Drizzle → revalidatePath → `{success, error}` return). The only meaningful new pattern is file upload, which should use the service_role client to upload and then call `getPublicUrl()` to derive the saved URL — no signed upload URLs needed for the admin panel (the server holds the credential).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Navegação do painel do restaurante**
- D-01: Separate pages at `/painel/unidades` (manage units) and `/painel/cardapio` (manage categories + products together).
- D-02: Fixed left sidebar in `/painel` layout with navigation links: Visão Geral (`/painel`), Unidades (`/painel/unidades`), Cardápio (`/painel/cardapio`). The existing `src/app/painel/layout.tsx` must evolve to include a sidebar alongside `<main>`.
- D-03: No shadcn sidebar component — implement with `nav + ul/li`, active link via `usePathname()` from Next.js.

**Unidades/filiais (`/painel/unidades`)**
- D-04: List in a table (shadcn `Table`, already installed) with columns: nome, endereço, WhatsApp, horários. Row actions: Editar, Remover.
- D-05: Create/edit form in a Dialog (shadcn `Dialog`, already installed). Fields: nome, endereço, WhatsApp, horários de funcionamento.
- D-06: WhatsApp validated in Brazilian format (e.g., `5511999999999` or `(11) 99999-9999`). Use `libphonenumber-js` for validation and normalization. Invalid number blocks submit (zod + resolver).
- D-07: `units.hours` is a `text` column in the schema — free-text field in form (e.g., "Seg–Sex 11h–22h, Sáb 11h–23h"). No complex time picker in this phase.
- D-08: Unit removal requires confirmation via `AlertDialog` (shadcn, already installed), with warning that the unit and its availability settings will be removed (FK cascade).
- D-09: No reordering of units — success criteria does not mention order for units, only for categories and products.

**Cardápio — Categorias e Produtos (`/painel/cardapio`)**
- D-10: Single page `/painel/cardapio` manages categories and products together. Accordion layout: list of categories, each expands inline showing its products. No separate route for products.
- D-11: Add product happens inside the corresponding category (a "+" button inside each accordion item). Add category is via a button at the top of the page.
- D-12: Category create/edit form in a Dialog with a single field: name. Reordering via ↑/↓ buttons per row (no drag-and-drop).
- D-13: Product create/edit form in a Dialog with fields: name, description (textarea), price, photo (inline file input), `is_featured` (checkbox). Reordering via ↑/↓ buttons within the category.
- D-14: Category removal requires `AlertDialog` confirmation (warning: all products in the category will be removed by cascade). Product removal also requires confirmation.

**Upload de foto dos produtos**
- D-15: Real upload to Supabase Storage, bucket `product-images`. Path structure: `{restaurant_id}/{product_id}/{filename}`.
- D-16: Upload inline in the product form (same create/edit Dialog). Server Action: (1) inserts/updates the product in DB, (2) uploads file to bucket via `supabase.storage.from('product-images').upload(path, file)`, (3) saves the public URL in `products.image_url`.
- D-17: One photo per product (single `image_url` in existing schema). Multi-photo gallery (`product_images` table) is deferred to a future version.
- D-18: Preview of the current image shown in the edit Dialog when `image_url` already exists. File input is optional when editing — if no new file is selected, the existing photo is kept.
- D-19: Configure `next/image` with `remotePatterns` pointing to the Supabase Storage CDN domain for image optimization in admin pages.

**Reordenação de categorias e produtos**
- D-20: ↑/↓ buttons per row for reordering. `sort_order` already in schema (`categories.sort_order`, `products.sort_order`). Clicking ↑/↓ triggers a Server Action that swaps the `sort_order` values between the item and its neighbor. No drag-and-drop in this phase.

### Claude's Discretion
- Accordion component for categories/products: shadcn `Accordion` (install via CLI) or native `details/summary` HTML — whichever stays clean and functional.
- Exact price formatting in the form and listing (e.g., numeric field with `R$ 0,00` mask or text input with zod `z.string().regex(...)` → converts to `numeric`).
- Which shadcn components to install via CLI for this phase: `accordion`, `textarea`, `checkbox`, `separator` — install as needed.
- Exact wording of error messages and confirmations (PT-BR).
- Behavior of `sort_order` when creating a new item (insert at end: `MAX(sort_order) + 1`).

### Deferred Ideas (OUT OF SCOPE)
- Multi-photo gallery per product (`product_images` table) — v1 uses single `image_url`. Additive change for a future version.
- Reordering via drag-and-drop (@dnd-kit) — ↑/↓ buttons are sufficient for v1.
- Structured operating hours (day-of-week + open/close time) — free-text field is sufficient for v1.
- Managing multiple admins per restaurant — deferred since Phase 2.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UNIT-01 | Admin do restaurante pode criar, editar e remover unidades/filiais com nome, endereço e número de WhatsApp, e um formato de número de WhatsApp inválido é rejeitado | D-04/D-05/D-06/D-08: shadcn Table + Dialog + AlertDialog; libphonenumber-js zod integration; `units` table Drizzle CRUD scoped to `restaurantId` from `getCurrentAdmin()`. |
| UNIT-02 | Admin do restaurante pode definir horários de funcionamento visíveis para cada unidade | D-07: `units.hours` text column; free-text input in the same Dialog (D-05); saved and displayed in the units table. |
| UNIT-03 | Admin do restaurante pode criar, editar, remover e reordenar categorias do cardápio | D-12: Dialog (name only) + Table + AlertDialog; sort_order swap Server Action; `MAX(sort_order) + 1` insert at end. |
| CTLG-01 | Admin do restaurante pode criar, editar, remover e reordenar produtos dentro de uma categoria, incluindo nome, descrição e preço | D-13: Dialog with all product fields; sort_order swap within category; Drizzle queries scoped to `restaurantId` and `categoryId`. |
| CTLG-02 | Admin do restaurante pode fazer upload de uma foto para cada produto | D-15/D-16/D-17/D-18/D-19: Supabase Storage upload from Server Action; `File` from `FormData`; service_role client for upload; `getPublicUrl()` for stored URL; `next/image` remotePatterns. |
| CTLG-03 | Admin do restaurante pode marcar um produto como "destaque/promo" | D-13: `is_featured` checkbox in product Dialog; `products.isFeatured` boolean already in schema. |
| CTLG-04 | Reordenação de categorias e produtos via botões ↑/↓ | D-20: sort_order swap Server Action using `db.transaction()` with two conditional UPDATEs. |
| CTLG-05 | Layout de cardápio em accordion expansível com categorias e produtos inline | D-10/D-11: shadcn `Accordion` component; Server Component fetches all categories + products in one query; client component handles accordion state and triggers dialogs. |
| CTLG-06 | Sidebar de navegação no painel com links ativos | D-02/D-03: `nav + ul/li` inside `/painel/layout.tsx`; `usePathname()` requires `'use client'` wrapper; layout restructured to `flex-row` with sidebar + `<main>`. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **App Router only** — all new routes under `src/app/`, Server Components by default.
- **`@supabase/ssr`** (`createClient()`) for cookie-based SSR sessions; `createAdminClient()` (service_role) for Storage uploads and any admin API calls.
- **Drizzle ORM** is the source of truth; `db` (Transaction Mode pooler, port 6543, `prepare: false`) for all runtime queries.
- **zod** for all Server Action input validation server-side.
- **shadcn/ui** components installed via `npx shadcn@latest add <component>` — copy-in.
- **Role enforcement**: `getCurrentAdmin()` called in every Server Action and Server Component; `restaurantId` used as the tenant scope in all queries. RLS also enforces this at DB level.
- **Never trust client state for authorization** — `restaurantId` always fetched server-side from `getCurrentAdmin()`.
- **No custom order management** — WhatsApp flow is out of scope for this phase.
- **next/image with remotePatterns** — required before rendering any Supabase Storage image URL.

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.2 | Units, categories, products CRUD queries + `db.transaction()` for sort_order swap | Already installed ORM; `db.transaction()` works with `prepare: false` on the pooler (proven in Phase 2 `createRestaurant`) |
| @supabase/supabase-js (via createAdminClient) | 2.108.2 | Supabase Storage upload — `supabase.storage.from('product-images').upload()` + `getPublicUrl()` | The `service_role` admin client already exists in `src/lib/supabase/admin.ts`; storage is bundled with supabase-js |
| @supabase/ssr (via createClient) | 0.12.0 | Server Component data fetching + session for `getCurrentAdmin()` | Already standard per Phase 1; `getCurrentAdmin()` is already the tenant-scope pattern |
| libphonenumber-js | 1.13.6 | WhatsApp number validation and E.164 normalization for Brazilian numbers | Already installed (confirmed in package.json); verified: `isValidPhoneNumber('(11) 99999-9999', 'BR')` → `true`; `parsePhoneNumberFromString('+5511999999999').number` → `+5511999999999` |
| zod | 4.4.3 | Validate all Server Action inputs: units schema, categories schema, products schema | Already standard per CLAUDE.md; all Server Actions must validate with zod server-side |
| react-hook-form | 7.79.0 | Client-side form state for unit/category/product dialogs (multi-field, file input) | Already installed; established pattern from Phase 2 |
| @hookform/resolvers | 5.4.0 | zod resolver for react-hook-form | Already installed; used in Phase 2 forms |

### New shadcn Components (to be added via CLI)
| Component | Radix Backing | Purpose | Install Command |
|-----------|--------------|---------|----------------|
| accordion | @radix-ui/react-accordion@1.2.14 (not yet installed) | Expandable category list on `/painel/cardapio` | `npx shadcn@latest add accordion` |
| textarea | none (native `<textarea>`) | Product description field | `npx shadcn@latest add textarea` |
| checkbox | @radix-ui/react-checkbox@1.3.5 (not yet installed) | `is_featured` product toggle | `npx shadcn@latest add checkbox` |
| separator | @radix-ui/react-separator@1.1.10 (not yet installed) | Visual divider in sidebar or accordion | `npx shadcn@latest add separator` |

**Installation:**
```bash
npx shadcn@latest add accordion textarea checkbox separator
```
This installs the shadcn component files AND their Radix UI dependencies.

### Already Installed shadcn Components (no action)
| Component | Already In `src/components/ui/` | Reuse In |
|-----------|--------------------------------|---------|
| table | alert-dialog.tsx, badge.tsx, button.tsx, card.tsx, dialog.tsx, form.tsx, input.tsx, label.tsx, table.tsx | Units table, categories/products (inline in accordion) |
| dialog | Already installed | Unit form, category form, product form |
| alert-dialog | Already installed | Unit delete confirm, category delete confirm, product delete confirm |

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/painel/
│   ├── layout.tsx                    # MODIFY: add sidebar nav + flex-row layout
│   ├── _components/
│   │   └── sidebar-nav.tsx           # NEW: 'use client', usePathname(), nav links
│   ├── page.tsx                      # UNCHANGED: Visão Geral (overview)
│   ├── unidades/
│   │   ├── page.tsx                  # NEW: Server Component, fetch units
│   │   ├── unit-table.tsx            # NEW: 'use client', Table + row actions
│   │   ├── unit-form-dialog.tsx      # NEW: 'use client', create/edit Dialog
│   │   └── unit-delete-dialog.tsx    # NEW: 'use client', AlertDialog confirm
│   └── cardapio/
│       ├── page.tsx                  # NEW: Server Component, fetch categories+products
│       ├── cardapio-accordion.tsx    # NEW: 'use client', Accordion + inline products
│       ├── category-form-dialog.tsx  # NEW: 'use client', create/edit category Dialog
│       └── product-form-dialog.tsx   # NEW: 'use client', create/edit product Dialog (file input)
├── lib/
│   ├── units/
│   │   ├── actions.ts                # NEW: 'use server', createUnit, updateUnit, deleteUnit
│   │   └── schema.ts                 # NEW: zod schemas for unit form
│   └── catalog/
│       ├── actions.ts                # NEW: 'use server', CRUD for categories + products + sort_order swap + upload
│       └── schema.ts                 # NEW: zod schemas for category + product forms
└── db/schema.ts                      # UNCHANGED — units, categories, products already defined
next.config.ts                        # MODIFY: add remotePatterns for Supabase Storage CDN
```

### Pattern 1: Sidebar Layout with Active Link

**What:** Server Component `layout.tsx` renders the sidebar + `<main>`. The nav links component must be `'use client'` because `usePathname()` is a client hook.

**When to use:** Any layout that needs active-link highlighting based on the current route.

**Key detail:** The current `layout.tsx` has a top `<header>` and a `<main>`. Phase 3 adds a `<nav>` sidebar between them, restructuring the main area to `flex-row`.

```typescript
// src/app/painel/_components/sidebar-nav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/painel', label: 'Visão Geral', exact: true },
  { href: '/painel/unidades', label: 'Unidades', exact: false },
  { href: '/painel/cardapio', label: 'Cardápio', exact: false },
]

export function SidebarNav() {
  const pathname = usePathname()
  return (
    <nav className="w-48 shrink-0 border-r px-3 py-4">
      <ul className="flex flex-col gap-1">
        {navLinks.map(({ href, label, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'block rounded px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

```typescript
// src/app/painel/layout.tsx — modified
// Server Component: getCurrentAdmin() + auth check remain the same.
// New: import SidebarNav, restructure to flex-row body.
<div className="flex flex-1 flex-col">
  <header className="...existing header..."></header>
  <div className="flex flex-1">
    <SidebarNav />
    <main className="flex flex-1 flex-col p-6">{children}</main>
  </div>
</div>
```

**Anti-pattern:** Putting `usePathname()` directly in `layout.tsx` (Server Component) → crashes because it's a client API. Always extract the nav to a separate `'use client'` component.

### Pattern 2: Server Action with File Upload (Product Photo)

**What:** A Server Action receives `FormData` (with text fields + a `File`). It upserts the product row in Postgres, then uploads the `File` to Supabase Storage using the service_role client, then saves the public URL back into `products.image_url`.

**Why service_role for upload:** The Storage RLS policy for the `product-images` bucket will require the authenticated user's `restaurant_id` to match the path prefix. However, calling storage from a Server Action with the SSR session client (`createClient()`) should also work if the bucket RLS policy permits authenticated inserts. The safer and simpler approach for the admin panel: use `createAdminClient()` (service_role) for the upload, which bypasses Storage RLS entirely. This is acceptable because the Server Action has already verified the user's `restaurantId` via `getCurrentAdmin()` server-side before constructing the path `{restaurantId}/{productId}/{filename}`.

**Key constraint:** File validation (type, size) must happen server-side before upload. The `file.size` and `file.type` properties are available on the `File` object in the Server Action.

```typescript
// src/lib/catalog/actions.ts (excerpt)
'use server'

export async function upsertProduct(formData: FormData) {
  const admin = await getCurrentAdmin()
  if (!admin || !admin.restaurantId) return { error: { _form: ['Não autorizado.'] } }

  // 1. Extract and validate non-file fields with zod
  const rawData = {
    id: formData.get('id') as string | null,
    categoryId: formData.get('categoryId') as string,
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    price: formData.get('price') as string,
    isFeatured: formData.get('isFeatured') === 'true',
  }
  const parsed = upsertProductSchema.safeParse(rawData)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  // 2. Upsert product row to get the product ID
  const [product] = parsed.data.id
    ? await db.update(products).set({ ...parsed.data }).where(eq(products.id, parsed.data.id)).returning()
    : await db.insert(products).values({ restaurantId: admin.restaurantId, ...parsed.data }).returning()

  // 3. Handle optional file upload
  const file = formData.get('photo') as File | null
  if (file && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return { error: { photo: ['Foto deve ter menos de 5 MB.'] } }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return { error: { photo: ['Formato inválido. Use JPG, PNG ou WebP.'] } }
    }

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${admin.restaurantId}/${product.id}/photo.${ext}`

    const supabaseAdmin = createAdminClient()
    const { error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) return { error: { photo: ['Erro ao fazer upload da foto.'] } }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(path)

    await db.update(products)
      .set({ imageUrl: publicUrl })
      .where(eq(products.id, product.id))
  }

  revalidatePath('/painel/cardapio')
  return { success: true, productId: product.id }
}
```

**Anti-pattern:** Calling `supabase.storage.from('product-images').upload()` from the SSR session client (`createClient()`) with `upsert: false` when re-uploading — this will fail with "Duplicate" error. Always use `upsert: true` for the replace-existing-photo case, or delete the old file first.

### Pattern 3: sort_order Swap via db.transaction()

**What:** When the user clicks ↑ on item at position N, find the item at position N-1 and swap their `sort_order` values atomically.

**Why transaction:** Without a transaction, a partial swap leaves the data in an inconsistent state (two items with the same `sort_order`, or a gap). Both UPDATEs must succeed or both must roll back.

**Implementation:** Use `db.transaction()` with two Drizzle UPDATE statements. The neighbor is found by querying for the highest `sort_order` value that is strictly less than the current item's `sort_order` (for ↑) or the lowest value strictly greater (for ↓).

```typescript
// src/lib/catalog/actions.ts (excerpt)
export async function moveCategoryUp(categoryId: string) {
  const admin = await getCurrentAdmin()
  if (!admin?.restaurantId) return { error: 'Não autorizado.' }

  // Find the current item
  const [current] = await db.select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.restaurantId, admin.restaurantId)))

  if (!current) return { error: 'Categoria não encontrada.' }

  // Find the neighbor with next-lower sort_order
  const [neighbor] = await db.select()
    .from(categories)
    .where(and(
      eq(categories.restaurantId, admin.restaurantId),
      lt(categories.sortOrder, current.sortOrder)
    ))
    .orderBy(desc(categories.sortOrder))
    .limit(1)

  if (!neighbor) return { success: true } // already at top, no-op

  // Swap in a transaction
  await db.transaction(async (tx) => {
    await tx.update(categories)
      .set({ sortOrder: neighbor.sortOrder })
      .where(eq(categories.id, current.id))
    await tx.update(categories)
      .set({ sortOrder: current.sortOrder })
      .where(eq(categories.id, neighbor.id))
  })

  revalidatePath('/painel/cardapio')
  return { success: true }
}
```

**Note:** The same pattern applies for `moveProductUp` / `moveProductDown`, filtering additionally by `categoryId`.

**New item sort_order:** When inserting a new category or product, query `MAX(sort_order)` for the restaurant+category scope and set `sort_order = MAX + 1`. If no rows exist yet, use `sort_order = 0`.

```typescript
// Get next sort_order for a new category
const [maxRow] = await db.select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
  .from(categories)
  .where(eq(categories.restaurantId, admin.restaurantId))
const nextSortOrder = (maxRow?.max ?? -1) + 1
```

### Pattern 4: libphonenumber-js + zod for WhatsApp Validation

**What:** A zod `string()` refinement that calls `isValidPhoneNumber(value, 'BR')` and, on success, transforms the value to E.164 format for storage in `units.whatsapp_number`.

**Verified behavior (tested live):**
- `'(11) 99999-9999'` → valid, E.164: `+5511999999999`
- `'11999999999'` → valid, E.164: `+5511999999999`
- `'5511999999999'` → valid, E.164: `+5511999999999`
- `'+5511999999999'` → valid (already E.164)
- `'11999'` → invalid (too short)

```typescript
// src/lib/units/schema.ts
import { z } from 'zod'
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js'

export const upsertUnitSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(120),
  address: z.string().trim().max(255).optional(),
  hours: z.string().trim().max(255).optional(),
  whatsappNumber: z
    .string()
    .trim()
    .min(1, 'Número de WhatsApp é obrigatório.')
    .refine(
      (val) => isValidPhoneNumber(val, 'BR'),
      'Número de WhatsApp inválido. Use o formato (11) 99999-9999 ou +5511999999999.'
    )
    .transform((val) => parsePhoneNumber(val, 'BR').number), // → E.164 string
})
```

**Important:** The `.transform()` means the output type is different from the input. The form value is the user-entered string; the action receives the zod-parsed (and transformed to E.164) value. When displaying the stored E.164 number to the user in the edit form, either show it as-is or format it via `parsePhoneNumber(stored).formatNational()` for a friendly display.

**Import approach:** Use `libphonenumber-js` (full bundle, already installed) rather than `libphonenumber-js/mobile` or `libphonenumber-js/max` — the full bundle is sufficient and avoids path confusion. Confirmed available at `libphonenumber-js@1.13.6` in `node_modules`.

### Pattern 5: File Input with react-hook-form

**What:** react-hook-form's `register()` doesn't natively handle `<input type="file">` for Server Actions. The cleanest approach for this codebase: use a `<form>` that submits `FormData` directly, but manage other fields via `react-hook-form` for validation display, and append the file manually.

**Two approaches (choose based on complexity):**

**Option A — Native form action (simplest, recommended for this phase):**
Submit the product form via `<form action={serverAction}>` (uncontrolled), with react-hook-form used only for client-side validation feedback (not for submission). The `formAction` is the Server Action. This is the simplest approach and consistent with how Next.js 16's `useActionState` was designed.

```typescript
// Client component
'use client'
import { useRef, useState, useTransition } from 'react'
import { upsertProduct } from '@/lib/catalog/actions'

function ProductForm({ categoryId, product }: ...) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await upsertProduct(formData)
      if ('error' in result) {
        setErrors(Object.fromEntries(
          Object.entries(result.error).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
        ))
      } else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} encType="multipart/form-data">
      <input type="hidden" name="categoryId" value={categoryId} />
      {/* ... other fields ... */}
      <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" />
      {errors.photo && <p className="text-destructive text-sm">{errors.photo}</p>}
    </form>
  )
}
```

**Option B — react-hook-form + manual FormData construction:**
Use react-hook-form for all non-file fields, intercept `handleSubmit`, construct `FormData` manually with `new FormData()`, append the file from a `useRef<HTMLInputElement>`, and call the Server Action with it.

Option A is recommended: it's simpler, avoids an intermediate FormData construction step, and the Server Action already does server-side validation, which is what matters for security.

### Pattern 6: Product Image Preview (Edit Mode)

**What:** When editing a product that already has `image_url`, show a preview above the file input. When a new file is selected, show a client-side preview via `URL.createObjectURL()`.

```typescript
const [previewUrl, setPreviewUrl] = useState<string | null>(product?.imageUrl ?? null)

function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (file) setPreviewUrl(URL.createObjectURL(file))
}

// In JSX:
{previewUrl && (
  <Image src={previewUrl} alt="Preview" width={120} height={80}
    className="rounded object-cover" unoptimized={previewUrl.startsWith('blob:')} />
)}
```

**Note:** Use `unoptimized` for blob URLs (local previews) since `next/image` cannot optimize `blob:` URLs. For actual stored URLs (from Supabase Storage CDN), `next/image` optimization works after `remotePatterns` is configured.

### Pattern 7: next/image remotePatterns for Supabase Storage

**What:** Allows `next/image` to optimize images served from the Supabase Storage CDN.

**Supabase Storage CDN domain** (derived from the actual env): `gijkygtyxytzfchuypue.supabase.co`

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
```

Using `*.supabase.co` as the hostname wildcard covers the project's specific subdomain without hardcoding it, which also makes the config portable across Supabase projects. **Confidence: HIGH** — this is the documented Next.js `remotePatterns` glob format.

### Pattern 8: Drizzle Queries Scoped to restaurantId

All Phase 3 queries must scope to the authenticated restaurant's `restaurantId`. RLS also enforces this at the DB level, but the explicit `where(eq(table.restaurantId, admin.restaurantId))` is required for Drizzle (which uses the `DATABASE_URL_RUNTIME` direct connection, not RLS-scoped).

```typescript
// Fetch categories with products for the cardapio page
const categoriesWithProducts = await db.query.categories.findMany({
  where: eq(categories.restaurantId, admin.restaurantId),
  orderBy: [asc(categories.sortOrder)],
  with: {
    products: {
      orderBy: [asc(products.sortOrder)],
    },
  },
})

// Fetch units for the unidades page
const unitsList = await db.select()
  .from(units)
  .where(eq(units.restaurantId, admin.restaurantId))
  .orderBy(asc(units.createdAt))
```

**Note:** `db.query.categories.findMany({ with: { products: ... } })` requires the relational query API. Drizzle's `with` in `findMany` requires relations to be defined in the schema OR the Drizzle instance must have the schema passed (already done: `drizzle(client, { schema })`). However, the `with` syntax also requires **Drizzle relations** to be explicitly declared with `relations()`. Since the existing schema.ts does NOT declare relations, the safest approach is to use two separate queries (one for categories, one for products) and join them in JS — or add minimal `relations()` declarations to `schema.ts`. See "Common Pitfalls" for details.

### Anti-Patterns to Avoid

- **`usePathname()` in a Server Component:** Extract to a `'use client'` wrapper component.
- **Uploading to Storage from the SSR client (anon key):** The anon client's Storage RLS policies require a properly configured bucket policy. The admin panel is simpler with the service_role client — it bypasses Storage RLS entirely, which is safe because the Server Action has already verified identity.
- **Not checking `file.size > 0` before upload:** A form submission with no file selected still passes `formData.get('photo')` as a `File` object with `size === 0`. Always guard with `if (file && file.size > 0)`.
- **Using `upsert: false` for product photo upload:** If a product already has a photo at the same path, the upload will fail with a "Duplicate" error. Use `upsert: true` or delete-then-upload.
- **Storing the raw whatsapp number without normalization:** Store E.164 format (`+5511999999999`) for consistent `wa.me` link generation in Phase 6. The zod `.transform()` handles normalization automatically.
- **sort_order gaps and duplicates:** When deleting an item, do NOT re-number the remaining items. Gaps in `sort_order` are fine — the only invariant needed is that the relative order is preserved. Renumbering all siblings on every delete is unnecessary and risky.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone number validation | Custom regex for Brazilian numbers | `libphonenumber-js` | Brazilian mobile numbers changed from 8 to 9 digits in 2012 — a simple regex misses edge cases. libphonenumber-js has current BR metadata and handles (11) 9XXXX-XXXX, +5511 9XXXX-XXXX, and legacy 8-digit formats correctly. |
| File MIME type validation | Check `file.name.endsWith('.jpg')` | Check `file.type` | File extensions can be spoofed; `file.type` reflects the browser-detected MIME type, which is more reliable. Still pair with server-side file size check. |
| Sort order swap | Manually renumbering all items on reorder | Two-UPDATE transaction (swap adjacent sort_order values) | Renumbering all N items creates N writes instead of 2 writes, and is more error-prone under concurrent edits. The swap pattern is O(1) writes. |
| Image optimization for Storage URLs | Manually constructing CDN URLs with resize params | `next/image` with `remotePatterns` + Supabase Storage's `transform` option | `next/image` handles lazy loading, responsive sizes, WebP conversion, and CDN caching. Supabase Storage supports image transformation via URL parameters, which `next/image` can pass through its `loader`. |
| Accordion implementation | `useState` + conditional rendering per category | shadcn `Accordion` (Radix UI backed) | Radix Accordion handles keyboard navigation, ARIA attributes (`aria-expanded`, `aria-controls`), and animation. Custom `useState` accordion gets these wrong. |

**Key insight:** The "don't hand-roll" items in this phase are all already addressed by the decided stack. The main value is validation: libphonenumber-js for phone numbers, file.type for MIME checking, and db.transaction() for sort_order atomicity.

## Common Pitfalls

### Pitfall 1: Drizzle Relational Queries Require `relations()` Declaration
**What goes wrong:** `db.query.categories.findMany({ with: { products: ... } })` throws or returns empty if Drizzle relations are not declared in `schema.ts`.
**Why it happens:** Drizzle's relational query API (`db.query.X.findMany({ with: {} })`) requires explicit `relations()` declarations alongside the table definitions. The current `schema.ts` defines FK constraints (`references()`) but NOT `relations()`. These are separate constructs in Drizzle.
**How to avoid:** Either (a) add `relations()` declarations to `schema.ts` in Phase 3's Wave 0 task, or (b) use two separate queries (fetch categories, fetch products WHERE categoryId IN [...]) and merge in JS. Option (a) is cleaner and enables the `with` syntax throughout. Option (b) avoids schema changes.
**Recommended approach:** Add minimal `relations()` to `schema.ts`:
```typescript
import { relations } from 'drizzle-orm'
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}))
export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
}))
```
This is a non-breaking additive change to `schema.ts` — no migration needed since it's Drizzle-only metadata.

### Pitfall 2: File Upload Fails with "Duplicate" When Re-editing a Product
**What goes wrong:** Re-uploading a photo for a product that already has one causes a `StorageError: Duplicate` because `upload()` defaults to `upsert: false`.
**Why it happens:** Supabase Storage's `upload()` method does NOT overwrite by default. If a file already exists at the path, it rejects.
**How to avoid:** Always pass `{ upsert: true }` when uploading product photos, since the path `{restaurantId}/{productId}/photo.{ext}` is deterministic and may already exist.

### Pitfall 3: `file.size === 0` on "No File Selected"
**What goes wrong:** `formData.get('photo')` returns a `File` with `size === 0` and `name === ''` when no file was selected. Passing this to `supabase.storage.from('product-images').upload()` will either fail or upload an empty file.
**Why it happens:** HTML `<input type="file">` always provides a `File` object via FormData even when no file was chosen — it just has size=0.
**How to avoid:** Guard uploads with `if (file && file.size > 0)`. This is the standard check pattern.

### Pitfall 4: `usePathname()` Causes Server Component Error
**What goes wrong:** Adding `usePathname()` directly to `layout.tsx` throws "Error: usePathname() can only be used in a Client Component".
**Why it happens:** `layout.tsx` in Next.js App Router is a Server Component by default. `usePathname()` is a React hook that requires a client context.
**How to avoid:** Extract the nav into a separate file (e.g., `_components/sidebar-nav.tsx`) and add `'use client'` at the top. Import it into `layout.tsx` as a component. The layout itself stays as a Server Component.

### Pitfall 5: WhatsApp Number Stored as National vs E.164 Format
**What goes wrong:** Storing `(11) 99999-9999` (national format) in the DB instead of `+5511999999999` (E.164). In Phase 6, the `wa.me` link requires the E.164 format without the `+` prefix: `https://wa.me/5511999999999`.
**Why it happens:** The user enters the number in national format, and without zod `.transform()`, the raw string gets stored.
**How to avoid:** The zod schema's `.transform()` normalizes to E.164 before the Server Action saves. When constructing the `wa.me` URL in Phase 6, strip the leading `+`: `number.replace(/^\+/, '')`.

### Pitfall 6: next/image Blocks Supabase Storage URLs Without remotePatterns
**What goes wrong:** Rendering `<Image src={product.imageUrl} ... />` causes a runtime error: "Invalid src prop ... hostname is not configured under images.remotePatterns".
**Why it happens:** Next.js blocks external image domains by default to prevent SSRF.
**How to avoid:** Add `remotePatterns` to `next.config.ts` before implementing any UI that uses `next/image` with Storage URLs. This is a Wave 0 / Plan 1 task — do it before any product image rendering is attempted.

### Pitfall 7: Accordion with Many Products is Slow Without React Keys
**What goes wrong:** Reordering or adding products inside an accordion causes React to re-render all items instead of just the affected ones.
**Why it happens:** Missing or incorrect `key` props on product list items.
**How to avoid:** Always use `key={product.id}` (UUID, stable) on product list items, and `key={category.id}` on accordion items. Do NOT use `key={index}`.

### Pitfall 8: Units Slug Not Unique per Restaurant — Schema Has Unique Constraint
**What goes wrong:** Attempting to create two units with the same name (and therefore the same auto-generated slug) under the same restaurant throws a DB unique constraint error.
**Why it happens:** `unique('units_restaurant_slug_unique').on(table.restaurantId, table.slug)` is already in the schema.
**How to avoid:** Either (a) generate the unit slug from the name (like restaurant slugs) and validate uniqueness in the Server Action, or (b) treat the slug as an internal implementation detail and generate it server-side deterministically (e.g., UUID prefix or incremental). The unit slug is not user-visible in Phase 3 (it's used for Phase 5 public URLs), so a UUID-based slug is the simplest choice.

## Code Examples

### Drizzle Relations Declaration (Wave 0 addition to schema.ts)
```typescript
// Add to src/db/schema.ts — no migration needed, Drizzle metadata only
import { relations } from 'drizzle-orm'

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}))

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}))

export const unitsRelations = relations(units, ({ many }) => ({
  productAvailability: many(productAvailability),
}))
```

### next/image remotePatterns (next.config.ts)
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
```

### Supabase Storage Bucket Setup (Supabase Dashboard — manual, no code migration)
The bucket `product-images` must be created via the Supabase dashboard:
1. Go to Storage → New bucket → name: `product-images` → **Public bucket: YES** (so `getPublicUrl()` returns a URL accessible without auth)
2. The bucket's RLS policy for `objects` table INSERT: since we upload via service_role, no explicit INSERT policy is needed for the admin panel (service_role bypasses RLS)
3. Public read is sufficient for the customer-facing menu in Phase 5

**Note:** There is no SQL migration for bucket creation — it's a Storage configuration, not a Postgres schema change.

### Unit Slug Generation (Server Action)
Units need a slug for Phase 5 URLs. Simplest approach: generate from name (same slugify logic as restaurants), append a short random suffix on collision:

```typescript
import { generateSlug } from '@/lib/restaurants/slug' // reuse existing utility

async function generateUnitSlug(name: string, restaurantId: string): Promise<string> {
  const base = generateSlug(name)
  // Check for collision within this restaurant
  const existing = await db.select({ slug: units.slug })
    .from(units)
    .where(and(eq(units.restaurantId, restaurantId), eq(units.slug, base)))
  if (existing.length === 0) return base
  // Append timestamp suffix to ensure uniqueness
  return `${base}-${Date.now()}`
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` for SSR | `@supabase/ssr` | 2023-2024 | Already using the correct approach in this codebase |
| Signed upload URLs (client-side upload) | Direct upload from Server Action using service_role client | Always valid — both approaches work | For the admin panel, direct Server Action upload is simpler than signed URL flow (no round-trip to get the URL, then upload from client). Signed URLs are preferred for public-facing uploads where you don't want the server to hold the file in memory. |
| `pages/api` route for file upload | Server Action receiving `FormData` with `File` | Next.js App Router (Next.js 13.4+) | Server Actions can receive `FormData` natively. No API route needed. The file is received as a `File` object server-side (Blob subtype). |
| Prisma for ORM | Drizzle ORM | 2024 (established in Phase 1) | Already using Drizzle; `db.transaction()` confirmed working in Phase 2 |
| `tailwind.config.js` for Tailwind config | `@theme` in `globals.css` (Tailwind v4) | Tailwind v4 (2024-2026) | Already using Tailwind v4 in this codebase |

## Environment Availability

Step 2.6: SKIPPED for most dependencies (all libraries are already installed or will be added via `npx shadcn@latest add`).

Bucket `product-images` does NOT yet exist in Supabase Storage. This is a manual dashboard step (no CLI or code migration for bucket creation). The plan must include a human-action task for this.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| libphonenumber-js | UNIT-01 WhatsApp validation | Yes | 1.13.6 (in node_modules, verified) | — |
| @supabase/storage-js | CTLG-02 product photo upload | Yes | 2.108.2 (bundled in supabase-js) | — |
| shadcn accordion | CTLG-05 | No | needs install | `details/summary` HTML (discretion area) |
| shadcn textarea | CTLG-01 product description | No | needs install | native `<textarea>` with Tailwind classes |
| shadcn checkbox | CTLG-03 is_featured | No | needs install | native `<input type="checkbox">` with label |
| shadcn separator | layout dividers | No | needs install | CSS `border` (optional) |
| Supabase Storage bucket `product-images` | CTLG-02 | No — must be created | — | Cannot proceed without creating the bucket |
| next/image remotePatterns for *.supabase.co | CTLG-02 image display | No — must be added to next.config.ts | — | Images will not display without this config |

**Missing dependencies with no fallback:**
- Supabase Storage bucket `product-images` — must be created via dashboard before any product photo upload can succeed. This is a Wave 0 human-action step in Plan 3 (the product/photo plan).
- `next/image remotePatterns` — must be added to `next.config.ts` before any product image is rendered. This is a Wave 0 code task.

**Missing dependencies with fallback:**
- shadcn components (accordion, textarea, checkbox, separator) — `npx shadcn@latest add` handles installation + Radix UI dependencies in one command. All four can be installed in a single Wave 0 task.

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json` — section required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | tsx integration scripts (established in Phase 1: `scripts/verify-auth.ts`, Phase 2: `scripts/verify-restaurants.ts`) |
| Config file | none — convention: `scripts/verify-{domain}.ts` |
| Quick run command | `npx tsx scripts/verify-catalog.ts` |
| Full suite command | `npx tsx scripts/verify-catalog.ts && npx tsx scripts/verify-restaurants.ts && npx tsx scripts/verify-auth.ts` |
| Estimated runtime | ~15-30 seconds (direct Postgres calls, no UI, file upload assertions require live Supabase Storage) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UNIT-01 | Create unit → row inserted with correct restaurantId; invalid WhatsApp rejected by Server Action | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 |
| UNIT-01 | Edit unit → updated row; invalid WhatsApp blocked (zod error returned) | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 |
| UNIT-01 | Delete unit → row removed | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 |
| UNIT-02 | Create/edit unit with hours text → hours saved | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 |
| UNIT-03 | Create category → row with correct restaurantId + sort_order at MAX+1 | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 |
| UNIT-03 | Reorder categories (moveUp/moveDown) → sort_order values swapped | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 |
| UNIT-03 | Delete category → row removed (products cascade) | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 |
| CTLG-01 | Create product → row with name, description, price, isFeatured=false, categoryId | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 |
| CTLG-01 | Edit product → updated row; sort_order unaffected | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 |
| CTLG-01 | Delete product → row removed | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 |
| CTLG-02 | Upload photo → file exists in Storage bucket at correct path; products.image_url updated | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 |
| CTLG-03 | Create product with is_featured=true → isFeatured=true in DB | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 |
| CTLG-04 | Move product up/down → sort_order swap in same category | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 |
| CTLG-05 | Sidebar links render, active state reflects pathname | manual | Browser inspection | — |
| CTLG-06 | Accordion renders all categories; product list appears on expand | manual | Browser inspection + manual test | — |

### Sampling Rate
- **Per task commit:** `npx tsx scripts/verify-catalog.ts` (covers the Server Actions just implemented)
- **Per wave merge:** `npx tsx scripts/verify-catalog.ts && npx tsx scripts/verify-auth.ts` (regression check — no existing Server Actions are modified in Phase 3)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/verify-catalog.ts` — new integration script; pattern-matched to `scripts/verify-restaurants.ts`; covers UNIT-01..03, CTLG-01..04; requires live Supabase Storage for CTLG-02 (photo upload assertion)
- [ ] `npx shadcn@latest add accordion textarea checkbox separator` — must run before any Plan that uses these components
- [ ] `next.config.ts` remotePatterns update — must be done before any Plan that renders product images
- [ ] Supabase Storage bucket `product-images` creation (manual dashboard step, not automated) — prerequisite for CTLG-02 tasks; plan must include a human-action task or pre-condition note

## Recommended Plan Breakdown

Based on scope, dependency ordering, and the Phase 2 pattern of 4 plans averaging 12-20 files:

| Plan | Name | Scope | Key Outputs |
|------|------|-------|-------------|
| 03-01 | Wave 0: Setup & Schema | Install shadcn components; add `relations()` to schema.ts; update `next.config.ts` remotePatterns; add `scripts/verify-catalog.ts` stub; create bucket (human task) | `next.config.ts`, `schema.ts` updated; 4 shadcn UI components added; `scripts/verify-catalog.ts` |
| 03-02 | Sidebar + Units CRUD | Evolve `/painel/layout.tsx` to sidebar + main; new `/painel/unidades` page, unit-table, unit-form-dialog (with libphonenumber-js validation), unit-delete-dialog; `src/lib/units/actions.ts` + schema | UNIT-01, UNIT-02 |
| 03-03 | Categories CRUD + Reorder | New `/painel/cardapio` page (categories only, no accordion yet); category-form-dialog; sort_order move actions; `src/lib/catalog/actions.ts` (categories portion) | UNIT-03, CTLG-04 (categories) |
| 03-04 | Products CRUD + Photos + Accordion | Evolve `/painel/cardapio` to full accordion; product-form-dialog (with file input + preview); upsertProduct Server Action with Storage upload; sort_order move for products; `is_featured` checkbox | CTLG-01, CTLG-02, CTLG-03, CTLG-04 (products), CTLG-05, CTLG-06 |

**Rationale for this split:**
- Plan 01 sets up the infra (shadcn installs, schema relations, remotePatterns, test script stub) so all subsequent plans can proceed without setup concerns.
- Plans 02 and 03 are independent features (units vs. categories) that follow the exact same Phase 2 CRUD pattern — low risk, parallelizable in theory.
- Plan 04 is the highest complexity: it combines the accordion UI, product CRUD, file upload, and completes the cardapio page. It's necessarily last because it depends on categories existing (Plan 03) and the accordion component being installed (Plan 01).

## Open Questions

1. **Drizzle relations() vs. two-query approach for cardapio page**
   - What we know: Drizzle's `with` in `findMany` requires `relations()`. The current schema.ts has FKs but no relations.
   - What's unclear: Whether adding `relations()` requires a drizzle-kit migration (it does NOT — relations are Drizzle metadata only, no SQL change).
   - Recommendation: Add `relations()` in Plan 01 (Wave 0). Confirmed: no migration needed.

2. **Unit slug generation approach**
   - What we know: `units_restaurant_slug_unique` constraint exists. The slug is not user-visible in Phase 3 but is used in Phase 5 `/r/[restaurantSlug]/[unitSlug]` URLs.
   - What's unclear: Whether to expose slug editing to the restaurant admin in Phase 3 or auto-generate it.
   - Recommendation: Auto-generate from name (reuse `generateSlug()`) and auto-resolve collisions with a timestamp suffix. No slug editing UI in Phase 3 — deferred to Phase 5 if needed.

3. **Price field: numeric input type vs. text with mask**
   - What we know: `products.price` is `numeric(10, 2)` in Postgres. The form needs to accept user input like "29,90" or "29.90".
   - What's unclear: Exact UX decided (this is a Claude's Discretion item).
   - Recommendation: Use `<input type="text" placeholder="29,90" inputMode="decimal">` with zod validation `z.string().transform(s => s.replace(',', '.')).pipe(z.coerce.number().positive())`. Avoids a mask library dependency. Locale-consistent with pt-BR comma as decimal separator.

## Sources

### Primary (HIGH confidence)
- `node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts` — `upload()` signature, `FileBody` type (includes `File`, `Blob`, `ArrayBuffer`), `getPublicUrl()` return shape. Inspected live.
- `node_modules/libphonenumber-js/index.cjs` — `isValidPhoneNumber`, `parsePhoneNumber`, `parsePhoneNumberFromString` verified with live Node.js test cases covering 6 Brazilian number formats.
- `/Users/italomonte/Documents/GitHub/cardapio-boamidia/src/db/schema.ts` — confirmed `units` (with `slug`, `whatsappNumber`, `hours`), `categories` (with `sortOrder`), `products` (with `sortOrder`, `imageUrl`, `isFeatured`) already in schema. No new migration needed for Phase 3.
- `/Users/italomonte/Documents/GitHub/cardapio-boamidia/package.json` — confirmed installed versions: libphonenumber-js@1.13.6, drizzle-orm@0.45.2, @supabase/supabase-js@2.108.2, react-hook-form@7.79.0, zod@4.4.3, lucide-react@1.18.0.
- `npm view @radix-ui/react-accordion version` → 1.2.14; `npm view @radix-ui/react-checkbox version` → 1.3.5 — confirmed not installed in node_modules yet.
- `/Users/italomonte/Documents/GitHub/cardapio-boamidia/.env` — Supabase project URL: `gijkygtyxytzfchuypue.supabase.co` — used to derive the `remotePatterns` hostname pattern.
- `src/app/painel/layout.tsx`, `src/app/admin/(dashboard)/restaurant-form-dialog.tsx`, `src/lib/restaurants/actions.ts` — existing patterns for layout, Dialog forms, and Server Actions read directly from source.

### Secondary (MEDIUM confidence)
- Next.js 16 App Router documentation: Server Actions can receive `FormData` natively; `File` objects are available server-side. Consistent with observed behavior in this codebase (Phase 2 used `formData.get()` for non-file fields).
- Supabase Storage documentation pattern: `upsert: true` for overwrite semantics; `getPublicUrl()` requires the bucket to be set to public. Derived from source code inspection.

### Tertiary (LOW confidence)
- None — all critical claims verified from source code inspection or live test execution.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in node_modules or npm registry
- Architecture: HIGH — patterns directly derived from existing Phase 2 code
- Pitfalls: HIGH — verified via source code inspection (storage-js types, libphonenumber-js live test, schema constraints)
- Validation architecture: HIGH — mirrors established Phase 2 tsx-script pattern exactly

**Research date:** 2026-06-16
**Valid until:** 2026-07-16 (stable libraries; supabase-js Storage API is mature and stable)
