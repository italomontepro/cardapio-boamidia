# Architecture Research

**Domain:** Multi-tenant SaaS digital menu platform (restaurant -> units -> products, two admin roles, public no-login menu, WhatsApp checkout)
**Researched:** 2026-06-15
**Confidence:** HIGH (structure/RLS patterns verified against Supabase official docs + multiple production guides; Next.js routing patterns verified against Next.js docs and community guides)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Single Next.js App (App Router)                  │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────┐  │
│  │  (public)         │  │  (restaurant-    │  │  (platform-admin)      │  │
│  │  /[restaurant]/    │  │   admin)         │  │  /admin/*               │  │
│  │  /[restaurant]/    │  │  /painel/*       │  │  - super-admin login    │  │
│  │   [unit]           │  │  - restaurant     │  │  - CRUD restaurants     │  │
│  │  - unit picker     │  │    admin login    │  │  - activate/deactivate  │  │
│  │  - menu (categories│  │  - CRUD          │  │                          │  │
│  │    + products)     │  │    categories/    │  │                          │  │
│  │  - cart            │  │    products       │  │                          │  │
│  │  - WhatsApp link   │  │  - photo upload   │  │                          │  │
│  │    builder         │  │  - CRUD units     │  │                          │  │
│  │  - no login        │  │  - per-unit       │  │                          │  │
│  │                    │  │    availability   │  │                          │  │
│  └─────────┬──────────┘  └─────────┬─────────┘  └────────────┬────────────┘  │
│            │                       │                          │              │
├────────────┴───────────────────────┴──────────────────────────┴─────────────┤
│                    Shared Data Access Layer (Server Components,             │
│                    Route Handlers / Server Actions, Supabase clients)       │
├──────────────────────────────────────────────────────────────────────────┤
│                         Supabase (Postgres + Auth + Storage)               │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────────────┐  │
│  │ auth.users    │ │ restaurants   │ │ units        │ │ categories/       │  │
│  │ (super-admin  │ │ admin_users   │ │ availability  │ │ products          │  │
│  │  + restaurant │ │ (role table)  │ │              │ │                    │  │
│  │  admins)      │ │              │ │              │ │ Storage: product-  │  │
│  │              │ │              │ │              │ │ images bucket      │  │
│  └──────────────┘ └──────────────┘ └─────────────┘ └──────────────────┘  │
│                    All tenant tables protected by RLS policies             │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Public menu app `(public)` | Unit selection, menu browsing, cart, WhatsApp message generation — no auth | Server Components for data fetching (ISR/cached), Client Components for cart state (localStorage/context) |
| Restaurant admin panel `(restaurant-admin)` | CRUD categories/products/units/availability for the logged-in restaurant only | Protected route group, Supabase Auth session, Server Actions for mutations, RLS scopes data to `restaurant_id` |
| Platform super-admin panel `(platform-admin)` | CRUD restaurants/tenants, activate/deactivate | Protected route group, separate role check, RLS allows full access only to `super_admin` role |
| Shared data access layer | Query/mutation logic shared across panels (e.g., product CRUD helpers) | `lib/` or `data/` folder with typed Supabase queries; Server Actions colocated or in `lib/actions/` |
| Supabase Postgres + RLS | Tenant data isolation, role-based access enforcement at DB level | Tables with `restaurant_id` FK + RLS policies referencing `auth.uid()` via membership table |
| Supabase Auth | Authentication for both admin roles (no auth needed for public side) | Two logical "spaces" sharing `auth.users`, differentiated by an `admin_users` role/membership table |
| Supabase Storage | Product photo uploads | Private or public bucket `product-images`, path-scoped by `restaurant_id`, RLS on storage.objects |

## Recommended Project Structure

```
src/
├── app/
│   ├── (public)/                      # No-auth customer-facing menu
│   │   └── [restaurantSlug]/
│   │       ├── page.tsx               # Unit selection page
│   │       └── [unitSlug]/
│   │           ├── page.tsx           # Menu (categories + products)
│   │           ├── cart/              # Cart view (client component)
│   │           └── layout.tsx         # Restaurant-branded layout (logo, colors if any)
│   │
│   ├── (restaurant-admin)/
│   │   └── painel/
│   │       ├── login/page.tsx
│   │       ├── layout.tsx             # Auth guard + restaurant-scoped nav
│   │       ├── categorias/
│   │       ├── produtos/
│   │       │   └── [id]/editar/       # incl. photo upload
│   │       ├── unidades/
│   │       │   └── [id]/disponibilidade/  # per-unit availability matrix
│   │       └── page.tsx               # dashboard/overview
│   │
│   ├── (platform-admin)/
│   │   └── admin/
│   │       ├── login/page.tsx
│   │       ├── layout.tsx             # Auth guard, super_admin only
│   │       ├── restaurantes/
│   │       │   ├── page.tsx           # list/CRUD
│   │       │   └── [id]/page.tsx
│   │       └── page.tsx
│   │
│   └── api/                            # Route handlers only if needed
│       └── revalidate/route.ts        # on-demand ISR revalidation webhook target
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts                  # server-side client (cookies-based)
│   │   ├── client.ts                  # browser client
│   │   └── admin.ts                   # service-role client (server-only, for super-admin ops)
│   ├── actions/                       # Server Actions per domain
│   │   ├── products.ts
│   │   ├── categories.ts
│   │   ├── units.ts
│   │   ├── availability.ts
│   │   └── restaurants.ts
│   ├── queries/                       # Read-side helpers (Server Components)
│   │   ├── menu.ts                    # public menu queries
│   │   └── admin.ts
│   ├── auth/
│   │   └── session.ts                 # role resolution helpers (super_admin / restaurant_admin)
│   └── whatsapp/
│       └── buildMessage.ts            # cart -> formatted WhatsApp message + wa.me URL
│
├── components/
│   ├── public/                        # menu cards, cart drawer, unit picker
│   ├── admin/                         # shared admin UI (tables, forms, image uploader)
│   └── ui/                            # generic Tailwind UI primitives
│
└── middleware.ts                       # route-group auth redirects (admin vs painel vs public)
```

### Structure Rationale

- **Single Next.js app with route groups, not separate apps:** At this scale (one product, shared deploy on Vercel, shared component library), a monorepo with multiple apps adds deployment/config overhead with no real benefit. Route groups `(public)`, `(restaurant-admin)`, `(platform-admin)` give clean separation of layouts, auth guards, and navigation without affecting URLs — this is the standard, well-documented Next.js App Router pattern for multi-role dashboards.
- **`lib/actions/` and `lib/queries/` split:** Keeps mutation logic (Server Actions, used by both admin panels) separate from read-only data fetching (used heavily by the public menu, which benefits from caching/ISR). This separation also makes it easy to reason about which Supabase client (anon vs service-role) is used where.
- **`lib/supabase/admin.ts` isolated:** The service-role key bypasses RLS — confining its use to one file under `lib/` (server-only, never imported by client components) limits the blast radius of a mistake. Most operations, including super-admin CRUD, should still go through the anon client + RLS where possible; service-role is a last resort for cross-tenant admin tasks.
- **`middleware.ts` for route protection:** Each route group has a different "who can be here" rule (public = anyone, `/painel/*` = restaurant_admin matching the restaurant, `/admin/*` = super_admin). Middleware centralizes redirect-to-login logic before pages render.

## Architectural Patterns

### Pattern 1: Hierarchical tenancy via `restaurant_id` foreign keys + RLS

**What:** Every tenant-scoped table (`units`, `categories`, `products`, `product_availability`, `admin_users`) carries a `restaurant_id` (directly or via join). RLS policies filter rows based on the authenticated user's restaurant membership.

**When to use:** Always, for any table holding restaurant-owned data. This is the foundation of tenant isolation — without it, a bug in application code could leak data across tenants.

**Trade-offs:**
- Pro: Isolation enforced at the database layer — even if app code has a bug, RLS blocks cross-tenant reads/writes.
- Pro: Public menu queries can use a single anon client with a permissive `SELECT` policy (e.g., "active products of active restaurants are publicly readable") — no per-request auth needed.
- Con: Every new table needs explicit RLS policies (default-deny), which is more upfront work than relying purely on app-level checks. Forgetting to enable RLS on a new table is the most common mistake.

**Example:**
```sql
-- admin_users: links auth.users to a restaurant with a role
create table admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  restaurant_id uuid references restaurants(id), -- null for super_admin
  role text not null check (role in ('super_admin', 'restaurant_admin')),
  unique (user_id, restaurant_id)
);

-- Helper: is the current user a super_admin?
create or replace function is_super_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from admin_users
    where user_id = (select auth.uid()) and role = 'super_admin'
  );
$$;

-- products: restaurant_admins manage their own; super_admins manage all
create policy "restaurant admins manage own products"
on products for all
using (
  is_super_admin()
  or restaurant_id in (
    select restaurant_id from admin_users
    where user_id = (select auth.uid()) and role = 'restaurant_admin'
  )
);

-- Public read access (no auth) — only active items of active restaurants
create policy "public can read active products"
on products for select
to anon
using (
  is_active = true
  and restaurant_id in (select id from restaurants where is_active = true)
);
```

### Pattern 2: Public menu as cached Server Components (no auth, read-heavy)

**What:** The customer-facing pages (`/[restaurantSlug]/[unitSlug]`) are Server Components that query Supabase directly with the anon key, relying on RLS's public-read policies. Pages are statically generated or cached with time-based revalidation (`revalidate = 60` or similar), since menu content changes infrequently relative to traffic.

**When to use:** All public menu routes. This is the highest-traffic part of the app (every customer scan) and has no per-user personalization, making it ideal for caching.

**Trade-offs:**
- Pro: Fast, cheap, scales well on Vercel's edge/CDN even with many tenants.
- Pro: No auth overhead on the hot path.
- Con: Admin changes (e.g., marking a product unavailable) won't appear instantly unless you either (a) keep `revalidate` short (e.g., 30-60s, "good enough" for a menu), or (b) wire a Supabase Database Webhook on `products`/`product_availability`/`units` tables to call a Next.js route handler that triggers `revalidatePath` for the affected restaurant/unit path. For v1, time-based revalidation is simplest and sufficient — on-demand revalidation can be added later if "instant update" becomes a requirement.

**Example:**
```typescript
// app/(public)/[restaurantSlug]/[unitSlug]/page.tsx
export const revalidate = 60; // seconds — menu refreshes at most every minute

export default async function MenuPage({ params }: { params: { restaurantSlug: string; unitSlug: string } }) {
  const supabase = createServerClient(); // anon key, server-side
  const { data: unit } = await supabase
    .from('units')
    .select('id, name, whatsapp_number, restaurants!inner(id, name, slug, is_active)')
    .eq('slug', params.unitSlug)
    .eq('restaurants.slug', params.restaurantSlug)
    .single();

  const { data: categories } = await supabase
    .from('categories')
    .select(`id, name, products!inner(id, name, description, price, image_url,
      product_availability!inner(is_available))`)
    .eq('restaurant_id', unit.restaurants.id)
    .eq('products.product_availability.unit_id', unit.id)
    .eq('products.product_availability.is_available', true);

  return <MenuView unit={unit} categories={categories} />;
}
```

### Pattern 3: Cart-to-WhatsApp message as pure client-side transformation

**What:** The cart lives entirely client-side (React state + localStorage, no DB persistence in v1). On checkout, a pure function formats the cart (item names, quantities, notes, total) into a URL-encoded text message and constructs a `https://wa.me/<unit_whatsapp_number>?text=<encoded_message>` link, opened via `<a target="_blank">` or `window.location`.

**When to use:** This is the entire "checkout" flow for v1, per the project's explicit out-of-scope decisions (no payment, no order persistence).

**Trade-offs:**
- Pro: Zero backend complexity — no order tables, no payment integration, no webhook handling.
- Pro: Works even if the customer's session is just a one-time page load (no login required).
- Con: No order history/audit trail — if "out of scope" items (order tracking) are revisited later, this becomes a v2 addition (an `orders` table + the same WhatsApp flow as a side effect of an insert), not a rewrite. Worth designing the cart data shape now so it maps cleanly onto a future `order_items` table.
- Con: `wa.me` links have practical length limits on the encoded text; very large carts could produce unwieldy messages — acceptable for a restaurant menu use case but worth noting.

**Example:**
```typescript
// lib/whatsapp/buildMessage.ts
type CartItem = { name: string; quantity: number; price: number; notes?: string };

export function buildWhatsAppUrl(unitWhatsappNumber: string, unitName: string, items: CartItem[]) {
  const lines = [
    `*Novo pedido - ${unitName}*`,
    '',
    ...items.map(i => `${i.quantity}x ${i.name}${i.notes ? ` (${i.notes})` : ''} - R$ ${(i.price * i.quantity).toFixed(2)}`),
    '',
    `*Total: R$ ${items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2)}*`,
  ];
  const text = encodeURIComponent(lines.join('\n'));
  // unitWhatsappNumber stored in international format e.g. 5511999999999
  return `https://wa.me/${unitWhatsappNumber}?text=${text}`;
}
```

## Data Flow

### Request Flow — Public Menu

```
Customer scans QR / opens link (/pizzaria-do-joao)
    ↓
(public) route group → Server Component
    ↓
Supabase anon client → RLS "public read" policy → restaurants, units
    ↓
Customer picks unit (/pizzaria-do-joao/centro)
    ↓
Server Component fetches categories + products + product_availability
    (filtered to is_active=true and unit_id match)
    ↓
Rendered menu (cached, revalidate ~60s)
    ↓
Customer adds items → Client Component state (cart context + localStorage)
    ↓
Customer taps "Enviar pedido" → buildWhatsAppUrl(unit.whatsapp_number, cart)
    ↓
Browser opens wa.me link → WhatsApp app/web with prefilled message
    ↓
Customer sends message manually → arrives in unit's WhatsApp
```

### Request Flow — Admin Mutation Reflected in Public Menu

```
Restaurant admin logs in (/painel/login)
    ↓
(restaurant-admin) layout → Supabase Auth session check + admin_users role lookup
    ↓
Admin edits product / toggles availability for a unit (/painel/produtos/[id])
    ↓
Server Action → Supabase client (user session, RLS-scoped to their restaurant_id)
    ↓
UPDATE products / product_availability (RLS allows because admin_users.restaurant_id matches)
    ↓
revalidatePath(`/${restaurantSlug}/${unitSlug}`)  [optional, for instant reflect]
    ↓
Next page load of public menu either:
  - gets fresh data immediately (if revalidatePath called), or
  - gets fresh data within `revalidate` window (time-based ISR fallback)
```

### Key Data Flows

1. **Tenant provisioning:** Super-admin creates a `restaurants` row + an initial `admin_users` row (role=`restaurant_admin`, linked to a new or existing `auth.users` account) → restaurant admin can now log in to `/painel`.
2. **Menu authoring → public visibility:** Restaurant admin creates categories/products (global to the restaurant) and sets `product_availability` per unit → public menu for each unit shows only products marked available for that `unit_id`.
3. **Cart → WhatsApp:** Entirely client-side; no server round-trip beyond the initial menu data fetch. The "order" never touches the database in v1.
4. **Image upload:** Restaurant admin uploads a product photo → Supabase Storage bucket `product-images/{restaurant_id}/{product_id}/{filename}` → public URL stored in `products.image_url` → consumed directly by public menu `<Image>` components (Supabase Storage CDN serves the file).

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users (handful of restaurants, low traffic) | Current architecture as-is. Single Supabase project (free/small tier), Vercel hobby/pro, time-based ISR (60s) is plenty. |
| 1k-100k users (dozens-hundreds of restaurants, moderate traffic) | Index `restaurant_id`, `unit_id`, and slug columns (RLS-referenced columns especially — missing indexes are the top RLS performance killer). Consider on-demand revalidation via Supabase Database Webhooks for "instant" menu updates if requested. Move product images to a CDN-fronted public bucket if not already. |
| 100k+ users (many restaurants, high public traffic) | Public menu pages should be fully static/edge-cached per unit with on-demand revalidation only (avoid hitting Postgres on every page view). Consider read replicas or a caching layer (e.g., Redis) in front of menu queries if Postgres becomes a bottleneck. Re-evaluate whether platform-admin and restaurant-admin panels need separate deployments for isolation — unlikely to be necessary even at this scale for an internal tool.

### Scaling Priorities

1. **First bottleneck:** RLS policy performance on `products`/`product_availability` joins as product catalogs grow — mitigated by indexing `restaurant_id`/`unit_id` and wrapping `auth.uid()` calls in `(select auth.uid())` so Postgres caches the value per query instead of per row.
2. **Second bottleneck:** Public menu page load if every request hits Postgres — mitigated by ISR/edge caching; only becomes relevant once a restaurant has meaningful foot traffic (QR code scans).

## Anti-Patterns

### Anti-Pattern 1: Separate Next.js apps/projects per role

**What people do:** Spin up three separate Next.js projects (public site, restaurant admin, super-admin) thinking it gives "better separation."
**Why it's wrong:** Triples deployment config, duplicates the Supabase client setup and shared UI components, and makes shared types (e.g., `Product`, `Unit`) harder to keep in sync. For a single small team building an MVP, this is pure overhead with no security benefit — RLS and route-level auth already provide the real isolation.
**Instead:** One Next.js app, three route groups `(public)`, `(restaurant-admin)`, `(platform-admin)`, each with its own layout/middleware guard.

### Anti-Pattern 2: Relying on application code alone for tenant isolation

**What people do:** Add `WHERE restaurant_id = ?` to every query in app code, skip RLS ("we'll always remember to filter").
**Why it's wrong:** One forgotten `.eq('restaurant_id', ...)` in a Server Action and Restaurant A can read or modify Restaurant B's products. This is the single most common multi-tenant SaaS security bug.
**Instead:** Enable RLS on every tenant table from the start (default-deny), with policies based on `admin_users` membership. App-level filters become a performance optimization, not the security boundary.

### Anti-Pattern 3: Storing raw role/tenant info in `auth.users.raw_user_metadata` and trusting it for authorization

**What people do:** Put `restaurant_id` or `role` in user metadata and check it client-side or in RLS policies directly against `auth.jwt() -> 'user_metadata'`.
**Why it's wrong:** `raw_user_metadata` (and the `user_metadata` JWT claim derived from it) is end-user-editable via the Supabase Auth API — a restaurant admin could potentially escalate to `super_admin` by editing their own metadata.
**Instead:** Use a server-controlled `admin_users` table (or `app_metadata`, which is not user-editable) as the source of truth for roles, and reference it in RLS policies via a `security definer` helper function as shown in Pattern 1.

### Anti-Pattern 4: Persisting "orders" prematurely

**What people do:** Build an `orders`/`order_items` table and order-status workflow in v1 "because it'll be needed eventually."
**Why it's wrong:** The project explicitly scoped this out for v1 — building it now adds admin UI surface (order list, status updates), notification concerns, and data model complexity before the core WhatsApp-handoff flow is validated.
**Instead:** Keep the cart purely client-side and stateless for v1. Design the cart's TypeScript shape (`CartItem[]`) so it maps cleanly to a future `order_items` table if order history becomes a real requirement later — but don't build the table/UI now.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | `@supabase/ssr` server/browser clients; session cookies read in middleware and Server Components | One Supabase Auth instance serves both admin roles; differentiation happens via the `admin_users` table, not separate Auth projects |
| Supabase Postgres | Server Components / Server Actions query via Supabase JS client (anon key + RLS for normal ops; service-role only for narrow super-admin cross-tenant tasks) | Enable RLS on every table at creation time — never defer |
| Supabase Storage | `product-images` bucket, path convention `{restaurant_id}/{product_id}/{filename}`, RLS on `storage.objects` mirrors the `products` table policy (restaurant admins write to their own prefix, public read for active products) | Bucket can be public-read with RLS restricting writes, since product photos are meant to be publicly visible on the menu |
| WhatsApp (`wa.me`) | Pure client-side URL construction, no API/webhook integration | No WhatsApp Business API needed for v1 — `wa.me` deep links are sufficient and require no credentials |
| Vercel | Standard Next.js deployment; Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) as encrypted env vars | Service-role key must never be exposed to client bundles — confine to server-only files |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `(public)` ↔ Supabase | Direct read-only queries via anon client, RLS-gated public-read policies | No admin logic leaks into this boundary; this route group should never import `lib/supabase/admin.ts` |
| `(restaurant-admin)` ↔ Supabase | Server Actions using the authenticated user's session; RLS scopes all reads/writes to the admin's `restaurant_id` via `admin_users` | Middleware verifies session + `admin_users.role = 'restaurant_admin'` before rendering `/painel/*` |
| `(platform-admin)` ↔ Supabase | Server Actions using authenticated session; RLS allows full access when `admin_users.role = 'super_admin'` (via `is_super_admin()` helper) | Middleware verifies session + role before rendering `/admin/*`; service-role client only if a specific cross-tenant operation can't be expressed cleanly in RLS |
| Restaurant admin changes ↔ Public menu | Database is the single source of truth; either time-based ISR (`revalidate`) or `revalidatePath`/`revalidateTag` triggered from Server Actions on write | For v1, calling `revalidatePath` directly inside the Server Action after a successful mutation is simpler than setting up Database Webhooks, and gives near-instant reflection without extra infrastructure |

## Sources

- [Supabase RLS Best Practices: Production Patterns for Secure Multi-Tenant Apps (makerkit.dev)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — MEDIUM-HIGH: detailed, consistent with official Supabase RLS docs on `(select auth.uid())` caching and `security definer` helper functions
- [Row-Level Security in Supabase: Multi-Tenant SaaS from Day One (dev.to)](https://dev.to/issuecapture/row-level-security-in-supabase-multi-tenant-saas-from-day-one-4lon) — MEDIUM: corroborates membership-table pattern
- [Authorization via Row Level Security | Supabase Features (official)](https://supabase.com/features/row-level-security) — HIGH: official Supabase documentation
- [Storage Buckets | Supabase Docs (official)](https://supabase.com/docs/guides/storage/buckets/fundamentals) — HIGH: official docs on bucket privacy defaults and RLS on storage.objects
- [Supabase Storage in Practice: File Uploads, Access Control, and CDN Acceleration](https://eastondev.com/blog/en/posts/dev/20260409-supabase-storage-en/) — MEDIUM: path-prefix RLS pattern for per-tenant storage isolation
- [Mastering Route Groups in Next.js (Medium)](https://prateekbadjatya.medium.com/mastering-route-groups-in-next-js-organizing-clean-urls-and-scalable-codebases-5c92affb8794) — MEDIUM: consistent with Next.js official route groups documentation
- [On-Demand ISR revalidation for dynamic routes (vercel/next.js discussion, official repo)](https://github.com/vercel/next.js/discussions/34585) — HIGH: official Next.js team discussion on revalidation patterns
- [Fetching and caching Supabase data in Next.js 13 Server Components (Supabase official blog)](https://supabase.com/blog/fetching-and-caching-supabase-data-in-next-js-server-components) — HIGH: official Supabase guidance on Server Component data fetching

---
*Architecture research for: Multi-tenant digital menu SaaS (Boa Mídia)*
*Researched: 2026-06-15*
