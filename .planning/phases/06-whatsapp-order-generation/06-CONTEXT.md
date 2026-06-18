# Phase 6: WhatsApp Order Generation - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase entrega a etapa final do loop de valor central: o cliente revisa o carrinho montado na Fase 5 e envia o pedido formatado via WhatsApp (`wa.me`) diretamente para o número da unidade selecionada. Não inclui: persistência do pedido no banco, histórico/rastreamento de status, ou pagamento online (decisões já fixadas em PROJECT.md "Out of Scope").

</domain>

<decisions>
## Implementation Decisions

### Fluxo de revisão e envio
- **D-01:** O botão "Enviar pedido via WhatsApp" estende o `CartSheet` existente (D-08 da Fase 5) — sem nova rota ou tela de checkout separada.
- **D-02:** O botão só aparece quando o carrinho tem itens (escondido quando vazio — mesmo padrão do `CartFab`).

### Conteúdo da mensagem
- **D-03:** Campo de texto opcional "Seu nome" aparece antes do botão de enviar. Se deixado em branco, a linha de nome é simplesmente omitida da mensagem (não bloqueia o envio).
- **D-04:** Seletor de retirada/entrega (toggle ou radio) antes de enviar — vira só uma linha de texto na mensagem, sem novo campo no banco (schema de `units`/`products` não tem isso). Nenhuma opção vem pré-selecionada por padrão.
- **D-05:** Formato da mensagem: texto plano (sem emojis), com título (nome da unidade/restaurante), lista de itens (qty x nome - preço, observações indentadas por item) e subtotal no final.

### Pós-envio
- **D-06:** O carrinho NÃO é limpo automaticamente após o cliente tocar em "Enviar pedido" — permanece intacto.
- **D-07:** Um toast/confirmação breve aparece depois que o link `wa.me` é aberto (ex: "Pedido enviado! Confira o WhatsApp.").
- **D-08:** Um botão "Limpar carrinho" é adicionado ao `CartSheet` para o cliente esvaziar tudo de uma vez, além da remoção item a item que já existe.

### Casos extremos
- **D-09:** Se a unidade selecionada não tiver `whatsappNumber` cadastrado (campo nullable no banco), o botão de enviar NÃO aparece — mostra um aviso tipo "Esta unidade ainda não configurou WhatsApp para pedidos."
- **D-10:** Sem truncamento/agrupamento especial para carrinhos grandes (10+ itens) ou observações longas — `wa.me` suporta mensagens longas; validar empiricamente durante o teste manual em dispositivo real (critério de sucesso #4 da Fase 6).
- **D-11:** Carrinho vazio → botão de enviar nem aparece (mesma regra do D-02).

### Claude's Discretion
- Texto exato (copy PT-BR) de toasts, avisos e labels de botões.
- Se o link `wa.me` abre em nova aba/janela ou substitui a página atual — escolher o que funciona melhor para deep-link do app WhatsApp no mobile.
- Posicionamento/estilo exato do botão "Limpar carrinho" dentro do `CartSheet`.
- Se o seletor de retirada/entrega ficar sem seleção, omitir essa linha da mensagem (mesmo padrão do nome em branco) — a menos que, durante o planejamento, fique claro que a seleção deveria ser obrigatória.
- Encoding da URL `wa.me` (`encodeURIComponent` no texto da mensagem).
- Se o endereço da unidade (`units.address`) entra no cabeçalho da mensagem — dado já disponível via `getUnitBySlug`, útil principalmente no caso "retirada".

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos & Roadmap
- `.planning/REQUIREMENTS.md` — CART-04, CART-05, CART-06 (requisitos cobertos por esta fase).
- `.planning/ROADMAP.md` §"Phase 6: WhatsApp Order Generation" — goal e 4 critérios de sucesso.
- `.planning/PROJECT.md` §"Out of Scope" — confirma: sem pagamento online, sem persistência/histórico de pedido.
- `CLAUDE.md` (raiz do projeto) §"What NOT to Use" — "Building a custom order management system in v1" está fora de escopo; gerar texto formatado + redirect `wa.me`, sem escrita no banco para o pedido em si.

### Decisões anteriores
- `.planning/phases/05-public-customer-menu-selection-browsing-cart/05-CONTEXT.md` — D-08 (CartFab + bottom sheet), D-10 (carrinho persistido por unidade via localStorage, isolado por `restaurantId`+`unitId`), D-11 (stepper inline + remover dentro do sheet).

### Código existente — pontos de integração
- `src/app/r/[restaurantSlug]/[unitSlug]/cart-sheet.tsx` — componente a estender com botão de envio, botão "Limpar carrinho", e os novos campos (nome, retirada/entrega).
- `src/app/r/[restaurantSlug]/[unitSlug]/cart-provider.tsx` (`useCart`) — reducer já tem `ADD`/`SET_QTY`/`REMOVE`/`HYDRATE`; precisa de uma nova action (ex: `CLEAR`) para o botão "Limpar carrinho".
- `src/lib/menu/format.ts` — `formatBRL` reutilizável para formatar preços dentro da mensagem.
- `src/lib/menu/queries.ts` (`getUnitBySlug`) — já retorna a unidade completa, incluindo `whatsappNumber`, `address` e `name` (sem necessidade de nova query).
- `src/db/schema.ts:39-40` — `units.address` (nullable text) e `units.whatsappNumber` (nullable text) são os campos relevantes para D-09 e a discrição sobre endereço.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CartSheet` (Fase 5) — já tem lista de itens, subtotal, stepper inline; só precisa de uma seção nova no rodapé (nome, seletor entrega/retirada, botão enviar, botão limpar).
- `formatBRL` — reutilizar para os valores dentro da mensagem de texto do pedido.
- `getUnitBySlug` — já carrega todos os dados de unidade necessários (nome, endereço, whatsapp) sem nova query.

### Established Patterns
- Nenhuma escrita no banco para o pedido em si (D-10 da Fase 5 + Out of Scope do PROJECT.md) — Fase 6 é puramente client-side: construir a mensagem formatada e redirecionar para `wa.me`.
- Carrinho já é client state (Context + `localStorage`) — a nova lógica de mensagem/envio é uma função pura que lê esse estado, não precisa de Server Action.

### Integration Points
- Provavelmente um novo helper (ex: `src/lib/menu/whatsapp.ts`) com uma função pura que recebe carrinho + dados da unidade + nome/tipo de entrega e retorna a URL `wa.me` já montada e codificada — testável isoladamente, sem componente.
- `cart-sheet.tsx` consome esse helper ao construir o `href`/`onClick` do botão de enviar.

</code_context>

<specifics>
## Specific Ideas

Nenhuma referência específica adicional além do que está capturado em `<decisions>`.

</specifics>

<deferred>
## Deferred Ideas

Nenhuma — a discussão ficou dentro do escopo da fase.

</deferred>

---

*Phase: 06-whatsapp-order-generation*
*Context gathered: 2026-06-18*
