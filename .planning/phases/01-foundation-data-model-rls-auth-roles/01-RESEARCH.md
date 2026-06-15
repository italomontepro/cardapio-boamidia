# Phase 1: Foundation — Data Model, RLS & Auth Roles - Research

**Researched:** 2026-06-15
**Domain:** Multi-tenant Postgres schema + Row Level Security + Supabase Auth (Next.js 16 App Router, Drizzle ORM)
**Confidence:** HIGH (RLS patterns, @supabase/ssr setup verified against official docs + multiple converging sources); MEDIUM (Drizzle RLS helper API specifics for the pinned 0.45.x version — recommend raw SQL policies as the primary path, with Drizzle helpers as optional sugar)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Modelo de Admins e Papéis**
- **D-01:** Tabela única `admin_users` com coluna `role` (enum: `'super_admin'` | `'restaurant_admin'`) e `restaurant_id` (nullable — NULL para `super_admin`, FK para `restaurants` para `restaurant_admin`).
- **D-02:** RLS lê role/restaurant_id via lookup (subquery) na tabela `admin_users` filtrando por `auth.uid()` — não usar JWT `app_metadata`/custom access token hook nesta fase (menos peças móveis, sem necessidade de refresh de token quando o papel muda).
- **D-03:** Super admin tem acesso total via política RLS que inclui condição `OR role = 'super_admin'` em todas as tabelas — não usar `service_role` key para bypass de RLS. Mantém tudo dentro do fluxo normal do Supabase client.
- **D-04:** Usuários de teste (1 super admin + admins de pelo menos 2 restaurantes diferentes) criados via script de seed versionado no repo (SQL ou Drizzle seed) — reprodutível para validar login e isolamento entre tenants (critério de sucesso #3).

**Convenção de Disponibilidade Padrão (product_availability)**
- **D-05:** Quando não existe registro em `product_availability` para um par produto/unidade, o produto é considerado **DISPONÍVEL** por padrão (ausência de registro = disponível). Esta regra é aplicada na prática na Phase 4, mas o desenho da tabela em Phase 1 deve respeitá-la.
- **D-06:** Tabela `product_availability` é **esparsa** — contém registros apenas para exceções ao padrão (produto marcado indisponível em uma unidade específica). Nenhuma criação automática de linha para cada par produto×unidade.

**Áreas de Login dos Admins**
- **D-08:** Login único em `/admin/login` para os dois papéis, usando Supabase Auth (`@supabase/ssr`). Após autenticar, redireciona com base no `role` lido em `admin_users`: `super_admin` → área de plataforma, `restaurant_admin` → área do restaurante (rotas exatas a critério de Claude — ver Discretion).
- **D-09:** Após login, exibir uma página simples mostrando a sessão atual (usuário logado, role) e os dados que esse admin consegue acessar via RLS — para `super_admin`: lista de todos os restaurantes cadastrados; para `restaurant_admin`: apenas o próprio restaurante. Esta página serve como prova viva do isolamento entre tenants (critério de sucesso #3 da fase) e não precisa ser um dashboard funcional — apenas demonstrar o escopo correto dos dados.
- **D-10:** Logout básico implementado nesta fase: ação que encerra a sessão Supabase e redireciona para `/admin/login`.

**Ferramenta de Schema/Migrations**
- **D-11:** **Drizzle ORM + drizzle-kit** para definir o schema TypeScript e gerenciar migrations contra o Postgres do Supabase. Usar **Session Mode** (porta 5432) para `drizzle-kit` migrations e **Transaction Mode** (porta 6543) para queries em runtime, conforme `.planning/research/STACK.md`.

### Claude's Discretion
- Formato exato da linha em `product_availability` para representar a exceção "indisponível" (ex: presença da linha já significa indisponível, sem coluna extra, vs. coluna `is_available` boolean) — qualquer abordagem que respeite D-05/D-06 é aceitável.
- Rotas exatas pós-login para cada papel (ex: `/admin` para super_admin vs `/painel` ou `/admin/[restaurantSlug]` para restaurant_admin) — desde que distintas, consistentes entre si, e não conflitem com o roteamento path-based do cliente final (`/r/[restaurantSlug]`, já decidido em `.planning/research/STACK.md`).
- Estrutura interna do seed script (SQL puro vs Drizzle seed runner) e nomes/credenciais dos usuários de teste.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Super admin da plataforma pode fazer login em painel próprio | `@supabase/ssr` login Server Action + `admin_users` role lookup + redirect to `/admin` (platform area). See "Architecture Patterns" Pattern 3 and "Code Examples". |
| AUTH-02 | Admin do restaurante pode fazer login em painel próprio, restrito ao seu restaurante | Same login flow, redirect to `/painel` (restaurant area) scoped via RLS using `admin_users.restaurant_id`. See Pattern 1 (RLS policies) and Pattern 3. |
| AUTH-03 | Dados de cada restaurante são isolados entre tenants (admin de um restaurante não acessa dados de outro) | RLS policies on every table using `SECURITY DEFINER` helper functions (`is_super_admin()`, `current_admin_restaurant_id()`) — see "Standard Stack" RLS pattern, "Common Pitfalls" Pitfall 1-2, and seed script for 2+ restaurants to test isolation. |
</phase_requirements>

## Summary

This phase has three intertwined deliverables: (1) a Drizzle-defined Postgres schema for `restaurants`, `units`, `categories`, `products`, `product_availability`, `admin_users` with RLS enabled on every table; (2) RLS policies that resolve `auth.uid()` → role/`restaurant_id` via `admin_users` lookups wrapped in `SECURITY DEFINER` helper functions (to avoid infinite recursion when `admin_users` itself has RLS); and (3) a `/admin/login` page using `@supabase/ssr` that authenticates, looks up the caller's role, and redirects to `/admin` (super_admin) or `/painel` (restaurant_admin), each showing an RLS-scoped data view as proof of isolation.

Drizzle ORM 0.45.x (the version pinned in STACK.md) has RLS primitives (`pgPolicy`, `.enableRLS()`, `crudPolicy`, Supabase role helpers in `drizzle-orm/supabase`) but the ecosystem evidence for these in production with Supabase is thinner and less consistent across Drizzle versions than the raw-SQL approach. The pragmatic, low-risk path for this phase: **define tables/enums/FKs in Drizzle** (source of truth for the schema + drizzle-kit migrations), but **write RLS policies (`ENABLE ROW LEVEL SECURITY`, helper functions, `CREATE POLICY`) as a raw SQL migration** generated via `drizzle-kit generate --custom` or applied as a follow-up SQL file in the same migration folder. This avoids betting the foundational security layer on a less-battle-tested Drizzle API surface while still keeping Drizzle as the schema source of truth per D-11.

For auth, `@supabase/ssr` 0.12.x against Next.js 16 requires the async `cookies()` API (`const cookieStore = await cookies()`) in both the server client factory and middleware. The middleware must call `supabase.auth.getUser()` (or `getClaims()`) on every request to refresh the session — skipping this is a documented source of random logouts. Role resolution for redirect-by-role happens server-side after login: query `admin_users` by the authenticated `auth.uid()` and branch on `role`.

The seed script must use `supabase-js`'s Admin API (`supabase.auth.admin.createUser`) with the **secret/service_role key**, since Supabase Auth users cannot be created via plain SQL `INSERT` into `auth.users` (password hashing, identity records, etc. are managed by GoTrue). This script is the only place in the codebase where the service-role key is used — and only at seed time, not at runtime (consistent with D-03's "no service_role bypass for RLS" since seeding is a setup-time operation, not a request-time bypass).

**Primary recommendation:** Scaffold with `create-next-app@latest` (Next.js 16, Tailwind v4, TS, App Router) → install Supabase/Drizzle/zod stack → define Drizzle schema with enums/FKs for all 6 tables → write a raw SQL migration enabling RLS + `SECURITY DEFINER` helper functions + policies (OR `role = 'super_admin'` pattern) → write a `tsx`-run seed script using `supabase.auth.admin.createUser` + Drizzle inserts into `admin_users` → implement `@supabase/ssr` server/browser clients + middleware with `getUser()` refresh → build `/admin/login` Server Action that authenticates and redirects by role → build minimal `/admin` and `/painel` pages showing RLS-scoped data + logout.

## Project Constraints (from CLAUDE.md)

The project-level `./CLAUDE.md` (`/Users/italomonte/Documents/GitHub/cardapio-boamidia/CLAUDE.md`) contains:

- **GSD Workflow Enforcement:** File-changing work must go through a GSD command (`/gsd:execute-phase` etc.) — not a constraint on the technical implementation itself, but on how this phase's plan should be executed downstream.
- **Stack section** (mirrors `.planning/research/STACK.md`): Next.js 16.2.x, React 19.2.x, TypeScript 5.x, Tailwind 4.x, Supabase (supabase-js 2.108.x, @supabase/ssr 0.12.x), Drizzle ORM 0.45.x + drizzle-kit, zod 4.x, react-hook-form 7.x, shadcn/ui, libphonenumber-js. App Router only (no Pages Router). `@supabase/ssr` only (no `@supabase/auth-helpers-nextjs`). New Supabase publishable/secret key format (not legacy `anon`/`service_role` JWT-style keys — though note: `supabase-js` Admin API and most current docs/tutorials still refer to "service_role key" terminology; the new secret key serves the same purpose).
- **Explicit warning** carried into this phase: never trust client-mutable `user_metadata`/`app_metadata` for authorization — roles must live in a server-side table with RLS (directly aligns with D-01/D-02/D-03).

There is no global user-level CLAUDE.md override applicable here beyond the standard GSD workflow note — the user's global `~/.claude/CLAUDE.md` (RTK tooling preferences) is a personal CLI convenience layer for the operator's own interactive sessions and does not change the technical content of this research or the project's own CLAUDE.md constraints.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.9 (verified via `npm view next version`, 2026-06-15) | Full-stack framework, App Router | Locked in STACK.md; current stable |
| react / react-dom | 19.2.x (bundled by create-next-app for Next 16) | UI runtime | Required by Next 16 |
| @supabase/supabase-js | 2.108.2 (verified) | Postgres/Auth/Storage client | Core data + auth client |
| @supabase/ssr | 0.12.0 (verified) | Cookie-based SSR auth client | Required for App Router auth; replaces deprecated auth-helpers |
| drizzle-orm | 0.45.2 (verified) | Schema definition, typed queries | D-11 locked choice |
| drizzle-kit | 0.31.10 (verified) | Migration generation/execution | D-11 locked choice |
| postgres | latest (postgres.js driver, paired with drizzle-orm 0.45.x) | Postgres driver for Drizzle | Standard pairing per Drizzle docs |
| zod | 4.x | Server Action input validation | Required for login form validation server-side |
| typescript | 5.x | Type safety | Standard |
| tailwindcss | 4.4.x | Styling | Locked in STACK.md |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | latest | Load `.env` for drizzle.config.ts and seed script | drizzle-kit config and `tsx` seed script both need env vars outside Next.js runtime |
| tsx | latest | Run TypeScript seed script directly (`tsx scripts/seed.ts`) | Standard way to run one-off TS scripts (Drizzle migrations, Supabase admin seeding) without compiling |
| shadcn/ui (CLI, no version) | latest | Login form UI, basic layout primitives | Even for the minimal post-login pages, a `Button`/`Card`/`Form` from shadcn keeps styling consistent with later phases |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw SQL migration for RLS policies | Drizzle's `pgPolicy`/`enableRLS`/`crudPolicy` (drizzle-orm/supabase helpers) | Drizzle 0.45.x does support these, and `entities.roles.provider: 'supabase'` in drizzle.config.ts prevents drizzle-kit from trying to manage Supabase's built-in roles (`anon`, `authenticated`, `service_role`, etc.). However, community reports show inconsistencies between `drizzle-kit push` and `drizzle-kit migrate` regarding whether RLS policies are actually applied (see drizzle-orm issue #3504), and SQL-level functions (`SECURITY DEFINER` helpers) aren't expressible via `pgPolicy` at all — they need raw SQL regardless. Given Phase 1's RLS correctness is the single highest-priority item per PITFALLS.md, raw SQL for policies + helper functions removes a layer of "does the ORM actually emit what I expect" risk. Drizzle schema (tables/enums/FKs) stays the source of truth; policies are a `.sql` migration alongside it. |
| `supabase.auth.admin.createUser` (service/secret key) for seed users | Direct SQL `INSERT INTO auth.users` | Inserting directly into `auth.users` requires manually constructing password hashes (bcrypt via `crypt()`/`gen_salt()` extensions), `instance_id`, `aud`, `role`, `confirmation_token`, and corresponding `auth.identities` rows — fragile and Supabase-version-dependent. The Admin API is the documented, supported path and is what `supabase.auth.admin.createUser({ email, password, email_confirm: true })` is designed for. |

**Installation:**
```bash
# Scaffold (run from repo root, target current directory)
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Core data/auth
npm install @supabase/supabase-js @supabase/ssr drizzle-orm postgres

# Validation
npm install zod

# UI components
npx shadcn@latest init
npx shadcn@latest add button input label card form

# Dev dependencies
npm install -D drizzle-kit tsx dotenv
```

**Version verification:** Verified 2026-06-15 against npm registry:
- `next` → 16.2.9
- `drizzle-orm` → 0.45.2
- `drizzle-kit` → 0.31.10
- `@supabase/ssr` → 0.12.0

These match `.planning/research/STACK.md` (already verified there). No drift detected.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx              # Single login page for both roles (D-08)
│   │   ├── page.tsx                  # super_admin landing: list of all restaurants (D-09)
│   │   └── layout.tsx                # Auth guard: require role === 'super_admin'
│   ├── painel/
│   │   ├── page.tsx                  # restaurant_admin landing: own restaurant only (D-09)
│   │   └── layout.tsx                # Auth guard: require role === 'restaurant_admin'
│   └── layout.tsx
├── db/
│   ├── schema.ts                     # Drizzle schema: all 6 tables + enums + relations
│   ├── index.ts                      # Drizzle client (postgres.js, transaction-mode URL)
│   └── migrations/                   # drizzle-kit generated migrations + raw SQL RLS policy migration
├── lib/
│   ├── supabase/
│   │   ├── server.ts                 # createServerClient (Server Components/Actions)
│   │   ├── client.ts                 # createBrowserClient (if needed)
│   │   └── middleware.ts             # updateSession() helper
│   └── auth/
│       ├── actions.ts                # login/logout Server Actions
│       └── session.ts                # getCurrentAdmin() — resolves auth.uid() -> admin_users row
├── middleware.ts                     # calls updateSession(), protects /admin/* and /painel/*
└── scripts/
    └── seed.ts                       # tsx-run: creates auth users + admin_users + restaurants
```

### Pattern 1: RLS via `admin_users` lookup wrapped in SECURITY DEFINER helper functions

**What:** Two `SECURITY DEFINER STABLE` SQL functions resolve the caller's identity without triggering RLS recursion on `admin_users`:
- `is_super_admin()` → boolean
- `current_admin_restaurant_id()` → uuid (the restaurant_id of the calling restaurant_admin, or NULL)

Every tenant table's policy is then: `USING (is_super_admin() OR restaurant_id = current_admin_restaurant_id())` (directly or via a join path for tables without a direct `restaurant_id`, e.g. `products` joining through `categories`).

**When to use:** Every table in the hierarchy: `restaurants`, `units`, `categories`, `products`, `product_availability`, `admin_users` itself.

**Critical implementation detail (verified across multiple sources):** Use `LANGUAGE plpgsql` (not `LANGUAGE sql`) for these helper functions if they query `admin_users` (which itself has RLS enabled). Postgres can **inline** simple `LANGUAGE sql` functions during query planning; when inlined, the `SECURITY DEFINER` privilege escalation is lost and the inner query against `admin_users` is evaluated under the *caller's* RLS context again — causing infinite recursion (the function calls itself indirectly via the policy it's used in). `plpgsql` functions are never inlined, so the `SECURITY DEFINER` boundary holds. [Source: dev.to "Infinite recursion in Postgres RLS: a SECURITY DEFINER gotcha", cross-referenced with GitHub supabase/supabase discussion #1138 — MEDIUM-HIGH confidence, consistent with official Supabase RLS docs guidance to use helper functions for "auth admin" style lookups.]

**Example:**
```sql
-- Source: pattern verified against supabase/supabase discussion #1138,
-- dev.to "Infinite recursion in Postgres RLS: a SECURITY DEFINER gotcha",
-- and ARCHITECTURE.md Pattern 1 (is_super_admin())

-- 1. Enum for admin role
create type admin_role as enum ('super_admin', 'restaurant_admin');

-- 2. admin_users table (D-01)
create table admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role admin_role not null,
  restaurant_id uuid references restaurants(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- super_admin must have NULL restaurant_id; restaurant_admin must have a restaurant_id
  constraint admin_users_role_restaurant_chk check (
    (role = 'super_admin' and restaurant_id is null)
    or (role = 'restaurant_admin' and restaurant_id is not null)
  ),
  unique (user_id) -- one admin_users row per auth user (sufficient for this phase)
);

alter table admin_users enable row level security;

-- 3. Helper functions — MUST be plpgsql to avoid inlining + recursion
create or replace function is_super_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return exists (
    select 1 from admin_users
    where user_id = (select auth.uid())
      and role = 'super_admin'
  );
end;
$$;

create or replace function current_admin_restaurant_id()
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  rid uuid;
begin
  select restaurant_id into rid
  from admin_users
  where user_id = (select auth.uid())
    and role = 'restaurant_admin';
  return rid;
end;
$$;

-- 4. admin_users RLS: admins can read their own row; super_admin can read all
create policy "admins read own row or super_admin reads all"
on admin_users for select
using (
  user_id = (select auth.uid())
  or is_super_admin()
);

-- 5. restaurants RLS (D-03 pattern: OR role = 'super_admin')
alter table restaurants enable row level security;

create policy "super_admin full access, restaurant_admin reads own restaurant"
on restaurants for select
using (
  is_super_admin()
  or id = current_admin_restaurant_id()
);

create policy "only super_admin manages restaurants"
on restaurants for all
using (is_super_admin())
with check (is_super_admin());

-- 6. units (direct restaurant_id FK)
alter table units enable row level security;

create policy "scoped to own restaurant or super_admin"
on units for all
using (
  is_super_admin()
  or restaurant_id = current_admin_restaurant_id()
)
with check (
  is_super_admin()
  or restaurant_id = current_admin_restaurant_id()
);

-- 7. categories (direct restaurant_id FK)
alter table categories enable row level security;

create policy "scoped to own restaurant or super_admin"
on categories for all
using (
  is_super_admin()
  or restaurant_id = current_admin_restaurant_id()
)
with check (
  is_super_admin()
  or restaurant_id = current_admin_restaurant_id()
);

-- 8. products (direct restaurant_id FK — recommended over joining through categories,
--    see "Architecture Patterns" rationale below)
alter table products enable row level security;

create policy "scoped to own restaurant or super_admin"
on products for all
using (
  is_super_admin()
  or restaurant_id = current_admin_restaurant_id()
)
with check (
  is_super_admin()
  or restaurant_id = current_admin_restaurant_id()
);

-- 9. product_availability (no direct restaurant_id — resolve via products join)
alter table product_availability enable row level security;

create policy "scoped via product's restaurant or super_admin"
on product_availability for all
using (
  is_super_admin()
  or exists (
    select 1 from products p
    where p.id = product_availability.product_id
      and p.restaurant_id = current_admin_restaurant_id()
  )
)
with check (
  is_super_admin()
  or exists (
    select 1 from products p
    where p.id = product_availability.product_id
      and p.restaurant_id = current_admin_restaurant_id()
  )
);
```

**Rationale — give `products` (and `units`, `categories`) a direct `restaurant_id` column rather than only deriving it via joins:** Even though `products` could theoretically derive its tenant via `categories.restaurant_id`, a direct `restaurant_id` FK on every tenant-owned table is strongly recommended by ARCHITECTURE.md Pattern 1 and PITFALLS.md Pitfall 2 — it keeps every policy a flat comparison (`restaurant_id = current_admin_restaurant_id()`), avoids deep join chains in `USING` clauses (which are harder to reason about and to index), and means each table's isolation can be tested independently. `product_availability` is the one table where a join-based policy is unavoidable (it has no restaurant concept of its own — it's keyed by `product_id` + `unit_id`), so its policy goes through `products`.

### Pattern 2: Performance — wrap `auth.uid()` calls and index FK columns

**What:** Always write `(select auth.uid())` inside policy expressions (as shown above), never bare `auth.uid()`. Postgres's query planner can cache the result of a `select`-wrapped function call as an "initPlan" evaluated once per query, while a bare function call may be re-evaluated per row.

**When to use:** Inside every helper function and every policy that references `auth.uid()`.

**Additionally:** Add indexes on every FK column referenced inside RLS `USING`/`WITH CHECK`:
```sql
create index idx_admin_users_user_id on admin_users(user_id);
create index idx_units_restaurant_id on units(restaurant_id);
create index idx_categories_restaurant_id on categories(restaurant_id);
create index idx_products_restaurant_id on products(restaurant_id);
create index idx_product_availability_product_id on product_availability(product_id);
create index idx_product_availability_unit_id on product_availability(unit_id);
```

[Source: PITFALLS.md Performance Traps table, cross-referenced with Supabase official RLS performance guidance — HIGH confidence.]

### Pattern 3: @supabase/ssr setup for Next.js 16 (async cookies)

**What:** Three files — `lib/supabase/server.ts` (Server Components/Actions), `lib/supabase/client.ts` (browser, optional for this phase since login is a Server Action), and `lib/supabase/middleware.ts` (`updateSession`) called from root `middleware.ts`.

**Critical Next.js 16 detail:** `cookies()` from `next/headers` is async — `await cookies()` is required. This has been the case since Next.js 15 and remains in 16.

**Example:**
```typescript
// src/lib/supabase/server.ts
// Source: pattern verified against Supabase official SSR docs
// (supabase.com/docs/guides/auth/server-side/creating-a-client) +
// ryankatayi.com Next.js Supabase SSR setup (2026) — both confirm
// `await cookies()` for Next.js App Router.
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — ignore.
            // Middleware refreshes the session and persists cookies instead.
          }
        },
      },
    }
  )
}
```

```typescript
// src/lib/supabase/middleware.ts
// Source: pattern verified against Supabase official SSR docs (updateSession)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() refreshes the session — do not skip this.
  const { data: { user } } = await supabase.auth.getUser()

  // Route protection for /admin/* and /painel/*
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isPainelRoute = request.nextUrl.pathname.startsWith('/painel')
  const isLoginRoute = request.nextUrl.pathname === '/admin/login'

  if (!user && (isAdminRoute || isPainelRoute) && !isLoginRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

```typescript
// middleware.ts (project root)
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

[Sources: Supabase official docs `supabase.com/docs/guides/auth/server-side/nextjs` and `creating-a-client` (HIGH — official, though exact code blocks required cross-referencing a secondary source); ryankatayi.com Next.js + Supabase SSR setup 2026 (MEDIUM — confirms async cookies pattern and file structure, consistent with official docs description).]

### Pattern 4: Login Server Action + role-based redirect

**What:** A single Server Action handles sign-in for both roles. After `signInWithPassword`, it queries `admin_users` for the authenticated user's row and redirects based on `role`.

**Example:**
```typescript
// src/lib/auth/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { adminUsers } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    redirect('/admin/login?error=invalid_credentials')
  }

  // Role lookup — via Drizzle (runtime/transaction-mode connection) or supabase.from()
  const [adminRow] = await db
    .select({ role: adminUsers.role })
    .from(adminUsers)
    .where(eq(adminUsers.userId, data.user.id))
    .limit(1)

  if (!adminRow) {
    // Authenticated but not an admin — sign out and reject
    await supabase.auth.signOut()
    redirect('/admin/login?error=not_an_admin')
  }

  redirect(adminRow.role === 'super_admin' ? '/admin' : '/painel')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
