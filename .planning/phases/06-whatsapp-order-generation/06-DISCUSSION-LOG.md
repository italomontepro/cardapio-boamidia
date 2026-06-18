# Phase 6: WhatsApp Order Generation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 06-whatsapp-order-generation
**Areas discussed:** Fluxo de revisão e envio, Conteúdo da mensagem, Pós-envio, Casos extremos

---

## Fluxo de revisão e envio

| Option | Description | Selected |
|--------|-------------|----------|
| Extender o CartSheet atual | Botão "Enviar pedido via WhatsApp" no rodapé do bottom-sheet existente (D-08) | ✓ |
| Nova etapa dentro do mesmo Sheet | Troca de conteúdo do Sheet para uma tela de revisão final | |
| Página de checkout separada | Nova rota `/checkout` | |

**User's choice:** Extender o CartSheet atual.

| Option | Description | Selected |
|--------|-------------|----------|
| Só aparece com itens | Botão escondido quando carrinho vazio (consistente com CartFab) | ✓ |
| Sempre visível, mas desabilitado | Botão cinza/desabilitado quando vazio | |

**User's choice:** Só aparece com itens.

---

## Conteúdo da mensagem

| Option | Description | Selected |
|--------|-------------|----------|
| Não pede nome | WhatsApp já identifica remetente | |
| Pede nome (campo opcional) | Campo de texto "Seu nome" antes do botão de enviar | ✓ |

**User's choice:** Pede nome (campo opcional).

| Option | Description | Selected |
|--------|-------------|----------|
| Não inclui entrega/retirada | Combinado fora do sistema, via chat do WhatsApp | |
| Inclui um seletor simples | Toggle "Retirada"/"Entrega", só texto, sem campo novo no banco | ✓ |

**User's choice:** Inclui um seletor simples.

| Option | Description | Selected |
|--------|-------------|----------|
| Lista simples com emojis | Título + itens + subtotal, com emojis leves | |
| Lista simples, sem emojis | Mesmo formato, texto plano | ✓ |

**User's choice:** Lista simples, sem emojis.

**Follow-up — nome em branco:**

| Option | Description | Selected |
|--------|-------------|----------|
| Omite a linha | Mensagem não tem linha de nome se vazio | ✓ |
| Usa um placeholder genérico | "Cliente" no lugar do nome | |

**User's choice:** Omite a linha.

**Follow-up — seletor de entrega tem padrão pré-selecionado?**

| Option | Description | Selected |
|--------|-------------|----------|
| Retirada como padrão | Pré-seleciona "Retirada" | |
| Nenhuma pré-selecionada | Cliente escolhe ativamente, ou deixa sem escolha | ✓ |

**User's choice:** Nenhuma pré-selecionada.
**Notes:** Comportamento de mensagem quando não selecionado ficou como discrição de Claude (CONTEXT.md), inferido por consistência com o padrão de nome em branco (omitir linha).

---

## Pós-envio

| Option | Description | Selected |
|--------|-------------|----------|
| Limpa imediatamente | Carrinho esvaziado ao abrir o wa.me | |
| Mantém o carrinho | Carrinho intacto após abrir WhatsApp | ✓ |

**User's choice:** Mantém o carrinho.

| Option | Description | Selected |
|--------|-------------|----------|
| Volta ao cardápio normal | Sem mensagem extra | |
| Mostra um toast/confirmação breve | "Pedido enviado! Confira o WhatsApp." | ✓ |

**User's choice:** Mostra um toast/confirmação breve.

**Follow-up — como limpar o carrinho manualmente:**

| Option | Description | Selected |
|--------|-------------|----------|
| Botão "Limpar carrinho" no sheet | Esvazia tudo de uma vez | ✓ |
| Só remover item por item | Usa o botão "Remover" já existente por linha | |

**User's choice:** Botão "Limpar carrinho" no sheet.

---

## Casos extremos

| Option | Description | Selected |
|--------|-------------|----------|
| Esconde o botão de enviar + aviso | Mensagem "Esta unidade ainda não configurou WhatsApp para pedidos" | ✓ |
| Botão aparece desabilitado | Cinza/inativo com tooltip | |

**User's choice:** Esconde o botão de enviar + aviso.

| Option | Description | Selected |
|--------|-------------|----------|
| Nenhuma — deixa como está | Sem truncamento/agrupamento, validar empiricamente em device real | ✓ |
| Trunca observações longas | Limite de caracteres por observação | |

**User's choice:** Nenhuma — deixa como está.

Carrinho vazio: confirmado como já coberto pela decisão "botão só aparece com itens" (sem nova pergunta necessária).

---

## Claude's Discretion

- Texto exato (copy PT-BR) de toasts, avisos e labels de botões.
- Abrir `wa.me` em nova aba/janela vs. substituir a página atual.
- Posicionamento/estilo do botão "Limpar carrinho" dentro do CartSheet.
- Comportamento da mensagem quando o seletor de entrega/retirada não é selecionado (inferido: omitir a linha, por consistência com o nome em branco).
- Encoding da URL `wa.me`.
- Se o endereço da unidade entra no cabeçalho da mensagem.

## Deferred Ideas

Nenhuma — a discussão ficou dentro do escopo da fase.
