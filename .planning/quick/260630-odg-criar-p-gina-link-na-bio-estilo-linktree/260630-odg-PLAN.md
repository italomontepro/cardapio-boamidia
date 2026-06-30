---
phase: quick
plan: 260630-odg
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/r/[restaurantSlug]/link/page.tsx
autonomous: true
requirements: [LINK-01]
must_haves:
  truths:
    - "A customer opening /r/<slug>/link sees the restaurant name prominently and a vertical list of large buttons, one per unit"
    - "Tapping a unit button with a WhatsApp number opens wa.me/<number> directly (not the menu)"
    - "A unit with no whatsappNumber still appears but is visibly disabled and not clickable"
    - "Invalid/inactive restaurant slug returns 404; valid restaurant with zero units shows a graceful empty state"
    - "Layout is mobile-first: centered column, clean background, pill/card style buttons"
  artifacts:
    - path: "src/app/r/[restaurantSlug]/link/page.tsx"
      provides: "Public Linktree-style link-in-bio page rendering units as WhatsApp buttons"
      min_lines: 40
  key_links:
    - from: "src/app/r/[restaurantSlug]/link/page.tsx"
      to: "src/lib/menu/queries.ts"
      via: "getRestaurantBySlug + getUnitsForRestaurant"
      pattern: "getRestaurantBySlug|getUnitsForRestaurant"
    - from: "src/app/r/[restaurantSlug]/link/page.tsx"
      to: "src/lib/menu/whatsapp.ts"
      via: "buildWhatsAppUrl for each unit href"
      pattern: "buildWhatsAppUrl"
---

<objective>
Create a public "link na bio" (Linktree-style) page at `/r/[restaurantSlug]/link` that lists a restaurant's units as large, mobile-friendly buttons. Tapping a unit goes straight to that unit's WhatsApp (`wa.me/<number>`), NOT the cardápio menu.

Purpose: Gives restaurants a single shareable link (for Instagram bio, QR codes) that routes customers directly into WhatsApp conversations with the closest/desired unit — bypassing the menu for the simplest possible "talk to us" funnel.
Output: One new Server Component page reusing existing queries and the WhatsApp URL builder.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

<interfaces>
<!-- Executor uses these directly — no codebase exploration needed. -->

From src/lib/menu/queries.ts:
```typescript
// returns the active restaurant row or null (filters isActive === true)
export async function getRestaurantBySlug(slug: string): Promise<{ id: string; name: string; slug: string; isActive: boolean; createdAt: Date } | null>

// returns units ordered by name asc
export async function getUnitsForRestaurant(restaurantId: string): Promise<Array<{
  id: string; restaurantId: string; name: string; slug: string;
  address: string | null; whatsappNumber: string | null; hours: string | null;
  lat: number | null; lng: number | null; createdAt: Date;
}>>
```

From src/lib/menu/whatsapp.ts:
```typescript
// strips non-digits from the number and returns https://wa.me/<digits>?text=<encoded message>
export function buildWhatsAppUrl(whatsappNumberE164: string, message: string): string
```

Existing sibling page pattern — src/app/r/[restaurantSlug]/page.tsx:
- `params` is a Promise: `{ params }: { params: Promise<{ restaurantSlug: string }> }`, then `const { restaurantSlug } = await params`
- `if (!restaurant) notFound()` for invalid/inactive slug
- zero-units case renders a centered `<main>` empty state (NOT notFound)