```

**Note on Drizzle vs supabase-js for the role lookup:** Either works here since RLS allows the row to be read (the "admins read own row" policy from Pattern 1). Using Drizzle keeps a single typed query layer; using `supabase.from('admin_users').select('role').single()` via the SSR client avoids opening a second DB connection pool inside a Server Action. Both are valid — pick one and use it consistently. For Next.js on Vercel (serverless), prefer the `supabase-js` client for simple single-row reads inside Server Actions/Components to avoid connection-pool exhaustion from Drizzle's `postgres.js` pool being instantiated per invocation; reserve Drizzle for more complex relational queries (Phase 2+).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing / auth user storage | Custom `auth.users`-equivalent table + bcrypt | Supabase Auth (`auth.users`, `supabase.auth.signInWithPassword`, `supabase.auth.admin.createUser`) | GoTrue (Supabase's auth server) handles password hashing, session/refresh tokens, email confirmation flags, and `auth.identities`. Re-implementing this is a massive security surface for zero benefit — already part of the chosen stack. |
| Role/tenant resolution logic duplicated in every policy | Inlining `select restaurant_id from admin_users where user_id = auth.uid() and role = 'restaurant_admin'` in every `CREATE POLICY` | `SECURITY DEFINER` helper functions (`is_super_admin()`, `current_admin_restaurant_id()`) | DRY, and critically — gets the recursion-avoidance (`plpgsql`, not `sql`) right in exactly one place instead of N times across 6 tables. |
| Session refresh / cookie sync between client and server | Manual JWT decode + cookie set logic | `@supabase/ssr`'s `createServerClient` + `updateSession` middleware pattern | This is the officially documented, maintained pattern; hand-rolling cookie sync against Next.js's SSR/RSC boundaries is exactly the class of bug `@supabase/ssr` exists to prevent (the deprecated `auth-helpers-nextjs` had recurring issues here). |
| Seed-time Auth user creation | Direct `INSERT INTO auth.users (...)` with manually-crafted password hash | `supabase.auth.admin.createUser({ email, password, email_confirm: true })` via the Admin API (secret key) | `auth.users` has many interdependent columns and a companion `auth.identities` table; the schema is internal to GoTrue and can change between Supabase platform versions. The Admin API is the stable, documented contract. |

**Key insight:** Everything in this phase that touches "who is this user and what can they see" should go through either (a) Supabase Auth's own APIs, or (b) RLS policies backed by `SECURITY DEFINER` helper functions — never custom application-layer auth logic or ad-hoc SQL against `auth.*` schema tables.

## Common Pitfalls

### Pitfall 1: RLS infinite recursion when `admin_users` policy queries `admin_users`

**What goes wrong:** A policy on `admin_users` like `using (exists (select 1 from admin_users where user_id = auth.uid() and role = 'super_admin'))` causes Postgres to recursively re-apply the same policy while evaluating the subquery, eventually erroring with "infinite recursion detected in policy".

**Why it happens:** RLS policies apply to *every* access of a table, including accesses from within other policies on the same table (or from `SECURITY DEFINER` functions written as `LANGUAGE sql`, which get inlined and lose their definer context).

**How to avoid:** Use `SECURITY DEFINER` helper functions written in `LANGUAGE plpgsql` (not `LANGUAGE sql`) — plpgsql functions are never inlined by the planner, so the function body executes with the *function owner's* privileges (bypassing RLS on `admin_users` inside the function), while the calling policy still applies RLS normally to the outer query. This is the exact pattern in "Architecture Patterns" Pattern 1 above.

**Warning signs:** Postgres error `42P17: infinite recursion detected in policy for relation "admin_users"`; queries against `admin_users` (or any table whose policy calls a helper that queries `admin_users`) hang or error immediately after enabling RLS.

[Sources: GitHub supabase/supabase Discussion #1138 (community, MEDIUM-HIGH — directly addresses this exact scenario with Supabase's `auth.users`-adjacent pattern); dev.to "Infinite recursion in Postgres RLS: a SECURITY DEFINER gotcha" (2026, MEDIUM — explains the `plpgsql` vs `sql` inlining mechanism specifically); consistent with official Supabase RLS docs' recommendation to use helper functions for role checks.]

### Pitfall 2: Tables created without RLS enabled (default-open)

**What goes wrong:** Every new Postgres table on Supabase has RLS **disabled** by default. Any table created via `drizzle-kit generate`/`migrate` without an explicit `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is fully readable/writable via the anon/publishable key by anyone.

