# Project Research Summary

**Project:** Boa Mídia — Cardápio Digital
**Domain:** Multi-tenant SaaS digital menu (cardápio digital) for restaurants, with WhatsApp-based ordering
**Researched:** 2026-06-15
**Confidence:** HIGH

## Executive Summary

Boa Mídia is a multi-tenant SaaS digital menu platform: restaurants (tenants) each have multiple units/branches, a shared product catalog with per-unit availability, and an end customer flow of "pick unit → browse menu → build cart → send order via WhatsApp (wa.me)". This is a well-understood product category in Brazil (Cardápio Web, Goomer, Brendi, Cardapiofast, etc.), and the research converges on a clear, low-risk technical approach: a single Next.js 16 (App Router) application with three route groups — public customer menu (no auth), restaurant admin panel, and platform super-admin panel — backed by a single Supabase Postgres instance using Row Level Security (RLS) as the tenant-isolation boundary, Supabase Auth for both admin roles (differentiated via a server-side `admin_users` table, not JWT metadata), and Supabase Storage for product photos. Tailwind v4 + shadcn/ui handles UI for both admin and customer-facing surfaces.

The recommended approach deliberately keeps v1 thin: no online payment, no order persistence/history, no self-signup, no loyalty — the entire "checkout" is a pure client-side cart that gets formatted into a `wa.me` deep link. This matches both the explicit out-of-scope items in PROJECT.md and the competitive landscape (budget-tier Brazilian competitors validate this exact "WhatsApp-only" entry point). The architectural differentiator — and the hardest thing to retrofit later — is the true multi-tenant, multi-unit data model with shared catalog + per-unit availability, so this must be designed correctly from the first schema migration, not bolted on afterward.

The dominant risk profile is **not** feature complexity but **foundational correctness**: (1) RLS must be enabled and correctly scoped (by tenant, through 2-3 levels of joins) from the very first migration — this is the single most common and most severe class of bug in Supabase multi-tenant apps (CVE-2025-48757 shows real-world exposure from skipping this); (2) the WhatsApp order flow — phone number normalization (Brazilian "ninth digit" issues) and message URL-encoding (accents, emojis, special characters) — is the entire core value proposition and must be built and tested end-to-end on real mobile devices, not just desktop; (3) per-unit availability filtering must be a single server-side query with a documented default, not client-side merging of two fetches. Mitigating these three risk areas in the foundational phases is more important than any feature-breadth decision.

## Key Findings

### Recommended Stack

The stack is essentially user-specified and well-supported: **Next.js 16** (App Router, Server Components, Server Actions, Turbopack default) + **React 19** + **TypeScript** + **Tailwind CSS v4** + **shadcn/ui** for the frontend, and **Supabase** (Postgres + Auth + Storage, via `@supabase/ssr`) as the all-in-one backend. **Drizzle ORM** is recommended from day one for type-safe schema/migrations across the restaurant → unit → category → product → availability hierarchy (joins matter a lot here), though raw `supabase-js` is a viable simpler alternative for a true "fastest possible MVP" variant. **zod** + **react-hook-form** handle admin CRUD form validation, and **libphonenumber-js** is recommended specifically for validating/normalizing unit WhatsApp numbers — directly mitigating the top WhatsApp pitfall. Path-based tenant routing (`/[restaurantSlug]/[unitSlug]`) is recommended over subdomains — simpler, QR-code-friendly, no wildcard DNS/SSL needed, and matches the "link único" requirement in PROJECT.md.

**Core technologies:**
- Next.js 16 (App Router) — full-stack framework; Server Components for cached public menu, Server Actions for admin CRUD and the WhatsApp message build
- Supabase (Postgres + Auth + Storage via `@supabase/ssr`) — single managed backend with RLS for tenant isolation, role-based auth via `app_metadata`/server table, and storage for product photos
- Tailwind CSS v4 + shadcn/ui — styling and accessible UI primitives for both admin panels and brandable customer-facing menu
- Drizzle ORM + drizzle-kit — type-safe schema/migrations for the multi-level tenant hierarchy (use Transaction Mode pooled connection at runtime, Session Mode for migrations)
- zod + react-hook-form + libphonenumber-js — server-side validation of admin CRUD inputs, especially unit WhatsApp numbers (critical for the wa.me flow)

