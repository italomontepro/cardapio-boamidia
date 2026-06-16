# Phase 3: Restaurant Admin — Units, Catalog & Photos - Context

**Gathered:** 2026-06-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase entrega a interface completa de gestão do restaurante: o admin do restaurante consegue criar/editar/remover unidades/filiais (com nome, endereço, WhatsApp e horários de funcionamento), gerenciar categorias e produtos do cardápio (com descrição, preço, foto, destaque), e reordenar categorias e produtos. Nenhuma gestão de disponibilidade por unidade (Phase 4), nenhuma página pública de cardápio para cliente (Phase 5), e nenhuma funcionalidade de WhatsApp order (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Navegação do painel do restaurante
- **D-01:** Páginas separadas com rotas próprias dentro de `/painel/`: `/painel/unidades` (gerenciar filiais) e `/painel/cardapio` (gerenciar categorias + produtos juntos).
- **D-02:** Sidebar lateral fixa à esquerda no layout de `/painel` com links de navegação: Visão Geral (`/painel`), Unidades (`/painel/unidades`), Cardápio (`/painel/cardapio`). Layout atual em `src/app/painel/layout.tsx` precisa ser evoluído para incluir a sidebar ao lado do `<main>`.
- **D-03:** shadcn não tem sidebar component — implementar com `nav + ul/li` simples, link ativo com `usePathname()` do Next.js para destacar a seção atual.

### Unidades/filiais (`/painel/unidades`)
- **D-04:** Listagem em tabela (shadcn `Table`, já instalado) com colunas: nome, endereço, WhatsApp, horários. Ações por linha: Editar, Remover.
- **D-05:** Formulário em Dialog (shadcn `Dialog`, já instalado) para criar e editar unidade. Campos: nome, endereço, WhatsApp, horários de funcionamento.
- **D-06:** WhatsApp validado no formato brasileiro (ex: `5511999999999` ou `(11) 99999-9999`). Usar `libphonenumber-js` para validação e normalização, conforme recomendado no STACK.md. Número inválido bloqueia o submit (zod + resolver).
- **D-07:** `units.hours` é coluna `text` no schema — campo de texto livre no formulário (ex: "Seg–Sex 11h–22h, Sáb 11h–23h"). Sem seletor de horários complexo nesta fase.
- **D-08:** Remoção de unidade exige confirmação via `AlertDialog` (shadcn, já instalado), com aviso de que a unidade e suas configurações de disponibilidade serão removidas (cascade por FK).
- **D-09:** Sem reordenação de unidades — sucesso criteria não menciona ordem para unidades, apenas para categorias e produtos.

### Cardápio — Categorias e Produtos (`/painel/cardapio`)
- **D-10:** Página única `/painel/cardapio` gerencia categorias e produtos juntos. Layout em accordion expansível: lista de categorias, cada categoria expande inline mostrando seus produtos. Não há rota separada para produtos.
- **D-11:** Adicionar produto acontece dentro da categoria correspondente (botão "+" dentro de cada accordion item da categoria). Adicionar categoria é via botão no topo da página.
- **D-12:** Formulário de criar/editar categoria em Dialog com campo único: nome. Reordenação via botões ↑/↓ por linha (sem drag-and-drop).
- **D-13:** Formulário de criar/editar produto em Dialog com campos: nome, descrição (textarea), preço, foto (file input inline), `is_featured` (checkbox). Reordenação via botões ↑/↓ dentro da categoria.
- **D-14:** Remoção de categoria exige `AlertDialog` de confirmação (aviso: todos os produtos da categoria serão removidos por cascade). Remoção de produto também exige confirmação.

### Upload de foto dos produtos
- **D-15:** Upload real para Supabase Storage, bucket `product-images`. Estrutura de path: `{restaurant_id}/{product_id}/{filename}`.
- **D-16:** Upload inline no form do produto (mesmo Dialog de criar/editar). Server Action: (1) insere/atualiza o produto no DB, (2) faz upload do arquivo para o bucket via `supabase.storage.from('product-images').upload(path, file)`, (3) salva a URL pública em `products.image_url`.
- **D-17:** Uma foto por produto (single `image_url` no schema existente). Galeria multi-foto (`product_images` table) é deferred para versão futura.
- **D-18:** Preview da imagem atual mostrado no Dialog de edição quando `image_url` já existe. File input opcional ao editar — se não selecionar novo arquivo, mantém a foto existente.
- **D-19:** Configurar `next/image` com `remotePatterns` apontando para o domínio do Supabase Storage CDN para otimização de imagem nas páginas do painel.

### Reordenação de categorias e produtos
- **D-20:** Botões ↑/↓ por linha para reordenar. `sort_order` já existe no schema (`categories.sort_order`, `products.sort_order`). Clique em ↑/↓ dispara Server Action que troca os valores de `sort_order` entre o item e o vizinho. Sem drag-and-drop nesta fase.

### Claude's Discretion
- Componente de accordion para categorias/produtos: shadcn `Accordion` (instalar via CLI) ou `details/summary` HTML nativo — qualquer um que fique limpo e funcional.
- Formatação exata de preço no formulário e na listagem (ex: campo numérico com máscara `R$ 0,00` ou input tipo text com validação zod `z.string().regex(...)` → converte para `numeric`).
- Quais shadcn components instalar via CLI para esta fase: `accordion`, `textarea`, `checkbox`, `separator` — instalar conforme necessário.
- Texto exato de mensagens de erro e confirmações (PT-BR).
- Comportamento de `sort_order` ao criar novo item (inserir no final: `MAX(sort_order) + 1`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos & Roadmap
- `.planning/REQUIREMENTS.md` — UNIT-01, UNIT-02, UNIT-03, CTLG-01, CTLG-02, CTLG-03, CTLG-04, CTLG-05, CTLG-06 (requisitos cobertos por esta fase).
- `.planning/ROADMAP.md` §"Phase 3: Restaurant Admin — Units, Catalog & Photos" — goal e success criteria (6 critérios de sucesso).
- `.planning/PROJECT.md` — visão geral, hierarquia restaurante → unidades → cardápio, constraints de stack.

### Stack & Padrões
- `.planning/research/STACK.md` — stack confirmado (Next.js 16, Supabase Storage, Drizzle, shadcn/ui, zod, libphonenumber-js para validação WhatsApp); padrões de upload com URL assinada e `next/image` com `remotePatterns`.
- `.planning/research/PITFALLS.md` — armadilhas conhecidas, especialmente sobre RLS e Supabase Storage policies.

### Decisões anteriores
- `.planning/phases/01-foundation-data-model-rls-auth-roles/01-CONTEXT.md` — D-05/D-06 (convenção sparsa de `product_availability`), D-01/D-02 (modelo de roles e RLS).
- `.planning/phases/02-platform-super-admin-restaurant-provisioning/02-CONTEXT.md` — padrões UI estabelecidos na Phase 2 (Table, Dialog, AlertDialog, shadcn components).

### Código existente — pontos de integração
- `src/db/schema.ts` — tabelas `units`, `categories`, `products` (com `sort_order`, `image_url`, `is_featured`), `product_availability` (sparsa).
- `src/app/painel/layout.tsx` — layout atual do painel do restaurante; precisa evoluir para incluir sidebar lateral (D-02).
- `src/app/painel/page.tsx` — página atual simples (D-09 da Phase 1); permanece como "Visão Geral" na nav.
- `src/components/ui/` — components disponíveis: `alert-dialog`, `badge`, `button`, `card`, `dialog`, `form`, `input`, `label`, `table`.
- `src/lib/auth/session.ts` — `getCurrentAdmin()` retorna `{ id, email, role, restaurantId }` — `restaurantId` é o tenant ID do admin logado, usar em todas as queries desta fase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- shadcn `Table` + `Dialog` + `AlertDialog` — padrão completo estabelecido na Phase 2, reutilizar integralmente para unidades, categorias e produtos.
- `getCurrentAdmin()` de `src/lib/auth/session.ts` para obter `restaurantId` nas Server Actions e Server Components.
- RLS já aplica escopo de tenant em todas as tabelas — queries sem filtro explícito de `restaurant_id` retornam automaticamente apenas dados do restaurante logado.
- Pattern de Server Actions com `'use server'` + zod validation, bem estabelecido desde Phase 2.
- `createClient()` de `@supabase/ssr` para Server Components; mesmo cliente serve para queries de DB e Storage.

### Established Patterns
- Listagem: Server Component busca dados → renderiza shadcn `Table` → ações em linha abrem `Dialog` (edit) ou `AlertDialog` (delete confirm).
- Formulários: `react-hook-form` + zod resolver + shadcn `Form`/`Input`/`Button` dentro de `Dialog`.
- Server Actions: validar com zod → executar via Drizzle → revalidatePath → retornar `{ success, error }`.
- Nenhum estado global client-side — tudo via Server Actions + revalidação de Server Components.

### Integration Points
- `src/app/painel/layout.tsx` evolui para layout com sidebar + main content (D-02).
- Novas rotas: `src/app/painel/unidades/page.tsx`, `src/app/painel/cardapio/page.tsx`.
- Supabase Storage: criar bucket `product-images` (via Supabase dashboard ou migration); configurar política de RLS do bucket para permitir uploads autenticados e leitura pública.
- `next.config.ts` (ou `next.config.js`): adicionar `remotePatterns` para o domínio do Supabase Storage.

</code_context>

<specifics>
## Specific Ideas

- A página `/painel/cardapio` deve dar sensação de "ver o cardápio inteiro de uma vez" — categorias expansíveis com seus produtos, fácil de reordenar e adicionar itens. É a tela que o admin usará mais frequentemente.
- Upload de foto: migração futura para AWS S3 ou Cloudflare R2 é simples — apenas a Server Action de upload muda, o schema e os componentes permanecem iguais (tudo depende só de `image_url` texto).

</specifics>

<deferred>
## Deferred Ideas

- Galeria multi-foto por produto (`product_images` table) — v1 usa single `image_url`. Additive change para versão futura.
- Reordenação via drag-and-drop (@dnd-kit) — botões ↑/↓ suficientes para v1.
- Horários de funcionamento estruturados (dia da semana + hora abertura/fechamento) — campo de texto livre suficiente para v1.
- Gestão de múltiplos admins por restaurante — deferred desde Phase 2.

</deferred>

---

*Phase: 03-restaurant-admin-units-catalog-photos*
*Context gathered: 2026-06-16*