**Why it happens:** Drizzle's default `pgTable()` does not enable RLS unless you explicitly call `.enableRLS()` (in versions that support it) or add it via raw SQL. Developers testing locally often use a connection that bypasses RLS (Session Mode / direct Postgres connection used for migrations has superuser-like privileges), so "it works" in dev tooling even when RLS is off.

**How to avoid:** Make `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;` a non-skippable line in the RLS migration for every one of the 6 tables (`restaurants`, `units`, `categories`, `products`, `product_availability`, `admin_users`). As a verification step at the end of this phase, run:
```sql
select relname, relrowsecurity
from pg_class
where relkind = 'r' and relnamespace = 'public'::regnamespace;
```
All 6 tables must show `relrowsecurity = true`.

**Warning signs:** A query against any of these tables using the publishable (anon) key — with no authenticated session — returns rows instead of an empty result / permission error.

[Source: PITFALLS.md Pitfall 1, citing CVE-2025-48757 — HIGH confidence, official-incident-backed.]

### Pitfall 3: PgBouncer transaction-mode (port 6543) used for drizzle-kit migrations

**What goes wrong:** `drizzle-kit generate`/`migrate` issues DDL and relies on session-level features (prepared statements, advisory locks for migration tracking) that don't work correctly through PgBouncer's **transaction mode** pooler (port 6543). Running migrations against the transaction-mode connection string can fail with prepared-statement errors or behave inconsistently.

