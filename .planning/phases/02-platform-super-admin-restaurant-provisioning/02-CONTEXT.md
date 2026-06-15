# Phase 2: Platform Super-Admin — Restaurant Provisioning - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers a CRUD interface for the platform super-admin to manage the roster of restaurant tenants: list, create, edit, and activate/deactivate restaurants, plus provisioning each restaurant's first admin user at creation time (PLAT-01 to PLAT-05). No catalog/unit/availability management UI (Phase 3+), no customer-facing pages, no multi-admin management per restaurant.

</domain>

<decisions>
## Implementation Decisions

### Listagem de restaurantes
- **D-01:** Listagem em formato de tabela (shadcn `Table`, a adicionar via CLI) com colunas: nome, slug, status (badge colorido ativo=verde/inativo=cinza), data de criação, número de admins cadastrados.
- **D-02:** Ações disponíveis por linha: Editar e Ativar/Desativar (PLAT-02/03).

### Criar/editar restaurante
- **D-03:** Formulário em Dialog/modal (shadcn `Dialog`), não em página dedicada.
- **D-04:** Slug gerado automaticamente via slugify do nome, mas editável pelo super admin antes de salvar.
- **D-05:** Colisão de slug (unique constraint já existe em `restaurants.slug`) → erro de validação no formulário (zod), mensagem clara tipo "este link já está em uso".
- **D-06:** Slug pode ser editado depois que o restaurante já está ativo, mas exibe um aviso de que o link antigo deixará de funcionar.

