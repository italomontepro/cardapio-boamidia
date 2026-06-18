# Boa Mídia — Cardápio Digital

## What This Is

Boa Mídia é uma plataforma SaaS multi-tenant de cardápio digital para restaurantes. Cada restaurante cadastrado pode ter múltiplas unidades/filiais, cada uma com seu próprio número de WhatsApp e disponibilidade de produtos. O cliente final acessa um link único do restaurante, escolhe a unidade, navega pelo cardápio, monta um pedido e envia via WhatsApp para a unidade escolhida. O sistema tem dois níveis de administração: um admin geral da plataforma (gerencia os restaurantes clientes) e um admin por restaurante (gerencia categorias, produtos, fotos, unidades e disponibilidade).

## Core Value

Um cliente final consegue acessar o link de um restaurante, escolher a unidade, montar um pedido pelo cardápio e enviá-lo via WhatsApp direto para aquela unidade.

## Requirements

### Validated

- [x] Admin geral faz login em painel próprio — Validated in Phase 1: Foundation — Data Model, RLS & Auth Roles (AUTH-01)
- [x] Admin do restaurante faz login em painel próprio, restrito ao seu restaurante — Validated in Phase 1: Foundation — Data Model, RLS & Auth Roles (AUTH-02, AUTH-03 — isolamento entre tenants confirmado via RLS)
- [x] Admin do restaurante define a localização geográfica exata de cada unidade (lat/lng) via mapa interativo, num formulário de cadastro/edição em etapas — Validated in Phase 04.1: Localização de unidades via mapa (inserida — pré-requisito da Fase 5, que precisa de lat/lng para sugerir a unidade mais próxima ao cliente)
- [x] Cliente acessa link único do restaurante e vê uma página de seleção de unidade — Validated in Phase 5: Public Customer Menu — Selection, Browsing & Cart (MENU-01, MENU-06, MENU-07)
- [x] Cliente visualiza o cardápio da unidade escolhida (categorias e produtos com nome, descrição, foto, preço), mostrando apenas itens disponíveis naquela unidade — Validated in Phase 5 (MENU-02, MENU-03, MENU-04, MENU-05)
- [x] Cliente monta um pedido (carrinho) com itens, quantidades e observações — Validated in Phase 5 (CART-01, CART-02, CART-03)
- [x] Cliente finaliza o pedido e o sistema gera uma mensagem formatada enviada via WhatsApp (wa.me) para o número da unidade escolhida — Validated in Phase 6: WhatsApp Order Generation (CART-04, CART-05, CART-06). Código completo e testado automaticamente (`scripts/verify-whatsapp.ts` 13/13); teste em dispositivo real (iOS Safari + Android Chrome) ficou pendente por falta de unidades cadastradas no banco no momento da execução — rastreado em `06-HUMAN-UAT.md`, não bloqueia o core value.

### Active

- [ ] Admin geral faz CRUD de restaurantes (criar, editar, remover, ativar/desativar)
- [ ] Admin do restaurante faz CRUD de categorias e produtos (nome, descrição, preço)
- [ ] Admin do restaurante faz upload de fotos dos produtos
- [ ] Admin do restaurante faz CRUD de unidades/filiais (nome, endereço, número de WhatsApp)
- [ ] Admin do restaurante gerencia disponibilidade de cada produto por unidade

### Out of Scope

- Pagamento online — pedido é combinado via WhatsApp, pagamento acontece fora do sistema (entrega/retirada). Pode entrar em versão futura.
- Histórico/rastreamento de pedidos (status "recebido/preparando/entregue") — v1 apenas dispara a mensagem para o WhatsApp, sem persistir o pedido. Pode entrar em versão futura.
- Auto-cadastro de restaurantes — restaurantes são cadastrados pelo admin geral, não há fluxo de signup público.

## Context

- Projeto novo (greenfield), repositório `cardapio-boamidia` já criado e clonado.
- "Boa Mídia" é a marca da plataforma/SaaS, não de um restaurante específico.
- Fluxo do cliente final pensado para acesso via QR code/link único, sem necessidade de login.
- Estrutura pensada para ser genérica e escalável: restaurante → várias unidades → cardápio compartilhado com disponibilidade configurável por unidade.

## Constraints

- **Tech stack**: Next.js + Tailwind CSS — escolha do usuário para o front-end/full-stack.
- **Banco de dados**: Relacional (sugestão Supabase/Postgres) — necessário para multi-tenant, dois níveis de auth e disponibilidade por unidade.
- **Deploy**: Futuro deploy na Vercel — não bloqueia o v1, mas influencia escolhas de stack.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Multi-tenant com hierarquia restaurante → unidades | Permite que cada restaurante tenha várias filiais com WhatsApp e disponibilidade próprios, mantendo cardápio compartilhado | — Pending |
| Link único leva à seleção de unidade | Mantém o fluxo genérico e escalável para qualquer restaurante/cliente da plataforma | — Pending |
| Pedido enviado via WhatsApp (wa.me), sem persistência no v1 | Simplicidade máxima para o MVP; evita complexidade de gestão de pedidos antes de validar o core | Validated in Phase 6 — `buildOrderMessage`/`buildWhatsAppUrl` puros, `window.open` síncrono (seguro para iOS Safari), nenhuma escrita no banco para o pedido em si |
| Upload de imagem para fotos de produtos | Melhor experiência para o admin do restaurante vs. colar URLs | — Pending |
| Dois níveis de admin (geral da plataforma e por restaurante) | Reflete o modelo de negócio SaaS: plataforma gerencia clientes, cliente gerencia seu próprio cardápio | Validated in Phase 1 — RLS + roles implementados, AUTH-01/02/03 confirmados |
| Leaflet + OpenStreetMap (sem API key) para seleção de localização de unidades; geocoding via Nominatim | Gratuito, sem custo recorrente, alinhado com a filosofia "simplicidade máxima" do MVP | Validated in Phase 04.1 — mapa interativo + geocoding funcionando, lat/lng persistido (mode:'number') |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-18 after Phase 6 completion — Core Value loop (link → unidade → cardápio → carrinho → WhatsApp) está implementado end-to-end; teste em dispositivo real pendente (06-HUMAN-UAT.md), sem bloquear o milestone.*
