# Phase 5: Public Customer Menu — Selection, Browsing & Cart - Context

**Gathered:** 2026-06-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase entrega o fluxo público do cliente final: acessar o link único do restaurante (`/r/[restaurantSlug]`), escolher (ou ser direcionado automaticamente para) uma unidade, navegar pelo cardápio dessa unidade (categorias e produtos, filtrados por disponibilidade), e montar um carrinho com quantidades e observações. Não inclui: geração/envio da mensagem WhatsApp (Phase 6), nem o formulário de localização de unidade no painel admin (nova fase a ser inserida antes desta, ver `<deferred>`).

</domain>

<decisions>
## Implementation Decisions

### Seleção de unidade
- **D-01:** Mais de uma unidade cadastrada → lista de cards (nome, endereço, horário); toque no card leva ao cardápio daquela unidade.
- **D-02:** Apenas 1 unidade cadastrada → pula a tela de seleção, cliente cai direto no cardápio dessa unidade.
- **D-03:** Estilo iFood — app solicita permissão de geolocalização do navegador e sugere/ordena a lista de unidades pela mais próxima. **Depende de lat/lng em `units`**, que será entregue por uma fase nova a ser inserida antes desta (ver `<deferred>`). Até essa fase existir, a lógica de distância não pode ser implementada — planner deve tratar como dependência bloqueante, não como "Claude decide".
- **D-04:** Última unidade escolhida é lembrada via `localStorage` (escopado por restaurante), para revisitas ao mesmo link.
- **D-05:** Nome da unidade atual fica sempre visível/fixo no cardápio (indicador "você está em: [unidade]").

### Layout do cardápio
- **D-06:** Categorias exibidas em abas (tabs) no topo da página — uma categoria visível por vez.
- **D-07:** Produtos com `is_featured=true` aparecem em uma faixa "Destaques" fixa acima das abas, sempre visível independente da aba selecionada — além de aparecerem normalmente dentro de sua categoria (ambos, não um ou outro).

### Carrinho — interação e persistência
- **D-08:** Botão flutuante fixo no rodapé ("Ver carrinho — N itens") que abre um bottom sheet com os itens do carrinho.
- **D-09:** Tocar em um produto do cardápio abre um Dialog (foto grande, descrição, stepper de quantidade, campo de observação); botão "Adicionar ao carrinho" confirma e fecha.
- **D-10:** Carrinho persiste via `localStorage`, escopado por unidade (`restaurantId` + `unitId`) — cada unidade tem seu próprio carrinho isolado (não compartilhado entre unidades do mesmo restaurante).
- **D-11:** Dentro do bottom sheet, cada item tem stepper inline (+/-) e botão de remover — sem reabrir o Dialog para editar.

### Estados vazios e casos extremos
- **D-12:** Link/slug inválido (restaurante ou unidade não existe ou está desativado) → página 404 genérica do Next.js (`not-found.tsx` padrão), sem customização de marca nesta fase.
- **D-13:** Categoria sem nenhum produto disponível na unidade selecionada → aba/categoria inteira é escondida do cliente (não aparece como vazia).

### Claude's Discretion
- Visual exato do indicador de unidade atual (badge, header sticky, etc.).
- Texto exato de mensagens de erro/vazio (PT-BR).
- Cálculo de distância client-side (Haversine simples) — sem dependência externa nova, já que coordenadas virão prontas do banco.
- Formatação de preço via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Quais shadcn components instalar via CLI: `tabs` e `sheet` (nenhum dos dois está instalado ainda — ver `<code_context>`).
- Estrutura exata do React Context do carrinho (reducer vs estado simples) e do hook de sincronização com `localStorage`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos & Roadmap
- `.planning/REQUIREMENTS.md` — MENU-01 a MENU-07, CART-01 a CART-03 (requisitos cobertos por esta fase).
- `.planning/ROADMAP.md` §"Phase 5: Public Customer Menu — Selection, Browsing & Cart" — goal e 6 critérios de sucesso.
- `.planning/PROJECT.md` — visão geral, fluxo do cliente final, "Out of Scope" (sem pagamento online, sem persistência de pedido).
- `CLAUDE.md` (raiz do projeto) §"Stack Patterns by Variant" — roteamento path-based confirmado: `/r/[restaurantSlug]` → seleção de unidade → `/r/[restaurantSlug]/[unitSlug]` → cardápio.

