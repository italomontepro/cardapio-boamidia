# Requirements: Boa Mídia — Cardápio Digital

**Defined:** 2026-06-15
**Core Value:** Um cliente final consegue acessar o link de um restaurante, escolher a unidade, montar um pedido pelo cardápio e enviá-lo via WhatsApp direto para aquela unidade.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Autenticação e Papéis (AUTH)

- [ ] **AUTH-01**: Super admin da plataforma pode fazer login em painel próprio
- [ ] **AUTH-02**: Admin do restaurante pode fazer login em painel próprio, restrito ao seu restaurante
- [ ] **AUTH-03**: Dados de cada restaurante são isolados entre tenants (admin de um restaurante não acessa dados de outro)

### Admin Geral / Plataforma (PLAT)

- [ ] **PLAT-01**: Super admin pode criar um novo restaurante com nome e slug único (link)
- [ ] **PLAT-02**: Super admin pode editar dados de um restaurante existente
- [ ] **PLAT-03**: Super admin pode ativar/desativar um restaurante
- [ ] **PLAT-04**: Super admin pode listar todos os restaurantes cadastrados na plataforma
- [ ] **PLAT-05**: Ao criar um restaurante, super admin provisiona o primeiro usuário admin daquele restaurante

### Admin do Restaurante — Unidades (UNIT)

- [ ] **UNIT-01**: Admin do restaurante pode criar, editar e remover unidades/filiais (nome, endereço, WhatsApp)
- [ ] **UNIT-02**: Sistema valida o formato do número de WhatsApp de cada unidade
- [ ] **UNIT-03**: Admin do restaurante pode definir horário de funcionamento (exibição) de cada unidade

### Admin do Restaurante — Cardápio (CTLG)

- [ ] **CTLG-01**: Admin do restaurante pode criar, editar e remover categorias do cardápio
- [ ] **CTLG-02**: Admin do restaurante pode definir a ordem de exibição das categorias
- [ ] **CTLG-03**: Admin do restaurante pode criar, editar e remover produtos (nome, descrição, preço)
- [ ] **CTLG-04**: Admin do restaurante pode definir a ordem de exibição dos produtos dentro de uma categoria
- [ ] **CTLG-05**: Admin do restaurante pode fazer upload de foto para cada produto
- [ ] **CTLG-06**: Admin do restaurante pode marcar um produto como "destaque/promoção"
- [ ] **CTLG-07**: Admin do restaurante pode alternar a disponibilidade de cada produto por unidade

### Cardápio do Cliente (MENU)

- [ ] **MENU-01**: Cliente acessa o link único do restaurante e vê uma página de seleção de unidade (nome, endereço, horário)
- [ ] **MENU-02**: Cliente vê o cardápio da unidade escolhida, organizado por categoria, respeitando a ordem definida pelo admin
- [ ] **MENU-03**: Apenas produtos disponíveis na unidade selecionada são exibidos no cardápio
- [ ] **MENU-04**: Produtos marcados como destaque são visualmente sinalizados no cardápio
- [ ] **MENU-05**: Preços são exibidos no formato pt-BR (R$)
- [ ] **MENU-06**: Cardápio tem layout responsivo, mobile-first
- [ ] **MENU-07**: Estados vazios são tratados (sem unidades cadastradas, categoria sem produtos disponíveis)

### Carrinho e Pedido via WhatsApp (CART)

- [ ] **CART-01**: Cliente adiciona produtos ao carrinho com quantidade
- [ ] **CART-02**: Cliente adiciona observações por item (ex: "sem cebola")
- [ ] **CART-03**: Cliente ajusta quantidades ou remove itens do carrinho
- [ ] **CART-04**: Cliente vê um resumo do pedido (itens, quantidades, subtotal) antes de enviar
- [ ] **CART-05**: Cliente envia o pedido via WhatsApp (wa.me) com mensagem formatada para o número da unidade selecionada
- [ ] **CART-06**: Carrinho vazio exibe estado apropriado (sem permitir envio de pedido vazio)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Operação (OPS)

- **OPS-01**: Assistente/wizard de onboarding para o super admin cadastrar um novo restaurante mais rapidamente
- **OPS-02**: Compressão/redimensionamento automático de imagens no upload de fotos de produtos

### Cardápio do Cliente (MENU)

- **MENU-08**: Navegação fixa por categorias / busca dentro do cardápio (para cardápios grandes)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Pagamento online (PIX/cartão) | Pedido é combinado via WhatsApp; pagamento ocorre fora do sistema na entrega/retirada |
| Histórico/rastreamento de pedidos (status recebido/preparando/entregue) | v1 apenas envia a mensagem ao WhatsApp; a conversa no WhatsApp é o registro do pedido |
| Auto-cadastro público de restaurantes | Restaurantes são cadastrados manualmente pelo super admin; sem fluxo de signup |
| Programas de fidelidade/cashback | Exigiria identidade do cliente, incompatível com fluxo sem login |
| Cálculo de zona/taxa de entrega | Negociado via WhatsApp como hoje; fora do escopo do cardápio |
| Cardápio multilíngue (além de pt-BR) | Sem demanda validada; não construir UI de i18n agora |
| Sincronização de estoque em tempo real com PDV | Toggle manual de disponibilidade cobre a necessidade prática do v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | TBD | Pending |
| AUTH-02 | TBD | Pending |
| AUTH-03 | TBD | Pending |
| PLAT-01 | TBD | Pending |
| PLAT-02 | TBD | Pending |
| PLAT-03 | TBD | Pending |
| PLAT-04 | TBD | Pending |
| PLAT-05 | TBD | Pending |
| UNIT-01 | TBD | Pending |
| UNIT-02 | TBD | Pending |
| UNIT-03 | TBD | Pending |
| CTLG-01 | TBD | Pending |
| CTLG-02 | TBD | Pending |
| CTLG-03 | TBD | Pending |
| CTLG-04 | TBD | Pending |
| CTLG-05 | TBD | Pending |
| CTLG-06 | TBD | Pending |
| CTLG-07 | TBD | Pending |
| MENU-01 | TBD | Pending |
| MENU-02 | TBD | Pending |
| MENU-03 | TBD | Pending |
| MENU-04 | TBD | Pending |
| MENU-05 | TBD | Pending |
| MENU-06 | TBD | Pending |
| MENU-07 | TBD | Pending |
| CART-01 | TBD | Pending |
| CART-02 | TBD | Pending |
| CART-03 | TBD | Pending |
| CART-04 | TBD | Pending |
| CART-05 | TBD | Pending |
| CART-06 | TBD | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 0
- Unmapped: 31 ⚠️ (will be filled by roadmap creation)

---
*Requirements defined: 2026-06-15*
*Last updated: 2026-06-15 after initial definition*