### Provisionamento do primeiro admin (PLAT-05)
- **D-07:** O mesmo Dialog "Novo restaurante" tem uma seção "Admin do restaurante" (campo e-mail). Um único Server Action cria o restaurante (`restaurants`) e o primeiro admin (`auth.users` + `admin_users`) de forma atômica.
- **D-08:** Senha temporária gerada pelo sistema (via Supabase Admin API com `service_role`, mesmo padrão de `scripts/seed.ts`'s `supabaseAdmin.auth.admin.createUser`), exibida ao super admin **uma única vez** após a criação (ele copia e passa ao restaurante). Não persistir a senha em texto plano em nenhum lugar.
- **D-09:** Conta criada com `email_confirm: true` — admin do restaurante consegue logar imediatamente com a senha temporária, sem depender de SMTP/confirmação de e-mail (alinhado com o que `scripts/seed.ts` já faz na Fase 1).
- **D-10:** Apenas 1 admin por restaurante nesta fase. Tela/fluxo para gerenciar múltiplos admins por restaurante está fora do escopo de PLAT-05/Fase 2 — ver Deferred.

### Ativar/desativar e remoção
- **D-11:** `is_active = false` bloqueia o login do `restaurant_admin` daquele restaurante — adicionar checagem em `src/lib/auth/actions.ts` (`login()`): após resolver o `role`/`restaurant_id`, verificar `restaurants.is_active` para `restaurant_admin` e negar acesso com mensagem clara se inativo. `super_admin` não é afetado por essa checagem (não tem `restaurant_id`).
- **D-12:** Ação "Desativar" exige confirmação via `AlertDialog` (shadcn) antes de executar.
- **D-13:** Sem exclusão definitiva (hard delete) nesta fase — ativar/desativar é o único mecanismo de "remoção" da plataforma, conforme PLAT-03. Exclusão permanente com cascade de dados relacionados está fora de escopo.

### Claude's Discretion
- Biblioteca/implementação exata da geração de slug (slugify ou função própria simples).
- Implementação exata da contagem "número de admins cadastrados" (subquery/join em `admin_users`).
- Onde/como exibir a senha temporária pós-criação (toast persistente, segundo dialog de sucesso, etc.) — apenas garantir exibição única, cópia fácil, e não persistência em texto plano.
- Texto exato dos avisos/confirmações (PT-BR).
- Quais componentes shadcn adicionar via CLI (`table`, `dialog`, `badge`, `alert-dialog`, `switch` se necessário).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos & Roadmap
- `.planning/REQUIREMENTS.md` — PLAT-01 a PLAT-05 (requisitos cobertos por esta fase).
- `.planning/ROADMAP.md` §"Phase 2: Platform Super-Admin — Restaurant Provisioning" — goal e success criteria.
- `.planning/PROJECT.md` — visão geral, modelo multi-tenant.

### Stack & Padrões (Fase 1)
- `.planning/research/STACK.md` — stack confirmado (Next.js 16, Supabase, Drizzle, shadcn/ui, zod).
- `.planning/research/PITFALLS.md` Pitfall 3 — `admin_users` só pode ser escrito via caminho server-side controlado por `super_admin`/`service_role`; restaurant_admin nunca se auto-atribui `restaurant_id`. Diretamente relevante para D-07/D-08.
- `.planning/phases/01-foundation-data-model-rls-auth-roles/01-CONTEXT.md` — decisões D-01 a D-11 da Fase 1 (modelo de roles, RLS, seed).

### Código existente (Fase 1) — pontos de integração
- `src/db/schema.ts` — tabelas `restaurants` (id, name, slug, isActive, createdAt) e `admin_users` (userId, role, restaurantId).
- `src/db/migrations/0002_rls_policies.sql` — `restaurants` já tem policy `for all` para `is_super_admin()` (cobre INSERT/UPDATE/DELETE desta fase); `admin_users` hoje só tem policy de SELECT — provisionamento do admin (D-07/D-08) deve usar o cliente `service_role` (Admin API), não depender de uma nova policy de INSERT.
- `scripts/seed.ts` — padrão de referência para `supabaseAdmin.auth.admin.createUser` com `email_confirm: true` (D-08/D-09).
- `src/lib/auth/actions.ts` — `login()` Server Action onde a checagem de D-11 (`is_active`) deve ser adicionada.
- `src/app/admin/(dashboard)/page.tsx` — página atual de listagem (Card-based, D-09 da Fase 1) a ser evoluída para a tabela desta fase.
- `src/components/ui/` — componentes shadcn já instalados: `button`, `card`, `form`, `input`, `label`. Faltam `table`, `dialog`, `badge`, `alert-dialog` (instalar via CLI).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- shadcn `button`, `card`, `form`, `input`, `label` já instalados em `src/components/ui/`.
- Padrão de Server Actions com `'use server'` + `@supabase/ssr` (`src/lib/auth/actions.ts`).
- Padrão de cliente admin (`service_role`) já existe em `scripts/seed.ts` — reutilizar a mesma lógica de criação de usuário para PLAT-05.

### Established Patterns
- Server Components fazem queries via `createClient()` (`@supabase/ssr`), confiando em RLS para escopo de dados.
- RLS de `restaurants` já permite `for all` para `is_super_admin()` — CRUD de restaurantes não precisa de nova policy.

### Integration Points
- Evoluir `src/app/admin/(dashboard)/page.tsx` (lista atual em Cards) para a tabela desta fase.
- Novo Server Action de criação/edição de restaurante + provisionamento de admin, seguindo o padrão de `src/lib/auth/actions.ts` e o cliente admin de `scripts/seed.ts`.
- `login()` em `src/lib/auth/actions.ts` ganha checagem de `is_active` (D-11).

</code_context>

<specifics>
## Specific Ideas

- O fluxo "Novo Restaurante" deve sentir-se como uma única operação para o super admin: preencher nome do restaurante + e-mail do admin, e receber de volta o link (`/r/[slug]`) e a senha temporária para passar ao cliente — sem etapas extras ou e-mails de confirmação.

</specifics>

<deferred>
## Deferred Ideas

- Gestão de múltiplos admins por restaurante (adicionar/remover admins extras de um restaurante existente) — fora do escopo de PLAT-05/Fase 2, considerar para fase futura se necessário.
- Exclusão definitiva (hard delete) de restaurantes com cascade de dados — não solicitado, fora de PLAT-01..05.

</deferred>

---

*Phase: 02-platform-super-admin-restaurant-provisioning*
*Context gathered: 2026-06-15*
