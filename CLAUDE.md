<!-- GSD:project-start source:PROJECT.md -->
## Project

**Boa Mídia — Cardápio Digital**

Boa Mídia é uma plataforma SaaS multi-tenant de cardápio digital para restaurantes. Cada restaurante cadastrado pode ter múltiplas unidades/filiais, cada uma com seu próprio número de WhatsApp e disponibilidade de produtos. O cliente final acessa um link único do restaurante, escolhe a unidade, navega pelo cardápio, monta um pedido e envia via WhatsApp para a unidade escolhida. O sistema tem dois níveis de administração: um admin geral da plataforma (gerencia os restaurantes clientes) e um admin por restaurante (gerencia categorias, produtos, fotos, unidades e disponibilidade).

**Core Value:** Um cliente final consegue acessar o link de um restaurante, escolher a unidade, montar um pedido pelo cardápio e enviá-lo via WhatsApp direto para aquela unidade.

### Constraints

- **Tech stack**: Next.js + Tailwind CSS — escolha do usuário para o front-end/full-stack.
- **Banco de dados**: Relacional (sugestão Supabase/Postgres) — necessário para multi-tenant, dois níveis de auth e disponibilidade por unidade.
- **Deploy**: Futuro deploy na Vercel — não bloqueia o v1, mas influencia escolhas de stack.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.x (latest: 16.2.9) | Full-stack React framework (App Router, Server Components, Server Actions) | The user already specified Next.js. v16 is the current stable major (production-ready since 16.2.4, April 2026) with Turbopack as default bundler, stable React Compiler, and explicit caching via Cache Components. For a **greenfield** project, starting on 16 avoids an immediate migration. The public menu pages (read-heavy, mostly static per tenant) benefit from Server Components + ISR/caching, while admin CRUD and the "build cart → wa.me" flow fit naturally into Server Actions. |
| React | 19.2.x | UI library (bundled with Next.js) | Required by Next.js 16. React 19's `useActionState` + Server Actions removes the need for hand-rolled client-side mutation state in admin CRUD forms. |
| TypeScript | 5.x | Type safety across DB schema, server actions, and UI | Standard for any non-trivial Next.js app in 2026. Critical here because the data model has a real hierarchy (tenant → unit → category → product → availability) — types catch tenant-scoping bugs at compile time. |
| Tailwind CSS | 4.x (latest: 4.4.x) | Styling | User-specified. v4 uses CSS-first config (`@theme` in `globals.css`, no `tailwind.config.js`), is faster, and is the default when scaffolding with `create-next-app`. Pairs natively with shadcn/ui's v4 components. |
| Supabase (Postgres + Auth + Storage) | supabase-js 2.108.x, @supabase/ssr 0.12.x | Database, authentication, file storage | User-suggested and well-justified: gives a single managed Postgres instance with Row Level Security (RLS) for tenant isolation, built-in Auth with `app_metadata`-based roles for the two admin tiers, and Storage buckets for product photos — all in one platform, deploys cleanly alongside Vercel. |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Drizzle ORM + drizzle-kit | drizzle-orm 0.45.x | Type-safe schema definition, migrations, and queries against Supabase Postgres | Use from day one for the relational schema (restaurants, units, categories, products, product_availability, admin_users/roles). Drizzle's small bundle and zero binary dependencies fit Vercel's serverless/edge functions, and its SQL-like query builder makes the "products for unit X where available=true" joins explicit and fast. Prefer over raw `supabase-js` table queries once the schema has more than 3-4 related tables — type-safe joins matter a lot for the restaurant→unit→product→availability hierarchy. |
| @supabase/ssr | 0.12.x | Cookie-based Supabase client for Server Components, Server Actions, and middleware | Required for any Supabase Auth use in App Router. Replaces the deprecated `@supabase/auth-helpers-nextjs`. Use `createServerClient` in Server Components/Actions and `createBrowserClient` only for client-side interactive bits (e.g., live cart). |
| zod | 4.x | Schema validation for forms and Server Action inputs | Validate admin CRUD payloads (product name/price/description, unit WhatsApp number format, etc.) on the server regardless of client validation — Server Actions are public endpoints. |
| react-hook-form | 7.x (latest: 7.79.x) | Client-side form state for admin CRUD forms | Use for forms with non-trivial interactivity: product create/edit with image upload + multiple fields, per-unit availability toggles (dynamic field arrays). For the simplest single-field forms (e.g., "rename category"), Next.js 16's native `useActionState` + Zod is sufficient — don't add RHF everywhere. |
| shadcn/ui | latest (CLI-based, Tailwind v4 + React 19 compatible) | Pre-built accessible UI primitives (dialogs, tables, forms, dropdowns) | Use for both admin panels (data tables for restaurants/categories/products, forms, modals) and the customer-facing menu (cards, sheet/drawer for cart). Not a dependency you "install" with a version — components are copied into the repo via `npx shadcn@latest add <component>`, so you own and customize them. This is the dominant Tailwind-based component approach in 2026. |
| @supabase/storage-js (via supabase-js) | bundled with 2.108.x | Product photo upload/storage | Create a `product-images` bucket. Use signed upload URLs generated server-side (Server Action) so the client never holds elevated credentials, and apply RLS storage policies scoped per-restaurant (path prefix = `restaurant_id/...`). |
| next/image | bundled with Next.js | Optimized image rendering for product photos | Configure `remotePatterns` to allow the Supabase Storage public/CDN domain. Essential for menu pages with many product photos — avoids shipping full-resolution uploads to mobile customers. |
| date-fns or native `Intl` | date-fns 4.x (only if needed) | Formatting timestamps (e.g., "last updated" in admin) | Likely minor for v1 since there's no order history; only add if admin screens need relative/localized date formatting (pt-BR). |
| libphonenumber-js | latest 1.x | Validate/format WhatsApp phone numbers per unit | Use when admin enters a unit's WhatsApp number — validates Brazilian (and international) phone formats before constructing the `wa.me/<number>` link. Prevents malformed numbers that silently break the "send order" flow — this is a core-value-path validation, worth the small dependency. |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint (Next.js config) + Prettier | Linting/formatting | `create-next-app` scaffolds ESLint with the Next.js + TypeScript config by default. Add `prettier-plugin-tailwindcss` to auto-sort Tailwind classes — keeps generated shadcn components and hand-written JSX consistent. |
| drizzle-kit | Schema migrations | Run `drizzle-kit generate` + `drizzle-kit migrate` against the Supabase connection string (use **Session Mode** pooled connection for migrations, **Transaction Mode** for app runtime queries on serverless). |
| Supabase CLI | Local dev, type generation, storage/RLS management | `supabase gen types typescript` can generate types from the live schema as a cross-check against Drizzle's schema — useful but optional; Drizzle schema is source of truth if using Drizzle for migrations. |
| Vercel | Hosting/deploy (per project constraint) | Zero-config for Next.js 16. Set Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, publishable key, secret key) as Vercel environment variables, scoped per environment (Preview/Production). |
## Installation
# Scaffold (Tailwind v4, App Router, TS — all defaults in 2026)
# Core data/auth
# Validation & forms
# UI components (after create-next-app, init shadcn)
# Dev dependencies
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Supabase (Auth + Postgres + Storage) | Clerk (auth) + Neon/PlanetScale (DB) + Cloudflare R2 (storage) | If the project later needs advanced auth features (org-level SSO, fine-grained team invites) that outgrow Supabase Auth. For this v1 (two simple role tiers, no self-signup), Supabase's all-in-one is simpler and avoids stitching 3 services together. |
| Drizzle ORM | Prisma | Choose Prisma if the team prefers Prisma Studio's visual data browser and a gentler schema DSL, and isn't deploying to edge runtimes. Functionally both work fine with Supabase Postgres; Drizzle is the lighter default for new Next.js + Vercel projects in 2026 due to bundle size and faster cold starts on serverless functions. |
| Path-based tenant routing (`/[restaurantSlug]/[unitSlug]`) | Subdomain-based (`restaurante.boamidia.com`) | Subdomains give a more "branded" feel per restaurant but require wildcard DNS/SSL and more complex Vercel domain config. Given the product spec explicitly says "cliente acessa link único do restaurante" with no mention of custom domains, path-based slugs are simpler, work out-of-the-box on Vercel, and are trivially shareable via QR code. Revisit subdomains only if restaurants demand white-label custom domains in a future milestone. |
| shadcn/ui | Material UI / Chakra UI / Mantine | Use a full component library if the team wants a fixed design system out-of-the-box with less customization. shadcn/ui is preferred here because the menu pages need a distinct, brandable look per restaurant (not a generic admin look), and shadcn components are copy-in/editable rather than black-box imports. |
| react-hook-form (selectively) | TanStack Form | TanStack Form is a newer, type-safe alternative gaining traction in 2026, but RHF has the larger ecosystem, more Zod integration examples, and is the safer default choice for a team building its first multi-tenant admin. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Pages Router (`pages/`) | Legacy Next.js routing model. All new patterns (Server Components, Server Actions, streaming, Cache Components) are App Router-only, and Next.js 16 docs/tooling assume App Router. Starting greenfield on Pages Router means missing out on the exact features (Server Actions for CRUD + wa.me generation) that make this stack efficient. | App Router (`app/`) — default with `create-next-app` |
| `@supabase/auth-helpers-nextjs` | Officially deprecated in favor of `@supabase/ssr`. Still findable in older tutorials, but bug fixes/features now only land in `@supabase/ssr`. | `@supabase/ssr` |
| Storing product images as base64/BLOBs in Postgres | Bloats the database, slows queries, and breaks `next/image` optimization. Becomes expensive fast as restaurants upload many product photos. | Supabase Storage bucket + `next/image` with `remotePatterns` pointing at the Storage CDN URL |
| Supabase **legacy API keys** (the old `anon`/`service_role` JWT-style keys for new projects) | Supabase has deprecated legacy API keys in favor of `sb_publishable_xxx` / `sb_secret_xxx` keys (legacy keys being phased out through end of 2026). Starting a brand-new project on legacy keys means an avoidable migration later. | New publishable/secret key format from project creation |
| Tenant identification via subdomain wildcard on Vercel for v1 | Requires wildcard SSL cert + DNS setup that adds deploy complexity not justified by the spec (single shareable link per restaurant, QR-code friendly). | Path-based slugs: `/r/[restaurantSlug]` → unit picker → `/r/[restaurantSlug]/[unitSlug]` |
| Client-side-only role checks (hiding admin UI with CSS/JS based on a role read from `user_metadata`) | `user_metadata` is user-editable and must never be trusted for authorization. A restaurant admin could self-elevate to super-admin if roles live there. | Store role + `restaurant_id` in `app_metadata` (settable only via service role / a Postgres function), enforce with **RLS policies** on every table, and re-check role server-side in Server Actions/middleware — never trust client-rendered state for authorization. |
| Building a custom "order management" system in v1 | Explicitly out of scope per PROJECT.md — adds a persistence layer, status workflow, and notification complexity not needed for the wa.me-based MVP. | Generate the formatted cart text and redirect to `https://wa.me/<unitPhone>?text=<encoded message>` — no DB write needed for the order itself. |
## Stack Patterns by Variant
- Use `@supabase/ssr` + raw `supabase-js` query builder directly, skip Drizzle.
- Because the schema is small enough (5-6 tables) that hand-written `supabase.from(...)` calls with generated types (`supabase gen types typescript`) may be "good enough," reducing one dependency.
- Tradeoff: joins across restaurant → unit → product → availability become more verbose and less type-safe than Drizzle's relational queries. Recommended only if the team is optimizing for fastest possible time-to-first-deploy and is comfortable revisiting this in a later phase.
- Move from a single `image_url` column on `products` to a `product_images` table (product_id, url, sort_order) plus a Supabase Storage folder per product.
- Because the current spec says "fotos dos produtos" (plural) but the core flow only needs one display photo — start with one column, model the join table only if/when the roadmap calls for galleries.
- Add an `orders` + `order_items` table set, and consider Supabase Realtime (built on the same Postgres instance) for live order status updates to restaurant admins.
- Because this is a clean additive change to the schema — the v1 wa.me flow and the future order-persistence flow are not mutually exclusive, so no rework of the chosen stack is needed, only additive tables/migrations.
## Version Compatibility
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| next@16.2.x | react@19.2.x, react-dom@19.2.x | React 19 is required/bundled by `create-next-app` for Next.js 16; do not pin React 18. |
| tailwindcss@4.4.x | @tailwindcss/postcss, shadcn/ui (Tailwind v4 branch) | Tailwind v4 removes `tailwind.config.js` in favor of `@theme` in `globals.css`. Use `npx shadcn@latest init` (current CLI) which detects and configures for Tailwind v4 automatically — do not follow older shadcn tutorials referencing `tailwind.config.js` color tokens. |
| @supabase/ssr@0.12.x | @supabase/supabase-js@2.108.x | `@supabase/ssr` wraps `supabase-js` for cookie-based SSR sessions; keep both updated together, as `@supabase/ssr` pins a compatible `supabase-js` range. |
| drizzle-orm@0.45.x | drizzle-kit (matching minor), `postgres` (postgres.js driver) | For Supabase, connect via the pooled connection string in **Transaction Mode** (port 6543) for app runtime on serverless/Vercel, and **Session Mode** (port 5432) for running `drizzle-kit` migrations — using the wrong mode for migrations can cause prepared-statement errors on PgBouncer. |
| react-hook-form@7.79.x | @hookform/resolvers (zod resolver) + zod@4.x | Zod 4 is a major version; confirm `@hookform/resolvers` version installed supports Zod 4's API (resolvers package ships Zod-version-specific exports). |
## Sources
- npm registry (`npm view <pkg> version`) — verified exact current versions for next (16.2.9), @supabase/supabase-js (2.108.2), @supabase/ssr (0.12.0), tailwindcss (4.4.3), react (19.2.7), zod (4.4.3), react-hook-form (7.79.0), drizzle-orm (0.45.2). HIGH confidence — direct registry query.
- [Next.js Upgrading: Version 16](https://nextjs.org/docs/app/guides/upgrading/version-16) — official docs on Next.js 16 changes (Turbopack default, Cache Components, async request APIs). HIGH confidence.
- [Next.js Latest Version June 2026](https://www.abhs.in/blog/nextjs-current-version-march-2026-stable-release-whats-new) — confirms 16.2.4+ production-ready as of April 2026. MEDIUM confidence (third-party blog, but consistent with npm registry data).
- [Supabase Row Level Security docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS as the standard multi-tenant isolation mechanism. HIGH confidence (official docs).
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — official pattern for storing roles in `app_metadata` and enforcing via RLS/custom access token hooks. HIGH confidence.
- [Supabase RLS Best Practices (makerkit.dev)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — production multi-tenant RLS patterns. MEDIUM confidence (third-party, but aligns with official docs).
- [Drizzle vs Prisma 2026 (Bytebase)](https://www.bytebase.com/blog/drizzle-vs-prisma/) and [makerkit.dev Drizzle vs Prisma](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) — comparison driving the Drizzle recommendation for serverless/Vercel deploys. MEDIUM confidence (multiple independent sources agree).
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) and [shadcn/ui Next.js install docs](https://ui.shadcn.com/docs/installation/next) — confirms Tailwind v4 + React 19 + shadcn CLI compatibility. HIGH confidence (official docs).
- [Subdomain vs path-based multi-tenancy discussion (johnkavanagh.co.uk, dev.to)](https://dev.to/whoffagents/multi-tenant-saas-architecture-in-nextjs-organizations-roles-and-resource-isolation-1n91) — supports path-based routing recommendation for v1. MEDIUM confidence (multiple community sources converge on the same guidance).
- [Best Next.js form library 2026 (splitforms.com)](https://splitforms.com/blog/best-nextjs-form-library-2026) — supports "native useActionState for simple forms, RHF for complex forms" guidance. LOW-MEDIUM confidence (single third-party source, but aligns with React 19 official `useActionState` capabilities).
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