Available shadcn/ui components (import from `@/components/ui/...`):
- `button.tsx` → `Button` (supports `asChild` to wrap an `<a>`)
- `card.tsx` → `Card`, `CardHeader`, `CardTitle`, `CardDescription`
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create the Linktree-style link-in-bio page</name>
  <files>src/app/r/[restaurantSlug]/link/page.tsx</files>
  <action>
    Create a new Server Component page (async, default export) at `src/app/r/[restaurantSlug]/link/page.tsx`.

    Data flow (mirror the sibling page.tsx pattern exactly):
    1. Signature: `export default async function LinkPage({ params }: { params: Promise<{ restaurantSlug: string }> })`.
    2. `const { restaurantSlug } = await params`.
    3. `const restaurant = await getRestaurantBySlug(restaurantSlug)`; `if (!restaurant) notFound()`.
    4. `const restaurantUnits = await getUnitsForRestaurant(restaurant.id)`.
    5. If `restaurantUnits.length === 0`, return a centered empty state `<main>` (reuse the wording/layout from the sibling page: restaurant name + "Este restaurante ainda não tem unidades cadastradas."). Do NOT redirect and do NOT call notFound here.

    Imports: `notFound` from `next/navigation`; `getRestaurantBySlug, getUnitsForRestaurant` from `@/lib/menu/queries`; `buildWhatsAppUrl` from `@/lib/menu/whatsapp`; `Button` from `@/components/ui/button`. (LINK-01)

    Layout (Linktree-style, mobile-first):
    - Root `<main>` is a full-height centered column: `min-h-screen flex flex-col items-center px-4 py-10 sm:py-16` with a clean background (`bg-background`). Constrain inner content to a narrow column: a `<div className="w-full max-w-md flex flex-col gap-6">`.
    - Header block (centered): the restaurant name prominent — `text-2xl font-bold tracking-tight text-center` — plus a small muted subtitle below it like "Escolha uma unidade e fale com a gente no WhatsApp" (`text-sm text-muted-foreground text-center`).
    - Buttons list: `flex flex-col gap-3`. Render one large button per unit.

    Per-unit rendering:
    - Build the WhatsApp message inline per unit, e.g. `const message = \`Olá! Vim pelo link e gostaria de fazer um pedido da unidade ${unit.name}.\``.
    - If `unit.whatsappNumber` is truthy: render `<Button asChild size="lg" className="h-auto w-full justify-center whitespace-normal rounded-full py-4 text-base font-semibold shadow-sm">` wrapping an `<a href={buildWhatsAppUrl(unit.whatsappNumber, message)} target="_blank" rel="noopener noreferrer">`. Anchor content: the unit name (and, if present, a smaller line for `unit.address` using muted text). Stack name/address in a `<span className="flex flex-col items-center">`.
    - If `unit.whatsappNumber` is null/empty: render a DISABLED look — `<Button variant="outline" size="lg" disabled className="h-auto w-full justify-center whitespace-normal rounded-full py-4 text-base">` with content showing the unit name plus a small muted line "WhatsApp indisponível". Do NOT wrap in an anchor (must not be clickable). The unit still appears in the list.
    - Use `key={unit.id}` on each list item.

    Keep it a pure Server Component — no `'use client'`, no client state, no geolocation. Clicking is handled by the native anchor.

    Per CLAUDE.md stack: path-based public route, no auth, Next.js 16 App Router async params, Tailwind v4 utility classes, shadcn Button. Use only the existing query functions and `buildWhatsAppUrl` — do NOT add new DB queries or new helpers.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>
    - `src/app/r/[restaurantSlug]/link/page.tsx` exists and type-checks clean.
    - Page renders restaurant name + one button per unit; units with a number link to `wa.me/<digits>` (via buildWhatsAppUrl) opening in a new tab; units without a number show a disabled, non-clickable button.
    - Invalid/inactive slug → 404; valid restaurant with no units → graceful centered empty state.
    - No new DB queries or WhatsApp helpers added; no `'use client'` directive.
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors.
- Manual smoke (dev server): visit `/r/<existing-slug>/link` → see centered restaurant name and large unit buttons; clicking a unit with a WhatsApp number opens `https://wa.me/<digits>` (not `/r/<slug>/<unitSlug>`).
- Visit `/r/<nonexistent-slug>/link` → Next.js 404.
- A unit lacking `whatsappNumber` appears but is visibly disabled and not clickable.
</verification>

<success_criteria>
- A single shareable mobile-first page lists every unit of a restaurant as a Linktree-style button.
- WhatsApp-enabled units route directly to `wa.me/<number>`; numberless units degrade gracefully (disabled).
- Built entirely on existing `getRestaurantBySlug`, `getUnitsForRestaurant`, and `buildWhatsAppUrl` — zero new queries.
</success_criteria>

<output>
After completion, create `.planning/quick/260630-odg-criar-p-gina-link-na-bio-estilo-linktree/260630-odg-SUMMARY.md`
</output>
