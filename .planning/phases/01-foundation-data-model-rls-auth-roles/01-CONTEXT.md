# Phase 1: Foundation — Data Model, RLS & Auth Roles - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the multi-tenant Postgres schema (restaurants, units, categories, products, product_availability, admin_users) with Row Level Security enabled and correctly enforcing tenant isolation on every table, plus authentication and login for both admin roles (platform super-admin and restaurant admin) with strict cross-tenant isolation. No catalog management UI, no availability toggling UI, no customer-facing pages — those belong to Phases 2-6. This phase proves the foundation works via login + a minimal scoped-data view.

</domain>

<decisions>
## Implementation Decisions

### Modelo de Admins e Papéis
- **D-01:** Tabela única `admin_users` com coluna `role` (enum: `'super_admin'` | `'restaurant_admin'`) e `restaurant_id` (nullable — NULL para `super_admin`, FK para `restaurants` para `restaurant_admin`).
- **D-02:** RLS lê role/restaurant_id via lookup (subquery) na tabela `admin_users` filtrando por `auth.uid()` — não usar JWT `app_metadata`/custom access token hook nesta fase (menos peças móveis, sem necessidade de refresh de token quando o papel muda).
- **D-03:** Super admin tem acesso total via política RLS que inclui condição `OR role = 'super_admin'` em todas as tabelas — não usar `service_role` key para bypass de RLS. Mantém tudo dentro do fluxo normal do Supabase client.
- **D-04:** Usuários de teste (1 super admin + admins de pelo menos 2 restaurantes diferentes) criados via script de seed versionado no repo (SQL ou Drizzle seed) — reprodutível para validar login e isolamento entre tenants (critério de sucesso #3).

### Convenção de Disponibilidade Padrão (product_availability)
- **D-05:** Quando não existe registro em `product_availability` para um par produto/unidade, o produto é considerado **DISPONÍVEL** por padrão (ausência de registro = disponível). Esta regra é aplicada na prática na Phase 4, mas o desenho da tabela em Phase 1 deve respeitá-la.
- **D-06:** Tabela `product_availability` é **esparsa** — contém registros apenas para exceções ao padrão (produto marcado indisponível em uma unidade específica). Nenhuma criação automática de linha para cada par produto×unidade.

### Áreas de Login dos Admins
- **D-08:** Login único em `/admin/login` para os dois papéis, usando Supabase Auth (`@supabase/ssr`). Após autenticar, redireciona com base no `role` lido em `admin_users`: `super_admin` → área de plataforma, `restaurant_admin` → área do restaurante (rotas exatas a critério de Claude — ver Discretion).
- **D-09:** Após login, exibir uma página simples mostrando a sessão atual (usuário logado, role) e os dados que esse admin consegue acessar via RLS — para `super_admin`: lista de todos os restaurantes cadastrados; para `restaurant_admin`: apenas o próprio restaurante. Esta página serve como prova viva do isolamento entre tenants (critério de sucesso #3 da fase) e não precisa ser um dashboard funcional — apenas demonstrar o escopo correto dos dados.
- **D-10:** Logout básico implementado nesta fase: ação que encerra a sessão Supabase e redireciona para `/admin/login`.

### Ferramenta de Schema/Migrations
- **D-11:** **Drizzle ORM + drizzle-kit** para definir o schema TypeScript e gerenciar migrations contra o Postgres do Supabase. Confirmado após considerar Prisma como alternativa — Drizzle preferido por menor bundle size e melhor compatibilidade com cold starts/edge runtime na Vercel; o ganho do Prisma Studio não compensa o overhead para este projeto. Usar **Session Mode** (porta 5432) para `drizzle-kit` migrations e **Transaction Mode** (porta 6543) para queries em runtime, conforme `.planning/research/STACK.md`.

### Claude's Discretion
- Formato exato da linha em `product_availability` para representar a exceção "indisponível" (ex: presença da linha já significa indisponível, sem coluna extra, vs. coluna `is_available` boolean) — qualquer abordagem que respeite D-05/D-06 é aceitável.
- Rotas exatas pós-login para cada papel (ex: `/admin` para super_admin vs `/painel` ou `/admin/[restaurantSlug]` para restaurant_admin) — desde que distintas, consistentes entre si, e não conflitem com o roteamento path-based do cliente final (`/r/[restaurantSlug]`, já decidido em `.planning/research/STACK.md`).
- Estrutura interna do seed script (SQL puro vs Drizzle seed runner) e nomes/credenciais dos usuários de teste.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Stack & Architecture
- `.planning/research/STACK.md` — stack confirmado: Next.js 16 + Tailwind 4 + Supabase (Postgres/Auth/Storage) + Drizzle ORM + @supabase/ssr + zod + shadcn/ui; roteamento path-based (`/r/[restaurantSlug]/[unitSlug]`); aviso explícito sobre **nunca** confiar em `user_metadata`/`app_metadata` client-editável para autorização — papéis devem viver em tabela própria com RLS (alinhado com D-01/D-02).
- `.planning/research/ARCHITECTURE.md` — padrões arquiteturais recomendados para o projeto.
- `.planning/research/PITFALLS.md` — armadilhas conhecidas (RLS, multi-tenant, Supabase) a evitar.
- `.planning/research/FEATURES.md` — detalhamento de features por fase.

### Requisitos & Roadmap
- `.planning/REQUIREMENTS.md` — AUTH-01, AUTH-02, AUTH-03 (requisitos cobertos por esta fase).
- `.planning/ROADMAP.md` §"Phase 1: Foundation — Data Model, RLS & Auth Roles" — goal e success criteria desta fase.
- `.planning/PROJECT.md` — visão geral, hierarquia restaurante → unidades → cardápio, constraints de stack.

No external specs além dos arquivos de `.planning/research/` — requisitos fully captured nas decisões acima.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Nenhum — projeto greenfield. Apenas `.planning/` e `CLAUDE.md` existem no repositório até o momento.

### Established Patterns
- Nenhum ainda — esta fase estabelece os primeiros padrões (schema Drizzle, políticas RLS, estrutura de Server Actions/Server Components para auth).

### Integration Points
- Schema Drizzle será a fonte de verdade para `restaurants`, `units`, `categories`, `products`, `product_availability`, `admin_users`.
- `@supabase/ssr` (`createServerClient`) para login/sessão em Server Components/Actions/middleware; `createBrowserClient` apenas se necessário para partes client-side.
- Middleware Next.js para proteger rotas `/admin/*` (redirecionar não-autenticados para `/admin/login`).

</code_context>

<specifics>
## Specific Ideas

- Página pós-login (D-09) deve funcionar como "teste de fumaça" do RLS: se um `restaurant_admin` ver dados de outro restaurante ali, é sinal de falha de isolamento — útil tanto para desenvolvimento quanto para a verificação do critério de sucesso #3.
- Seed script (D-04) deve cobrir o cenário mínimo de verificação: 1 super admin + admins de **pelo menos 2 restaurantes diferentes**, para que o teste de isolamento tenha algo real para comparar.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation-data-model-rls-auth-roles*
*Context gathered: 2026-06-15*