**Why it happens:** Supabase exposes both a Session Mode (port 5432, direct/session pooled) and Transaction Mode (port 6543, PgBouncer transaction pooling) connection string from the same dashboard screen, and it's easy to copy the wrong one — especially since the transaction-mode string is often presented first/as "recommended for serverless."

**How to avoid:** Use **two separate connection strings** in env vars:
- `DATABASE_URL` (Session Mode, port 5432) — used only by `drizzle.config.ts` for `drizzle-kit generate`/`migrate`/`push`.
- `DATABASE_URL_RUNTIME` or similar (Transaction Mode, port 6543) — used by the app's Drizzle client (`src/db/index.ts`) at request time on Vercel.

This matches D-11 exactly. Document both env vars in `.env.example` with comments clarifying which is which.

**Warning signs:** `drizzle-kit migrate` errors mentioning "prepared statement already exists" or migration tracking table (`__drizzle_migrations` or similar) not being created/updated correctly.

[Source: STACK.md Version Compatibility table (drizzle-orm@0.45.x row) — MEDIUM confidence, consistent with widely-documented Supabase pooler mode guidance.]

### Pitfall 4: Forgetting `await cookies()` / using the old sync cookies API

**What goes wrong:** Code copied from pre-Next.js-15 Supabase tutorials calls `cookies()` synchronously (`const cookieStore = cookies()`). In Next.js 15+ (including 16), `cookies()` returns a `Promise` — calling it synchronously either throws a type error (TS) or, if accidentally allowed through, returns a Promise object where a cookie store is expected, breaking auth entirely.

