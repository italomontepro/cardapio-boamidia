# Phase 5: Public Customer Menu — Selection, Browsing & Cart - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-16
**Phase:** 05-public-customer-menu-selection-browsing-cart
**Areas discussed:** Seleção de unidade, Layout do cardápio, Carrinho — interação e persistência, Estados vazios e casos extremos

---

## Seleção de unidade

| Option | Description | Selected |
|--------|-------------|----------|
| Lista de cards | Cada unidade em um card com nome, endereço e horário | ✓ |
| Lista com mapa | Mesma lista, com mini-mapa/distância | |
| Dropdown/select | Seletor único dropdown | |

**User's choice:** Lista de cards

| Option | Description | Selected |
|--------|-------------|----------|
| Pula seleção, vai direto ao cardápio | Restaurante com 1 unidade não mostra tela de seleção | ✓ |
| Sempre mostra a tela de seleção | Mostra mesmo com 1 unidade | |

**User's choice:** Pula seleção, vai direto ao cardápio

**Follow-up (free text):** Usuário pediu "estilo iFood" — geolocalização pra sugerir unidade mais próxima, lembrar última unidade, e indicador fixo de unidade atual. Os 3 confirmados.

**Trade-off discutido:** Geolocalização real exige lat/lng por unidade, ausente no schema atual (`units` só tem `address` texto).

| Option | Description | Selected |
|--------|-------------|----------|
| Geocodificar endereço automaticamente (API) | Geocoding automático ao salvar unidade | |
| Admin digita lat/lng manualmente | Campo manual no form | |
| Adiar distância real, fazer só "lembrar última unidade" + indicador | Sem geo nesta fase | |

**User's choice:** Nenhuma das três — pediu seleção da localização via mapa interativo no formulário do admin (multi-step, "bem bonito").

**Resolução de escopo:** Esse trabalho pertence ao domínio do admin (Phase 3), não à Fase 5. Usuário optou por inserir uma fase nova ANTES da Fase 5 para isso (via `/gsd:insert-phase`), em vez de adiar sem data ou fazer manualmente.

**Notes:** D-03 na Fase 5 (sugestão por proximidade) fica registrado como dependente dessa fase nova.

---

## Layout do cardápio

| Option | Description | Selected |
|--------|-------------|----------|
| Scroll único com seções por categoria | Página contínua com nav de âncora | |
| Accordion (categorias colapsadas) | Mesmo padrão do admin | |
| Abas por categoria | Tabs no topo, uma categoria por vez | ✓ |

**User's choice:** Abas por categoria

| Option | Description | Selected |
|--------|-------------|----------|
| Seção "Destaques" no topo | Antes das categorias normais | |
| Badge/selo no card do produto | Só dentro da categoria | |
| Ambos | Seção + badge | ✓ |

**User's choice:** Ambos

**Follow-up:** Com abas, "Destaques" é uma aba própria ou fica fixo acima das abas?

| Option | Description | Selected |
|--------|-------------|----------|
| Destaques é a primeira aba | Some ao trocar de aba | |
| Destaques fixo acima das abas | Sempre visível, abas de categoria abaixo | ✓ |

**User's choice:** Destaques fixo acima das abas

---

## Carrinho — interação e persistência

| Option | Description | Selected |
|--------|-------------|----------|
| Botão flutuante + bottom sheet | Botão fixo no rodapé, abre sheet | ✓ |
| Botão flutuante + página própria | Leva pra rota /carrinho dedicada | |
| Ícone no header | Estilo e-commerce tradicional | |

**User's choice:** Botão flutuante + bottom sheet

| Option | Description | Selected |
|--------|-------------|----------|
| Dialog ao tocar no produto | Foto grande, stepper, observação, confirmar | ✓ |
| Inline no card do produto | Stepper direto na lista | |

**User's choice:** Dialog ao tocar no produto

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, persiste via localStorage | Sobrevive a refresh/fechar aba | ✓ |
| Não, só em memória (Context) | Refresh limpa tudo | |

**User's choice:** Sim, persiste via localStorage

| Option | Description | Selected |
|--------|-------------|----------|
| Stepper inline + botão remover | Editar direto na lista do sheet | ✓ |
| Toca no item, reabre o Dialog | Reabre o mesmo dialog de adicionar | |

**User's choice:** Stepper inline + botão remover

| Option | Description | Selected |
|--------|-------------|----------|
| Carrinho por unidade | Isolado por restaurantId+unitId | ✓ |
| Carrinho por restaurante (compartilhado) | Único entre unidades | |

**User's choice:** Carrinho por unidade

---

## Estados vazios e casos extremos

| Option | Description | Selected |
|--------|-------------|----------|
| Página 404 genérica do Next.js | not-found.tsx padrão | ✓ |
| Página de erro customizada da marca | "Restaurante não encontrado" com identidade Boa Mídia | |

**User's choice:** Página 404 genérica do Next.js

| Option | Description | Selected |
|--------|-------------|----------|
| Esconde a categoria/aba inteira | Não aparece se vazia | ✓ |
| Mostra com mensagem "sem itens disponíveis" | Aparece vazia com aviso | |

**User's choice:** Esconde a categoria/aba inteira

---

## Claude's Discretion

- Visual exato do indicador de unidade atual
- Textos de erro/vazio em PT-BR
- Cálculo de distância client-side (Haversine)
- Formatação de preço (Intl.NumberFormat)
- Componentes shadcn a instalar (tabs, sheet)
- Estrutura interna do Context/hook do carrinho

## Deferred Ideas

- Admin: formulário de unidade em etapas com seleção de localização via mapa interativo (lat/lng) — vira fase nova, inserida antes da Fase 5, via `/gsd:insert-phase`.