**Avoid:** Pages Router, `@supabase/auth-helpers-nextjs` (deprecated), base64/BLOB image storage in Postgres, Supabase legacy API keys, subdomain-based tenancy for v1, and any client-side-only role checks for authorization.

### Expected Features

Boa Mídia's v1 deliberately implements the thinnest viable loop relative to mature Brazilian competitors (Cardápio Web, Goomer, Saipos, Brendi), which bundle payments, order tracking, loyalty, and delivery logistics. The differentiation for v1 is architectural (true multi-tenant + multi-unit shared catalog) and quality of execution (clean branding, fast pages, well-formatted WhatsApp messages), not feature breadth.

**Must have (table stakes) — directly maps to PROJECT.md's Active Requirements:**
- Unique restaurant link → unit selection page (name, address, WhatsApp number visible)
- Menu browsing by category, with product cards (photo, name, description, price)
- Per-unit product availability filtering (unavailable items hidden for that unit)
- Cart with quantity adjustment and per-item notes/observations
- Order summary + "Enviar pedido via WhatsApp" → wa.me with formatted message to the unit's number
- Platform super-admin login + CRUD restaurants (create/edit/deactivate, assign slug)
- Restaurant admin login (scoped to own restaurant), CRUD categories/products/units, photo upload, per-unit availability toggle
- Empty/error states (no units, empty cart, no products), mobile-first responsive layout, `pt-BR` currency formatting

**Should have (competitive differentiators, v1.x):**
- High-quality WhatsApp message formatting (itemized, with notes/subtotal/unit name) — nearly inseparable from the core send feature, should be built well from the start, not "improved later"
- Category/product sort order control
- "Featured"/promo badge on products
- Per-unit operating hours display

**Defer (v2+, explicitly out of scope per PROJECT.md):**
- Online payment (PIX/cards)
- Order persistence/history/status tracking
- Public restaurant self-signup with billing
- Loyalty/cashback programs
- Delivery zone/fee calculation
- Multi-language menus

### Architecture Approach

A single Next.js app using route groups — `(public)` for the no-auth customer menu, `(restaurant-admin)` for the `/painel/*` restaurant admin panel, and `(platform-admin)` for the `/admin/*` super-admin panel — sharing one Supabase Postgres instance. Tenant isolation is enforced at the database layer via RLS policies keyed off a server-side `admin_users` table (role + restaurant_id), referenced through `SECURITY DEFINER` helper functions (`is_super_admin()`, `get_my_restaurant_id()`). The public menu queries Supabase directly with the anon key under permissive "public read for active items" RLS policies, rendered as cached Server Components (`revalidate ~60s`, with `revalidatePath` from admin Server Actions for near-instant updates on availability/content changes). The cart-to-WhatsApp flow is a pure client-side transformation — no order data ever touches the database in v1.

**Major components:**
1. **Public menu app `(public)`** — unit selection, menu browsing (filtered by per-unit availability), client-side cart (localStorage), WhatsApp message builder; Server Components + anon-key RLS reads, no auth
2. **Restaurant admin panel `(restaurant-admin)` (`/painel/*`)** — CRUD categories/products/units, photo upload, per-unit availability toggles; Server Actions scoped via RLS to the admin's `restaurant_id`
3. **Platform super-admin panel `(platform-admin)` (`/admin/*`)** — CRUD restaurants (tenant provisioning, activate/deactivate); RLS allows full access only via `is_super_admin()` helper
4. **Shared data access layer (`lib/`)** — `lib/supabase/{server,client,admin}.ts` (admin/service-role client isolated and server-only), `lib/actions/` (Server Actions per domain), `lib/queries/` (read-side helpers), `lib/whatsapp/buildMessage.ts` (cart → encoded wa.me URL)
5. **Supabase Postgres + RLS** — `restaurants`, `units`, `categories`, `products`, `product_availability`, `admin_users`; every tenant table has RLS enabled with default-deny + explicit policies
6. **Supabase Storage** — `product-images` bucket, public-read, tenant-prefixed write paths (`{restaurant_id}/{product_id}/{filename}`) with RLS on `storage.objects`

