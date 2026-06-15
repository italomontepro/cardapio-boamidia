# Phase 2: Platform Super-Admin — Restaurant Provisioning - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 02-platform-super-admin-restaurant-provisioning
**Areas discussed:** Listagem de restaurantes, Criar/editar restaurante, Provisionamento do primeiro admin (PLAT-05), Ativar/desativar e remoção

---

## Listagem de restaurantes

| Option | Description | Selected |
|--------|-------------|----------|
| Tabela com ações | shadcn Table, mais compacto e escalável | ✓ |
| Cards | Mantém padrão atual de /admin (D-09 Fase 1) | |
| Lista simples de texto | Minimalista, sem componente novo | |

**User's choice:** Tabela com ações (recomendado)

| Option | Description | Selected |
|--------|-------------|----------|
| Status ativo/inativo | Badge | ✓ |
| Data de criação | Auditoria/ordenação | ✓ |
| Número de admins cadastrados | Consulta a admin_users | ✓ |

**User's choice:** Todas as três (status, data de criação, número de admins)

| Option | Description | Selected |
|--------|-------------|----------|
| Badge colorido | Verde/cinza, padrão shadcn | ✓ |
| Toggle switch inline | Ativa/desativa direto na lista | |
| Texto simples | Sem componente extra | |

**User's choice:** Badge colorido

| Option | Description | Selected |
|--------|-------------|----------|
| Editar + Ativar/Desativar | Cobre PLAT-02/03 na lista | ✓ |
| Apenas link para edição | Ações na página individual | |
| Editar, Ativar/Desativar + ver admins | Mais completo, mais carregado | |

**User's choice:** Editar + Ativar/Desativar

---

## Criar/editar restaurante

| Option | Description | Selected |
|--------|-------------|----------|
| Modal/Dialog | Sobre a listagem, fluxo rápido | ✓ |
| Página dedicada | Rota própria, mais espaço | |

**User's choice:** Modal/Dialog

| Option | Description | Selected |
|--------|-------------|----------|
| Gerado automaticamente, editável | Slugify do nome, ajustável | ✓ |
| Apenas automático, não editável | Sempre derivado do nome | |
| Campo manual obrigatório | Digitado à mão | |

**User's choice:** Gerado automaticamente, editável

| Option | Description | Selected |
|--------|-------------|----------|
| Erro de validação no formulário | zod + unique constraint | ✓ |
| Sugerir slug alternativo automaticamente | Sistema sugere variante | |

**User's choice:** Erro de validação no formulário

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, com aviso | Editável após ativo, com aviso de link antigo | ✓ |
| Não, slug fixo após criação | Bloqueado para edição | |

**User's choice:** Sim, com aviso

---

## Provisionamento do primeiro admin (PLAT-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Mesmo dialog, em 2 etapas/seções | Restaurante + admin no mesmo Server Action | ✓ |
| Dois passos separados | Dialogs separados | |
| Totalmente desacoplados | Tela "Admins" separada | |

**User's choice:** Mesmo dialog, em 2 etapas/seções

| Option | Description | Selected |
|--------|-------------|----------|
| Senha temporária gerada pelo sistema, exibida uma vez | Via Admin API, como scripts/seed.ts | ✓ |
| Convite por e-mail (magic link) | Requer SMTP configurado | |
| Super admin digita a senha manualmente | Senha em texto no formulário | |

**User's choice:** Senha temporária gerada pelo sistema, exibida uma vez

| Option | Description | Selected |
|--------|-------------|----------|
| Não — conta já válida | email_confirm: true | ✓ |
| Sim, precisa confirmar e-mail | Requer SMTP | |

**User's choice:** Não — conta já válida

| Option | Description | Selected |
|--------|-------------|----------|
| Apenas 1 admin por restaurante nesta fase | PLAT-05 cobre só o admin inicial | ✓ |
| Permitir adicionar admins extras já nesta fase | Amplia escopo | |

**User's choice:** Apenas 1 admin por restaurante nesta fase

---

## Ativar/desativar e remoção

| Option | Description | Selected |
|--------|-------------|----------|
| Bloqueia login do restaurant_admin | Checagem extra em login() | ✓ |
| Só a flag, sem efeito de login nesta fase | Efeito real só na Fase 5 | |

**User's choice:** Bloqueia login do restaurant_admin

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, dialog de confirmação | AlertDialog antes de desativar | ✓ |
| Não, toggle direto | Sem confirmação | |

**User's choice:** Sim, dialog de confirmação

| Option | Description | Selected |
|--------|-------------|----------|
| Não — só ativar/desativar | PLAT-03 não pede hard delete | ✓ |
| Sim, com exclusão permanente disponível | Cascade de dados relacionados | |

**User's choice:** Não — só ativar/desativar

---

## Claude's Discretion

- Biblioteca/implementação de geração de slug
- Implementação da contagem "número de admins cadastrados"
- Onde/como exibir a senha temporária pós-criação
- Texto exato dos avisos/confirmações (PT-BR)
- Quais componentes shadcn adicionar via CLI

## Deferred Ideas

- Gestão de múltiplos admins por restaurante (fora de PLAT-05/Fase 2)
- Exclusão definitiva (hard delete) de restaurantes com cascade — não solicitado