**How to avoid:** Always `await cookies()` in `lib/supabase/server.ts`'s client factory function (the factory function itself must be `async`, and every call site must `await createClient()`).

**Warning signs:** TypeScript errors on `cookieStore.getAll()` / `cookieStore.set()` ("Property does not exist on type Promise<...>"), or — if using `any` types loosely — silent auth failures where `supabase.auth.getUser()` always returns `null`.

[Source: ryankatayi.com Next.js + Supabase SSR setup (2026) — explicitly confirms `await cookies()` for current Next.js App Router; consistent with Next.js 15/16 official async-APIs migration docs referenced in STACK.md.]

### Pitfall 5: Seed script accidentally exposing the secret/service-role key

**What goes wrong:** The seed script (D-04) needs `supabase.auth.admin.createUser`, which requires the secret/service-role key — the most powerful credential in the project (full RLS bypass). If this key ends up in a file that's imported by Next.js app code (even transitively) or committed to git, it's a critical leak.

**How to avoid:**
- Store the secret key as `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) in `.env` (gitignored), never `NEXT_PUBLIC_*`.
- The seed script (`scripts/seed.ts`) is a standalone script run via `tsx`, not part of the Next.js build — keep it outside `src/app` and `src/lib` (which could be imported by app code), e.g. in a top-level `scripts/` directory.
- Double-check `.gitignore` includes `.env`, `.env.local` before this phase's first commit.

[Source: Supabase official Admin API docs — "This function should only be called on a server and you should never expose your service_role key in the browser" — HIGH confidence, official.]

## Code Examples

### drizzle.config.ts

```typescript
// Source: pattern verified against orm.drizzle.team/docs/tutorials/drizzle-with-supabase
// + STACK.md pooler-mode guidance (Session Mode for migrations)
import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'