### Decisões anteriores
- `.planning/phases/01-foundation-data-model-rls-auth-roles/01-CONTEXT.md` — convenção sparsa de `product_availability` (D-05/D-06: ausência de linha = disponível); modelo de RLS (default-deny) — **research deve investigar como expor leitura pública (sem auth) de restaurants/units/categories/products/product_availability sob esse modelo**, já que hoje RLS é pensado para admins autenticados.
- `.planning/phases/03-restaurant-admin-units-catalog-photos/03-CONTEXT.md` — schema de `products`/`categories`/`units` (sort_order, image_url, is_featured), padrões de UI shadcn estabelecidos.

### Código existente — pontos de integração
- `src/db/schema.ts` — tabelas `restaurants`, `units`, `categories`, `products`, `product_availability` + relations já definidas; `units.slug` único por `restaurantId` (base para a rota de unidade).
- `src/components/ui/` — `dialog`, `accordion`, `badge`, `button`, `card` já instalados e reutilizáveis. **`tabs` e `sheet`/`drawer` NÃO estão instalados** — necessários para D-06 e D-08, instalar via `npx shadcn@latest add tabs sheet`.
- Nenhuma lib de state management (zustand/jotai/redux) instalada — carrinho deve usar React Context + `localStorage`, sem nova dependência.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- shadcn `Dialog` — reutilizar para o dialog de adicionar produto ao carrinho (D-09), mesmo padrão usado no admin (Phase 2/3).
- Convenção sparsa de `product_availability` (Phase 1) — query de "produtos disponíveis na unidade X" é um `LEFT JOIN`/`NOT EXISTS` excluindo produtos com linha em `product_availability` para aquele `unitId`.
- `units.slug` + `restaurants.slug` (unique) já existem no schema — suportam diretamente as rotas `/r/[restaurantSlug]/[unitSlug]`.

### Established Patterns
- Server Components + Drizzle para fetch de dados, Server Actions para mutações — mas esta fase é majoritariamente leitura pública (sem auth), então o padrão de "RLS escopado pelo admin logado" não se aplica diretamente; precisa de policy de leitura pública para `restaurants.is_active = true` em diante.
- Nenhum estado client-side existente no projeto ainda — carrinho será o primeiro Client Component com estado relevante (Context + localStorage).

### Integration Points
- Novas rotas: `src/app/r/[restaurantSlug]/page.tsx` (seleção de unidade ou redirect automático se houver 1 só), `src/app/r/[restaurantSlug]/[unitSlug]/page.tsx` (cardápio + carrinho).
- `next.config.ts` já tem `remotePatterns` para Supabase Storage (Phase 3) — fotos de produto já carregam via `next/image` sem mudança adicional.

</code_context>

<specifics>
## Specific Ideas

- Cliente referenciou explicitamente "estilo iFood" para a seleção de unidade: sugestão de unidade mais próxima por geolocalização, lembrar última unidade visitada, e indicador sempre visível de em qual unidade o cliente está navegando.

</specifics>

<deferred>
## Deferred Ideas

- **Admin: seleção de localização da unidade via mapa** — formulário de cadastro/edição de unidade no painel admin (`/painel/unidades`) redesenhado com etapas (multi-step), incluindo uma etapa dedicada de "localização" com seleção em mapa interativo, salvando lat/lng. Isso é trabalho do domínio admin (Phase 3, já concluída), não do cardápio público (Phase 5). **Usuário decidiu inserir isso como uma fase nova ANTES da Fase 5** (via `/gsd:insert-phase`), já que a Fase 5 depende desse dado de lat/lng para D-03 (sugestão de unidade mais próxima). Próximo passo após esta sessão: rodar `/gsd:insert-phase` para criar essa fase (migration de schema + UI de mapa no admin).

</deferred>

---

*Phase: 05-public-customer-menu-selection-browsing-cart*
*Context gathered: 2026-06-16*