### Critical Pitfalls

1. **RLS disabled by default on new Supabase tables (open data leak)** — Every new table starts with RLS off; forgetting `ENABLE ROW LEVEL SECURITY` exposes all tenants' data via the anon key (real-world precedent: CVE-2025-48757, 303 exposed endpoints). Avoid by enabling the dashboard "Enable RLS on new tables" setting, making `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` mandatory in every migration, and testing every table with the **anon key**, not service-role.

2. **RLS policies referencing the wrong tenant identity / missing joins** — `auth.uid()` is the user's ID, not the restaurant's; the restaurant→unit→category→product→availability hierarchy requires resolving `auth.uid()` to a `restaurant_id` via a join table, and RLS must be enabled on *every* table in that chain (a correct policy on `products` doesn't protect a join through `units` if `units`' policy is missing/wrong). Avoid via `SECURITY DEFINER` helper functions (`get_my_restaurant_id()`, `is_admin_of()`, `is_super_admin()`) and cross-tenant integration tests (log in as Restaurant A, assert zero access to Restaurant B's data).

3. **Role/tenant info stored in client-mutable JWT metadata** — `user_metadata` (and naive use of `app_metadata`) can be edited by the user themselves, enabling privilege escalation (restaurant admin → super-admin, or self-assigning to another tenant). Avoid by storing role + `restaurant_id` in a server-side `admin_users` table with its own RLS, only writable via platform-admin/service-role paths.

4. **Brazilian phone number "ninth digit" mismatch breaks wa.me links** — Free-text WhatsApp number fields without normalization produce `wa.me` links that fail or open the wrong chat — this silently breaks the *entire core value proposition* for whichever unit is misconfigured, often undetected until a real customer hits it. Avoid via a masked/normalized phone input (strip formatting, validate digit count to 12-13 digits, prepend `55`), and an admin-facing "test this WhatsApp link" preview button.

5. **Unencoded/improperly encoded order message breaks the wa.me link** — Template-literal message strings with accented Portuguese characters (ç, ã, é), emojis, or `&`/`#`/`?` must be passed through `encodeURIComponent()` exactly once (never `encodeURI()` or manual replace); lone surrogate pairs from naive truncation can throw `URIError`. Avoid via systematic encoding + end-to-end mobile testing with accents, emojis, and large carts (10+ items).

(A 6th notable pitfall — per-unit availability computed client-side or cached stale — should also be flagged for the public menu phase: do the availability filter in a single server-side query with a documented default for "no row = available or not," and invalidate cache on admin toggle via `revalidatePath`/`revalidateTag`.)

## Implications for Roadmap

Based on combined research, suggested phase structure:

### Phase 1: Foundation — Data Model, RLS, and Auth Roles
**Rationale:** Every other phase depends on the schema and tenant-isolation model being correct from the start; RLS and role design are explicitly flagged across PITFALLS and ARCHITECTURE as "must be designed alongside the schema, not retrofitted" — the highest-cost-to-fix-later item in the entire project.
**Delivers:** Supabase project setup (new-format API keys), Drizzle schema for `restaurants`, `units`, `categories`, `products`, `product_availability`, `admin_users`; RLS enabled on every table with `SECURITY DEFINER` helper functions (`is_super_admin()`, `get_my_restaurant_id()`); base Next.js 16 app scaffold with three route groups `(public)`, `(restaurant-admin)`, `(platform-admin)` and `middleware.ts` auth guards.
**Addresses:** Underpins all P1 features in FEATURES.md (everything depends on the schema existing).
**Avoids:** Pitfall 1 (RLS disabled by default), Pitfall 2 (wrong tenant identity in policies), Pitfall 3 (role in client-mutable metadata).

### Phase 2: Platform Super-Admin — Restaurant Provisioning
**Rationale:** Per FEATURES.md's dependency graph, the restaurant slug/link is generated at restaurant-creation time by the platform admin — nothing downstream (units, menu, links) can be tested end-to-end without at least one provisioned tenant.
**Delivers:** Super-admin login (`/admin/login`), CRUD restaurants (create/edit/deactivate, slug generation + uniqueness), initial `admin_users` provisioning for a restaurant's first admin.
**Addresses:** "Platform admin login + CRUD restaurants" (P1 feature).
**Uses:** `(platform-admin)` route group, `lib/supabase/admin.ts` (service-role, isolated), `is_super_admin()` RLS helper from Phase 1.

### Phase 3: Restaurant Admin — Units, Categories, Products, Photos
**Rationale:** ARCHITECTURE's dependency notes call out that unit/category/product CRUD must exist before the customer-facing menu has anything to show — this phase produces the content the public menu phase will read. Grouping units + categories + products + photo upload together matches their shared "restaurant admin CRUD" nature and lets per-unit availability (Phase 4) build directly on top.
**Delivers:** Restaurant admin login scoped to `restaurant_id` (`/painel/*`), CRUD units/branches (name, address, **normalized WhatsApp number** with input mask + validation + test-link preview), CRUD categories & products (name, description, price), product photo upload to a tenant-prefixed Supabase Storage bucket with server-side validation.
**Addresses:** "Admin CRUD: units/branches", "Admin CRUD: categories & products", "Admin: product photo upload" (all P1).
**Avoids:** Pitfall 4 (public bucket without tenant-scoped write policies), Pitfall 5 (client-only file validation), Pitfall 6 (Brazilian phone number normalization — addressed here at the data-entry point).

### Phase 4: Per-Unit Availability Management
**Rationale:** FEATURES.md explicitly flags this as "the most multi-tenant-specific feature" with the widest dependency fan-in (requires products, units, AND a toggle UI) — sequencing it as its own phase after Phase 3's CRUDs exist avoids building it against an incomplete data model, and isolates the trickiest query-correctness work (Pitfall 8) into a focused phase.
**Delivers:** `product_availability` management UI (matrix or per-unit toggle list) in the restaurant admin panel, with a documented default-availability rule, plus `revalidatePath`/`revalidateTag` wiring so toggles reflect on the public menu near-instantly.
**Addresses:** "Admin: per-unit availability toggle" (P1).
**Avoids:** Pitfall 8 (availability computed client-side or cached stale).

### Phase 5: Public Customer Menu — Unit Selection, Browsing, Cart
**Rationale:** This is the customer-facing half of the core value proposition and depends on Phases 1-4 (schema, tenant data, products, availability) all being in place; it's the highest-traffic surface and benefits from being built once the underlying data model is stable rather than against placeholder data.
**Delivers:** `/[restaurantSlug]` unit selection page, `/[restaurantSlug]/[unitSlug]` menu page (categories + products filtered by unit availability, cached Server Components with `revalidate`), client-side cart (React state + localStorage) with quantity controls and item notes, empty/error states, mobile-first responsive layout with `pt-BR` currency formatting.
**Addresses:** "Customer: unit selection page", "Customer: menu browsing w/ availability filter", "Customer: cart with notes", "Empty/error states" (all P1).
**Implements:** ARCHITECTURE Pattern 2 (public menu as cached Server Components, anon-key RLS reads).

### Phase 6: WhatsApp Order Generation
**Rationale:** PITFALLS and FEATURES both stress that the WhatsApp message *is the product* — it deserves a dedicated phase for the message-formatting logic and, critically, end-to-end mobile device testing (accents, emojis, long carts, multiple DDDs) that can't be rushed as an afterthought of the cart phase.
**Delivers:** `lib/whatsapp/buildMessage.ts` (cart → formatted, `encodeURIComponent`-safe message → `wa.me/<unit_number>?text=...` URL), "Enviar pedido" CTA wired into the cart/order summary screen, end-to-end testing on real iOS/Android devices with Portuguese accented characters, emojis, and 10+ item carts.
**Addresses:** "WhatsApp send (wa.me) with formatted message", "Order summary before sending" (both P1); "WhatsApp message formatting quality" (differentiator, built inline per FEATURES dependency notes).
**Avoids:** Pitfall 6 (phone number format — final verification here using Phase 3's normalized numbers), Pitfall 7 (message encoding).

### Phase Ordering Rationale

- **Foundation-first ordering** reflects the unanimous finding across ARCHITECTURE and PITFALLS that RLS/tenant-isolation design is the single hardest thing to retrofit — every subsequent phase's security model depends on Phase 1 being correct.
- **Provisioning before content before availability before customer-facing** follows FEATURES.md's explicit dependency graph: restaurants → units → products/categories → availability → customer menu → cart → WhatsApp send, each layer requiring the previous to exist with real (or seeded) data.
- **WhatsApp generation as its own final phase** (rather than folded into the cart phase) reflects PITFALLS' framing that phone normalization and message encoding are high-severity, easy-to-miss bugs that warrant dedicated, device-tested verification — bundling them into a broader "cart" phase risks under-testing the one feature that defines the product's core value.
- This ordering also naturally produces a **demoable increment at the end of each phase**: Phase 2 = "a restaurant exists with a login", Phase 3 = "a restaurant admin can build their menu", Phase 4 = "availability differs correctly per unit", Phase 5 = "a customer can browse and build a cart", Phase 6 = "a customer can complete the full loop end-to-end".

### Research Flags

Needs research during planning (`/gsd:research-phase`):
- **Phase 1 (Foundation/RLS):** RLS policy design through multi-level joins (restaurant → unit → product → availability) is non-trivial and the highest-stakes phase; worth a focused research pass on the exact `SECURITY DEFINER` helper function signatures and policy SQL before implementation.
- **Phase 6 (WhatsApp Order Generation):** wa.me encoding edge cases (lone surrogates/emojis, message length limits, mobile WebView behavior) are documented mostly via community sources (MEDIUM confidence) — worth a focused pass to nail down the exact encoding/truncation strategy and device test matrix.

Phases with standard, well-documented patterns (research-phase likely unnecessary):
- **Phase 2 (Platform Super-Admin):** Standard Supabase Auth + RLS CRUD pattern, well-covered by official docs and MakerKit guides.
- **Phase 3 (Restaurant Admin CRUD/Photos):** Standard admin CRUD + Supabase Storage upload pattern; the phone-normalization piece (libphonenumber-js) is a small, well-scoped addition.
- **Phase 4 (Availability Management):** Standard many-to-many toggle UI + `revalidatePath` pattern, clearly documented in ARCHITECTURE.
- **Phase 5 (Public Menu/Cart):** Standard Next.js Server Components + cached data fetching pattern, well-covered by official Next.js and Supabase docs.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core versions verified directly against npm registry (next 16.2.9, supabase-js 2.108.2, etc.) and official Next.js/Supabase/shadcn docs. Only the broader Next.js 16 ecosystem maturity is MEDIUM (recent major release). |
| Features | MEDIUM | Competitor feature landscape based on multiple Brazilian blog/vendor sources (medium-low individual confidence) that converge on a consistent picture; the MVP scope itself is directly grounded in PROJECT.md's explicit requirements (high confidence on what to build). |
| Architecture | HIGH | RLS/multi-tenancy and route-group patterns verified against official Supabase and Next.js documentation plus multiple corroborating production guides (MakerKit, dev.to). |
| Pitfalls | HIGH | RLS/Storage pitfalls verified against official Supabase docs and a real CVE disclosure (CVE-2025-48757); WhatsApp/wa.me pitfalls are MEDIUM (community sources) but cross-checked across multiple independent sources and internally consistent. |

**Overall confidence:** HIGH

### Gaps to Address

- **Default availability rule undecided:** PITFALLS flags that the "no row in `product_availability` for a product-unit pair" case needs an explicit, documented default (available vs. unavailable) — this decision should be made explicitly in Phase 1/4 planning, not left implicit in the schema.
- **Single `admin_users` table vs. separate role tables:** PITFALLS notes a shared table with a `role` enum is acceptable for v1 *if* role/tenant_id are never client-writable — this design choice should be confirmed during Phase 1 planning rather than assumed.
- **ORM choice (Drizzle vs. raw supabase-js):** STACK presents Drizzle as the default recommendation but explicitly notes a "no-ORM" variant is viable for a 5-6 table schema if time-to-first-deploy is prioritized — worth a quick decision checkpoint at the start of Phase 1 rather than deep-diving both options.
- **Image gallery vs. single photo per product:** PROJECT.md says "fotos" (plural) but FEATURES/STACK recommend starting with a single `image_url` column; confirm with stakeholders during requirements/roadmap whether multi-photo galleries are truly needed for v1 or can be deferred (additive `product_images` table later).
- **wa.me message length / mobile WebView behavior:** No hard documented limit was found; Phase 6 should establish a practical cap (e.g., ~2000 chars) empirically during device testing rather than relying on a single source's guidance.

## Sources

### Primary (HIGH confidence)
- npm registry direct queries — exact current versions for next, @supabase/supabase-js, @supabase/ssr, tailwindcss, react, zod, react-hook-form, drizzle-orm
- [Next.js Upgrading: Version 16 (official docs)](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Supabase Row Level Security docs (official)](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Custom Claims & RBAC (official)](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Authorization via Row Level Security | Supabase Features (official)](https://supabase.com/features/row-level-security)
- [Storage Buckets | Supabase Docs (official)](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Supabase Storage Access Control (official)](https://supabase.com/docs/guides/storage/security/access-control)
- [shadcn/ui Tailwind v4 / Next.js install docs (official)](https://ui.shadcn.com/docs/tailwind-v4)
- [On-Demand ISR revalidation discussion (vercel/next.js, official repo)](https://github.com/vercel/next.js/discussions/34585)
- [Fetching and caching Supabase data in Next.js Server Components (Supabase official blog)](https://supabase.com/blog/fetching-and-caching-supabase-data-in-next-js-server-components)
- [Supabase RLS CVE-2025-48757 breakdown](https://vibeappscanner.com/supabase-row-level-security)
- [encodeURIComponent() (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)

### Secondary (MEDIUM confidence)
- [Supabase RLS Best Practices (makerkit.dev)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — production multi-tenant RLS patterns
- [Drizzle vs Prisma 2026 (Bytebase, makerkit.dev)](https://www.bytebase.com/blog/drizzle-vs-prisma/) — ORM choice rationale
- [Comparativo de Cardápios Digitais com QR Code no Brasil 2026 (Moby Dev)](https://blog.mobydev.com.br/post/melhor-ferramenta-cardapio-digital-brasil-2025-2026) — Brazilian competitor feature comparison
- [Cardápio digital: como criar catálogo para delivery 2026 (Brendi)](https://brendi.com.br/blog/cardapio-digital-catalogo-gratis-2026/) — no-fee/no-signup positioning
- [Brazilian phone number "ninth digit" inconsistencies (Gupshup)](https://support.gupshup.io/hc/en-us/articles/4407840924953-A-brief-note-on-the-inconsistencies-for-mobile-numbers-and-their-WhatsApp-IDs-in-Brazil-digit-9-Mexico-digit-1)
- [How to Create a WhatsApp Link (wa.me) With Pre-Filled Message (QuadLayers)](https://quadlayers.com/how-to-create-a-whatsapp-link-wa-me-with-a-pre-filled-message/)

### Tertiary (LOW confidence)
- [Cardápio Digital Grátis - Cardapiofast](https://cardapiofast.com/) — vendor marketing claims about multi-store dashboards, needs validation
- Abrasel QR-code adoption statistics — cited secondhand via Moby Dev, original source not directly verified
- [Best Next.js form library 2026 (splitforms.com)](https://splitforms.com/blog/best-nextjs-form-library-2026) — single-source guidance on useActionState vs RHF

---
*Research completed: 2026-06-15*
*Ready for roadmap: yes*
