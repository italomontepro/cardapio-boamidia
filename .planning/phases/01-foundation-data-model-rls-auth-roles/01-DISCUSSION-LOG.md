# Phase 1: Foundation — Data Model, RLS & Auth Roles - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 01-foundation-data-model-rls-auth-roles
**Areas discussed:** Modelo de admins e papéis, Convenção de disponibilidade padrão, Áreas de login dos admins, Ferramenta de schema/migrations

---

## Modelo de admins e papéis

### Q1: Como representar os admins e seus papéis no schema?

| Option | Description | Selected |
|--------|-------------|----------|
| Tabela única admin_users (role + restaurant_id) | role enum (super_admin \| restaurant_admin) + restaurant_id nullable; um FK para auth.users | ✓ |
| Tabelas separadas (super_admins / restaurant_admins) | Duas tabelas distintas por papel | |
| Você decide | — | |

**User's choice:** Tabela única admin_users (role + restaurant_id)

### Q2: Onde o RLS lê o papel (role) e o restaurant_id do usuário logado?

| Option | Description | Selected |
|--------|-------------|----------|
| JWT app_metadata (custom access token hook) | Hook grava role+restaurant_id no JWT; policies leem via auth.jwt() | |
| Lookup na tabela admin_users | Policies fazem subquery em admin_users WHERE user_id = auth.uid() | ✓ |
| Você decide | — | |

**User's choice:** Lookup na tabela admin_users

### Q3: Como o super admin obtém acesso total aos dados de todos os restaurantes?

| Option | Description | Selected |
|--------|-------------|----------|
| Política RLS permite role='super_admin' | Policies incluem OR role='super_admin' em todas as tabelas | ✓ |
| Operações de super admin usam service_role (bypassa RLS) | Server Actions de plataforma usam service_role key | |
| Você decide | — | |

**User's choice:** Política RLS permite role='super_admin'

### Q4: Como os admins de teste serão criados para validar login e isolamento entre tenants nesta fase?

| Option | Description | Selected |
|--------|-------------|----------|
| Script de seed versionado no repo | SQL ou Drizzle seed cria usuários de teste e popula admin_users | ✓ |
| Criação manual via dashboard Supabase | Usuários criados manualmente, sem script versionado | |
| Você decide | — | |

**User's choice:** Script de seed versionado no repo

**Notes:** Nenhuma pergunta adicional — usuário seguiu direto para a próxima área.

---

## Convenção de disponibilidade padrão

### Q1: Quando não existe registro em product_availability, o produto aparece por padrão?

| Option | Description | Selected |
|--------|-------------|----------|
| Sim — disponível por padrão | Ausência de registro = disponível; admin desativa por exceção | ✓ |
| Não — indisponível por padrão | Ausência de registro = indisponível; admin habilita explicitamente | |
| Você decide | — | |

**User's choice:** Sim — disponível por padrão

### Q2: Como representar isso na tabela product_availability?

| Option | Description | Selected |
|--------|-------------|----------|
| Tabela esparsa — só grava exceções ao padrão | Linha só existe quando admin alterou o valor padrão | ✓ |
| Tabela densa — uma linha para cada par produto/unidade | Toda combinação tem linha, criada automaticamente | |
| Você decide | — | |

**User's choice:** Tabela esparsa — só grava exceções ao padrão

### Q3 (follow-up): O que uma linha em product_availability representa?

| Option | Description | Selected |
|--------|-------------|----------|
| Presença da linha = indisponível (sem coluna is_available) | Query vira NOT EXISTS para checar disponibilidade | |
| Coluna is_available (boolean), padrão via COALESCE | Mais flexível para regras futuras | |
| Você decide | Claude escolhe durante o planejamento | ✓ |

**User's choice:** Você decide

**Notes:** Capturado em CONTEXT.md como "Claude's Discretion" — qualquer formato que respeite D-05/D-06 (disponível por padrão, tabela esparsa) é aceitável.

---

## Áreas de login dos admins

### Q1: Estrutura de login — única ou separada por papel?

| Option | Description | Selected |
|--------|-------------|----------|
| Login único (/admin/login) com redirect por role | Uma tela; redireciona para /admin ou /painel conforme role | ✓ |
| Páginas de login separadas por papel | /admin/login e /painel/login distintos | |
| Você decide | — | |

**User's choice:** Login único (/admin/login) com redirect por role

### Q2: O que o admin vê imediatamente após o login nesta fase?

| Option | Description | Selected |
|--------|-------------|----------|
| Página simples mostrando sessão + dados escopados | Mostra role e os dados acessíveis via RLS — prova de isolamento | ✓ |
| Shell de dashboard vazio com navegação placeholder | Casca de painel com nav sem funcionalidade | |
| Você decide | — | |

**User's choice:** Página simples mostrando sessão + dados escopados

### Q3: Logout deve ser implementado nesta fase?

| Option | Description | Selected |
|--------|-------------|----------|
| Sim — botão/ação de logout básico | Encerra sessão Supabase, redireciona ao login | ✓ |
| Não — fora do escopo desta fase | Foca só em login + RLS | |
| Você decide | — | |

**User's choice:** Sim — botão/ação de logout básico

**Notes:** Nenhuma pergunta adicional — usuário seguiu direto para a próxima área.

---

## Ferramenta de schema/migrations

### Q1: Qual ferramenta para schema e migrations?

| Option | Description | Selected |
|--------|-------------|----------|
| Drizzle ORM + drizzle-kit | Schema TS, migrations via drizzle-kit, recomendado no STACK.md | ✓ |
| supabase-js puro + SQL/CLI Supabase | SQL migrations via Supabase CLI, queries via supabase-js | |
| Other (free text) | Usuário perguntou: "pq não prisma, só uma duvida" | |

**User's choice (after follow-up):** Drizzle ORM + drizzle-kit

**Notes:** Usuário perguntou sobre Prisma como alternativa. Claude explicou o trade-off (Drizzle: menor bundle size, melhor cold start/edge runtime na Vercel; Prisma: Prisma Studio mais maduro, schema DSL mais amigável). Usuário respondeu "pode seguir" — confirmando Drizzle (recomendado).

---

## Claude's Discretion

- Formato exato da linha em `product_availability` (presença=indisponível vs coluna `is_available` boolean) — qualquer abordagem que respeite "disponível por padrão + tabela esparsa".
- Rotas exatas pós-login por papel (ex: `/admin` vs `/painel` ou `/admin/[restaurantSlug]`) — desde que distintas e consistentes com o roteamento path-based do cliente (`/r/[restaurantSlug]`).
- Estrutura interna do seed script (SQL puro vs Drizzle seed runner) e credenciais dos usuários de teste.

## Deferred Ideas

None — discussion stayed within phase scope.