config({ path: '.env' })

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Session Mode (port 5432) — required for drizzle-kit generate/migrate
    url: process.env.DATABASE_URL!,
  },
  // Prevents drizzle-kit from trying to manage Supabase's built-in roles
  // (anon, authenticated, service_role, supabase_auth_admin, etc.)
  entities: {
    roles: {
      provider: 'supabase',
    },
  },
})
```

### Drizzle schema excerpt (enums, FKs, hierarchy)

```typescript
// src/db/schema.ts
// Source: pattern combines drizzle-orm/pg-core docs conventions with
// the locked D-01/D-05/D-06 decisions from CONTEXT.md
import {
  pgTable, pgEnum, uuid, text, boolean, timestamp, integer, numeric, unique,
} from 'drizzle-orm/pg-core'

export const adminRoleEnum = pgEnum('admin_role', ['super_admin', 'restaurant_admin'])

export const restaurants = pgTable('restaurants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(), // references auth.users(id) — set via raw SQL FK (auth schema not in Drizzle schema)
  role: adminRoleEnum('role').notNull(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const units = pgTable('units', {
  id: uuid('id').primaryKey().defaultRandom(),
  restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  whatsappNumber: text('whatsapp_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('units_restaurant_slug_unique').on(table.restaurantId, table.slug),
])

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  restaurantId: uuid('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Sparse table per D-05/D-06: a row's mere existence = "unavailable" exception.
// (Discretion: chosen to avoid an extra boolean column — presence = unavailable,
// absence = available by default. Document this convention prominently in the schema file.)
export const productAvailability = pgTable('product_availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  unitId: uuid('unit_id').notNull().references(() => units.id, { onDelete: 'cascade' }),
  // Row existing in this table means: product is marked UNAVAILABLE at this unit.
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('product_availability_product_unit_unique').on(table.productId, table.unitId),
])
```

**Note on `admin_users.user_id` → `auth.users(id)` FK:** Drizzle schema files typically don't model Supabase's `auth` schema tables (they're managed by GoTrue, not your migrations). The FK constraint to `auth.users(id)` should be added via raw SQL in the same migration that creates `admin_users` (Drizzle can define the column as `uuid().notNull().unique()` without a `.references()` call, and the SQL migration adds `ALTER TABLE admin_users ADD CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;`). This is a common, documented pattern when using Drizzle with Supabase.

### Seed script (D-04)

```typescript
// scripts/seed.ts — run with: tsx scripts/seed.ts
// Source: pattern per Supabase official Admin API docs
// (supabase.com/docs/reference/javascript/auth-admin-createuser)
import { createClient } from '@supabase/supabase-js'
import { db } from '../src/db'
import { restaurants, adminUsers, units, categories, products } from '../src/db/schema'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!, // service_role / secret key — server-only, never NEXT_PUBLIC_
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function createAdminUser(email: string, password: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email confirmation flow for seeded test users
  })
  if (error) throw error
  return data.user
}

async function main() {
  // 1. Super admin
  const superAdminUser = await createAdminUser('super@boamidia.dev', 'changeme123')
  await db.insert(adminUsers).values({
    userId: superAdminUser.id,
    role: 'super_admin',
    restaurantId: null,
  })

  // 2. Restaurant 1 + its admin
  const [r1] = await db.insert(restaurants).values({
    name: 'Pizzaria do João', slug: 'pizzaria-do-joao',
  }).returning()

  const r1Admin = await createAdminUser('admin@pizzaria-do-joao.dev', 'changeme123')
  await db.insert(adminUsers).values({
    userId: r1Admin.id, role: 'restaurant_admin', restaurantId: r1.id,
  })

  // 3. Restaurant 2 + its admin (for isolation testing — D-04, success criterion #3)
  const [r2] = await db.insert(restaurants).values({
    name: 'Hamburgueria Central', slug: 'hamburgueria-central',
  }).returning()

  const r2Admin = await createAdminUser('admin@hamburgueria-central.dev', 'changeme123')
  await db.insert(adminUsers).values({
    userId: r2Admin.id, role: 'restaurant_admin', restaurantId: r2.id,
  })

  console.log('Seed complete:', { r1: r1.slug, r2: r2.slug })
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | Deprecated, now in maintenance-only mode for ~2 years as of 2026 | Any tutorial/example using `createServerComponentClient`, `createMiddlewareClient` from `auth-helpers-nextjs` is outdated — use `createServerClient`/`createBrowserClient` from `@supabase/ssr` |
| Sync `cookies()` from `next/headers` | Async `cookies()` (`await cookies()`) | Next.js 15 (continues in 16) | All Supabase server client factories must be `async` functions |
| Roles in JWT `app_metadata` / custom access token hooks | `admin_users` table lookup via `SECURITY DEFINER` functions (D-02) | This is the locked decision for this phase, diverging from some "current best practice" articles that favor custom claims for performance | Custom claims avoid a DB round-trip per RLS check but require a token-refresh step whenever role changes; D-02 explicitly trades that complexity away. Performance is mitigated via `(select auth.uid())` caching + FK indexes (Pattern 2). |
| Legacy `anon`/`service_role` JWT-style API keys | New `sb_publishable_xxx` / `sb_secret_xxx` key format | Supabase platform-wide key rotation, phasing out through end of 2026 | New projects should use the new key format from creation; `supabase-js` Admin API and most docs still use "service_role key" terminology to refer to the secret-key-equivalent capability. |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs` — do not use, per STACK.md "What NOT to Use".
- Storing role/tenant in `user_metadata`/`app_metadata` and trusting it client-side — explicitly the anti-pattern this phase's RLS design avoids (D-02, D-03).

## Open Questions

1. **Drizzle RLS helper API (`pgPolicy`, `.enableRLS()`, `entities.roles.provider`) — exact behavior on drizzle-orm 0.45.2 / drizzle-kit 0.31.10**
   - What we know: These APIs exist in Drizzle's RLS documentation and are referenced in community articles as of early-to-mid 2026. The `entities.roles.provider: 'supabase'` config exists to prevent drizzle-kit from managing Supabase's system roles.
   - What's unclear: Whether `drizzle-kit generate` reliably emits `CREATE POLICY`/`ENABLE ROW LEVEL SECURITY` statements for the *specific* 0.45.2/0.31.10 version pair pinned in this project, and whether `SECURITY DEFINER` helper functions (which Drizzle has no first-class representation for) can coexist cleanly in the same migration as Drizzle-managed policies.
   - Recommendation: Don't block on this. Use Drizzle purely for table/enum/FK schema (well-supported, no ambiguity), and write RLS (`ENABLE ROW LEVEL SECURITY`, helper functions, `CREATE POLICY`) as a hand-written raw SQL migration file placed in the same `src/db/migrations/` directory (drizzle-kit supports custom/raw SQL migrations via `drizzle-kit generate --custom` to scaffold an empty migration file, or by hand-numbering a `.sql` file consistently with drizzle-kit's journal). The planner should size a dedicated task for "write and apply RLS policy migration as raw SQL" separate from "define Drizzle schema and generate initial migration."

2. **Where does the runtime Drizzle client live, and is it even needed for Phase 1's minimal pages?**
   - What we know: D-11 specifies Drizzle for schema/migrations with Transaction Mode for runtime. Pattern 4 above notes that simple single-row reads (the role lookup) might be better served by `supabase-js` directly to avoid connection-pool concerns in serverless Server Actions.
   - What's unclear: Whether Phase 1's minimal "session info + RLS-scoped data" page needs a runtime Drizzle client at all, or whether `supabase.from(...)` via the SSR client suffices for everything in this phase (Drizzle's runtime client becomes more valuable starting Phase 2+ with real CRUD/joins).
   - Recommendation: Planner's discretion — either is acceptable for Phase 1. If a runtime Drizzle client is set up now, ensure it explicitly uses the Transaction Mode (6543) connection string and is instantiated in a way safe for serverless (e.g., a module-level singleton, not per-request `new`).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js, drizzle-kit, tsx, npm | ✓ | v20.13.1 | — |
| npm | Package management | ✓ | 10.5.2 | — |
| npx | create-next-app, shadcn CLI | ✓ | available | — |
| psql | Manual DB inspection/verification (optional) | ✓ | 14.17 (Homebrew) | Supabase SQL editor (dashboard) works equally well for running verification queries |
| Supabase CLI | Local Supabase dev, type generation (optional, not required by D-11) | ✗ | — | Not required — D-11 uses Drizzle for schema/migrations; Supabase project is a hosted/cloud instance. If local Supabase emulation becomes desired later, `brew install supabase/tap/supabase` |
| Supabase project (cloud) | Database, Auth, env vars (`NEXT_PUBLIC_SUPABASE_URL`, keys, `DATABASE_URL`) | Unknown — must be created/confirmed before this phase starts | — | Blocking if not yet provisioned: the planner's Wave 0 should include "confirm/create Supabase project and obtain connection strings + keys" as an explicit task, since no `.env` exists yet in this greenfield repo |

**Missing dependencies with no fallback:**
- A live Supabase project with connection strings (Session Mode + Transaction Mode URLs) and API keys (publishable + secret) must exist before migrations or the seed script can run. This is not a tooling gap but a setup/provisioning step — the plan must include it as an early task (likely Wave 0), since `.planning/` contains no evidence a Supabase project has been created yet.

**Missing dependencies with fallback:**
- Supabase CLI absent — not required for this phase's chosen approach (Drizzle-driven migrations against a hosted Supabase Postgres instance); only needed if local Supabase emulation or `supabase gen types` cross-checking is desired (optional, per STACK.md).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — greenfield repo, no test framework configured yet |
| Config file | none — see Wave 0 |
| Quick run command | TBD (see Wave 0 Gaps) |
| Full suite command | TBD (see Wave 0 Gaps) |

This phase's success criteria are fundamentally about **database state and HTTP/session behavior** (RLS enforcement, login redirects, cross-tenant isolation) rather than pure unit-testable logic. Given the project is greenfield with zero existing test infrastructure, and the highest-value verification for RLS correctness is **direct SQL-level testing against the live Supabase Postgres instance** (querying as different roles/users), the recommended approach favors:

1. **SQL-based RLS verification scripts** — runnable via `psql` (available) or the Supabase SQL editor, using `SET ROLE`/`SET request.jwt.claims` (or, more simply, testing via the seeded auth users' actual sessions through `supabase-js`) to confirm policy behavior per table.
2. **A lightweight integration test script** (Node/tsx, not a full test framework) that logs in as each seeded admin via `supabase-js` and asserts the expected scoped results — this directly operationalizes success criteria #1-3.

A full Jest/Vitest/Playwright setup is likely overkill for Phase 1 alone but the planner should consider whether to introduce a minimal test runner now (e.g., `vitest` for the integration script) since later phases (2-6) will have substantially more testable CRUD logic and the public menu/cart logic (Pitfalls 6-8 in PITFALLS.md) genuinely benefit from automated tests.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Super admin logs in, lands on `/admin` showing all restaurants | integration (script) | `tsx scripts/verify-auth.ts --as=super_admin` | ❌ Wave 0 |
| AUTH-02 | Restaurant admin logs in, lands on `/painel` showing only own restaurant | integration (script) | `tsx scripts/verify-auth.ts --as=restaurant_admin_1` | ❌ Wave 0 |
| AUTH-03 | Restaurant A admin querying Restaurant B's data returns zero rows | integration (script) + SQL | `tsx scripts/verify-auth.ts --as=restaurant_admin_1 --query=restaurant_b_data` | ❌ Wave 0 |
| (schema/RLS) | All 6 tables have `relrowsecurity = true` | SQL check | `psql "$DATABASE_URL" -c "select relname, relrowsecurity from pg_class where relkind='r' and relnamespace='public'::regnamespace;"` | ✅ (psql available; no file needed — ad-hoc query) |

### Sampling Rate

- **Per task commit:** For schema/migration tasks, run `drizzle-kit generate` (dry validation) + the `pg_class.relrowsecurity` SQL check. For auth tasks, manually exercise `/admin/login` with each seeded user.
- **Per wave merge:** Run the full `tsx scripts/verify-auth.ts` suite (all three seeded users × expected scoped results) plus the RLS-enabled check.
- **Phase gate:** All three success criteria (super admin login + scoped view, restaurant admin login + scoped view, cross-tenant query returns nothing) must pass via the verification script before `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] `scripts/verify-auth.ts` — covers AUTH-01, AUTH-02, AUTH-03 (logs in as each seeded user via `supabase-js`, asserts RLS-scoped query results)
- [ ] `scripts/seed.ts` — creates the 1 super_admin + 2 restaurant_admins + 2 restaurants required for AUTH-03's isolation test (D-04)
- [ ] `.env` / `.env.example` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable key), `SUPABASE_SECRET_KEY`, `DATABASE_URL` (session mode, 5432), `DATABASE_URL_RUNTIME` (transaction mode, 6543) — none of these exist yet (greenfield)
- [ ] Confirm Supabase project exists/is created — prerequisite for all of the above; not a code task but must be sequenced first

