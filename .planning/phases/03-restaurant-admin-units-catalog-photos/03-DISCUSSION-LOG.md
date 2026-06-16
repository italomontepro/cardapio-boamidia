# Phase 3: Restaurant Admin — Units, Catalog & Photos - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-16
**Phase:** 03-restaurant-admin-units-catalog-photos
**Areas discussed:** Navegação do painel, Upload de foto dos produtos, Reordenação de categorias e produtos, Estrutura de gestão do cardápio

---

## Navegação do painel

| Option | Description | Selected |
|--------|-------------|----------|
| Páginas separadas | /painel/unidades, /painel/categorias, /painel/produtos — cada seção é uma rota própria com link na sidebar/nav do layout | ✓ |
| Tabs na mesma página | Uma única página /painel com tabs shadcn | |
| Accordion/expansão vertical | Tudo na mesma página, cada seção expande inline | |

**User's choice:** Páginas separadas

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar lateral | Sidebar fixa à esquerda no layout do /painel | ✓ |
| Nav horizontal no topo | Links horizontais abaixo do header | |
| Claude decide | Qualquer abordagem limpa está ok | |

**User's choice:** Sidebar lateral

---

## Upload de foto dos produtos

| Option | Description | Selected |
|--------|-------------|----------|
| Upload para Supabase Storage | File input + Server Action + bucket product-images + URL pública em image_url | ✓ |
| Campo de URL texto | Admin cola URL de imagem já hospedada em outro lugar | |

**User's choice:** Upload para Supabase Storage

**Notes:** Usuário perguntou sobre facilidade de migrar para AWS S3/Cloudflare R2 no futuro. Confirmado: migração simples — apenas a Server Action de upload muda, o schema (image_url texto) e os componentes permanecem iguais.

| Option | Description | Selected |
|--------|-------------|----------|
| Inline no form | Upload no mesmo Dialog de criar/editar produto | ✓ |
| Etapa separada | Produto criado primeiro, foto depois via ação separada | |
| Claude decide | O que for mais simples | |

**User's choice:** Inline no form

---

## Reordenação de categorias e produtos

| Option | Description | Selected |
|--------|-------------|----------|
| Botões ↑/↓ por linha | Simples, zero dependências extras | ✓ |
| Drag-and-drop | @dnd-kit, mais intuitivo mas adiciona complexidade | |
| Claude decide | O que for mais coerente | |

**Notes:** Usuário inicialmente indicou querer ambos ("BOTOES E DRAGA AND DROP"), mas ao esclarecer preferiu só botões ↑/↓ para manter simplicidade.

**User's choice:** Só botões ↑/↓

---

## Estrutura de gestão do cardápio

| Option | Description | Selected |
|--------|-------------|----------|
| Página única com accordion | /painel/cardapio com categorias expansíveis mostrando produtos inline | ✓ |
| Navegação categoria → produtos | /painel/categorias → /painel/categorias/[id]/produtos | |
| Categorias e produtos separados | Rotas independentes com filtro | |

**User's choice:** Página única com accordion (/painel/cardapio)

| Option | Description | Selected |
|--------|-------------|----------|
| /painel/cardapio | Única rota para categorias + produtos juntos | ✓ |
| Rotas separadas | /painel/categorias e /painel/produtos independentes | |

**User's choice:** /painel/cardapio

---

## Claude's Discretion

- Componente de accordion: shadcn Accordion ou details/summary HTML nativo
- Formatação de preço no formulário e listagem
- Quais shadcn components instalar via CLI (accordion, textarea, checkbox, separator)
- Texto exato de mensagens de erro e confirmações (PT-BR)
- Comportamento de sort_order ao criar novo item

## Deferred Ideas

- Galeria multi-foto por produto — v1 usa single image_url
- Drag-and-drop para reordenação — botões ↑/↓ suficientes para v1
- Horários de funcionamento estruturados — campo de texto livre para v1