*(No existing test infrastructure to extend — this is a from-scratch setup.)*

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view next/drizzle-orm/drizzle-kit/@supabase/ssr version`) — exact versions verified 2026-06-15, matches STACK.md
- [Supabase Row Level Security docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS fundamentals, `(select auth.uid())` caching guidance
- [Supabase Auth Admin API docs — createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser) — seed script pattern, secret key handling
- [Supabase server-side auth docs (creating-a-client, nextjs)](https://supabase.com/docs/guides/auth/server-side/nextjs) — official `@supabase/ssr` setup description (cross-referenced with secondary source for exact code)

### Secondary (MEDIUM confidence)
- [Infinite recursion in Postgres RLS: a SECURITY DEFINER gotcha (dev.to, 2026)](https://dev.to/bairescodeai/infinite-recursion-in-postgres-rls-a-security-definer-gotcha-1916) — `plpgsql` vs `sql` inlining mechanism for SECURITY DEFINER helper functions
- [GitHub supabase/supabase Discussion #1138](https://github.com/orgs/supabase/discussions/1138) — community-verified infinite recursion scenario and SECURITY DEFINER fix, directly analogous to `admin_users` self-referencing policy
- [Drizzle ORM RLS docs](https://orm.drizzle.team/docs/rls) — `pgPolicy`, `enableRLS`, `crudPolicy`, `entities.roles.provider: 'supabase'`
- [Drizzle + Supabase tutorial](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase) — `drizzle.config.ts` shape, session vs transaction pooling note
- [Server-Side Auth in Next.js with Supabase: My Setup (ryankatayi.com, 2026)](https://www.ryankatayi.com/blog/server-side-auth-in-next-js-with-supabase-my-setup) — concrete `server.ts`/`client.ts`/`middleware.ts` code with confirmed async `cookies()` usage
- [rphlmr/drizzle-supabase-rls (GitHub)](https://github.com/rphlmr/drizzle-supabase-rls) — example of `pgPolicy` + `authenticatedRole` + custom RLS-aware Drizzle client pattern (illustrates the API surface exists, though this project's approach favors raw SQL for policies per Open Question 1)

### Tertiary (LOW confidence)
- None used as load-bearing — all findings above were corroborated by at least 2 sources or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified directly against npm registry, matches already-confirmed STACK.md
- Architecture (RLS policy patterns, helper functions): HIGH — pattern corroborated across official Supabase RLS docs, ARCHITECTURE.md, PITFALLS.md, and independent community sources on the SECURITY DEFINER recursion fix
- Architecture (@supabase/ssr setup): HIGH — official docs description + concrete code from a 2026-dated secondary source, both agree on async `cookies()` and the three-file structure
- Architecture (Drizzle RLS helpers vs raw SQL): MEDIUM — Drizzle's RLS API surface exists but version-specific reliability for the pinned 0.45.2/0.31.10 pair is unverified; mitigated by recommending raw SQL for the security-critical policy layer
- Pitfalls: HIGH — directly sourced from project's own PITFALLS.md (already researched and verified) plus corroborating community sources for the recursion-specific mechanism

**Research date:** 2026-06-15
**Valid until:** 2026-07-15 (30 days — stack versions and Supabase API patterns are relatively stable, but Next.js 16 ecosystem and Drizzle RLS tooling are still maturing; re-verify versions if planning is delayed)

---
*Phase: 01-foundation-data-model-rls-auth-roles*
*Researched: 2026-06-15*
