# Phase 6: WhatsApp Order Generation - Research

**Researched:** 2026-06-18
**Domain:** wa.me click-to-chat URL construction, client-side message formatting, iOS/Android mobile browser deep-linking
**Confidence:** HIGH

## Summary

Phase 6 is a small, well-bounded client-side feature: build a plain-text order summary from the existing `CartProvider` state + `getUnitBySlug` data, URL-encode it, and open a `wa.me/<digits>?text=<encoded>` link. There is no server write, no new API, and no new database table — everything is a pure function plus a UI extension of the existing `CartSheet`. The two genuine technical risk areas are (1) phone number formatting for the `wa.me` path segment, and (2) **iOS Safari's strict popup-blocking rule**, which silently breaks the open-WhatsApp action if any asynchronous code runs between the user's tap and the `window.open()`/navigation call.

The phone number risk is already mitigated by existing code: `units.whatsappNumber` is persisted via `parsePhoneNumber(val, 'BR').number` (libphonenumber-js, already a project dependency), which stores **E.164 format** (`+5511999999999`). `wa.me` requires the digits-only form with no `+`, so the helper only needs `whatsappNumber.replace(/[^0-9]/g, '')` — no new phone-parsing logic, no new dependency.

The popup-blocking risk is a real, well-documented constraint: Safari on iOS only honors `window.open()` as user-gesture-triggered if it is called **synchronously**, with no `await`, `.then()`, `setTimeout`, or any other async boundary between the click and the call. The UI-SPEC's prescribed sequence (open `wa.me` URL, then fire the `sonner` toast) is safe as written, because both `window.open()` and `toast.success()` are synchronous — but the planner must ensure the implementation does not introduce an `async` function body with a microtask gap before the `window.open()` call (e.g. no `await` of any kind, including a Promise-returning analytics call, before the open).

**Primary recommendation:** Build a pure helper `src/lib/menu/whatsapp.ts` exporting `buildOrderMessage(...)` and `buildWhatsAppUrl(...)`, call `window.open(url, '_blank')` synchronously inside the `onClick` handler (no async work before it), strip the unit's stored E.164 number to digits-only for the `wa.me` path, and use `encodeURIComponent` (not `URLSearchParams`) for the `text` query param to keep full control over `%0A` line breaks.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Fluxo de revisão e envio**
- D-01: O botão "Enviar pedido via WhatsApp" estende o `CartSheet` existente (D-08 da Fase 5) — sem nova rota ou tela de checkout separada.
- D-02: O botão só aparece quando o carrinho tem itens (escondido quando vazio — mesmo padrão do `CartFab`).

**Conteúdo da mensagem**
- D-03: Campo de texto opcional "Seu nome" aparece antes do botão de enviar. Se deixado em branco, a linha de nome é simplesmente omitida da mensagem (não bloqueia o envio).
- D-04: Seletor de retirada/entrega (toggle ou radio) antes de enviar — vira só uma linha de texto na mensagem, sem novo campo no banco (schema de `units`/`products` não tem isso). Nenhuma opção vem pré-selecionada por padrão.
- D-05: Formato da mensagem: texto plano (sem emojis), com título (nome da unidade/restaurante), lista de itens (qty x nome - preço, observações indentadas por item) e subtotal no final.

**Pós-envio**
- D-06: O carrinho NÃO é limpo automaticamente após o cliente tocar em "Enviar pedido" — permanece intacto.
- D-07: Um toast/confirmação breve aparece depois que o link `wa.me` é aberto (ex: "Pedido enviado! Confira o WhatsApp.").
- D-08: Um botão "Limpar carrinho" é adicionado ao `CartSheet` para o cliente esvaziar tudo de uma vez, além da remoção item a item que já existe.

**Casos extremos**
- D-09: Se a unidade selecionada não tiver `whatsappNumber` cadastrado (campo nullable no banco), o botão de enviar NÃO aparece — mostra um aviso tipo "Esta unidade ainda não configurou WhatsApp para pedidos."
- D-10: Sem truncamento/agrupamento especial para carrinhos grandes (10+ itens) ou observações longas — `wa.me` suporta mensagens longas; validar empiricamente durante o teste manual em dispositivo real (critério de sucesso #4 da Fase 6).
- D-11: Carrinho vazio → botão de enviar nem aparece (mesma regra do D-02).

### Claude's Discretion
- Texto exato (copy PT-BR) de toasts, avisos e labels de botões. **[RESOLVED by UI-SPEC — see below, treat as locked]**
- Se o link `wa.me` abre em nova aba/janela ou substitui a página atual. **[RESOLVED by UI-SPEC: `window.open(url, '_blank')` — see iOS Safari caveat in Common Pitfalls]**
- Posicionamento/estilo exato do botão "Limpar carrinho" dentro do `CartSheet`. **[RESOLVED by UI-SPEC]**
- Se o seletor de retirada/entrega ficar sem seleção, omitir essa linha da mensagem. **[RESOLVED by UI-SPEC: omit, never block send]**
- Encoding da URL `wa.me` (`encodeURIComponent` no texto da mensagem). **[RESOLVED by this research: use `encodeURIComponent`, not `URLSearchParams` — see Code Examples]**
- Se o endereço da unidade (`units.address`) entra no cabeçalho da mensagem. **[Not resolved by UI-SPEC; UI-SPEC's message-format note (#3) does not mention address. Recommend: omit address from message body for v1 — D-04's delivery-type line already covers the "retirada" case conceptually, and CONTEXT.md leaves this fully to discretion. Planner should make an explicit choice and document it.]**

### Deferred Ideas (OUT OF SCOPE)
Nenhuma — a discussão ficou dentro do escopo da fase.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CART-04 | Customer can review order summary (items, qty, notes, subtotal) before sending | Already largely satisfied by existing `CartSheet` (Phase 5); this research confirms `formatBRL` reuse and message-structure pattern in Code Examples. |
| CART-05 | Customer can send the order via `wa.me`, correctly formatted and encoded, to the unit's WhatsApp number | Core of this research: phone digit-stripping (E.164 → digits-only), `encodeURIComponent` message encoding, `wa.me` URL structure — see Standard Stack, Code Examples, Common Pitfalls. |
| CART-06 | Empty cart shows appropriate state and cannot be sent | Already covered by D-02/D-11 (button hidden, not disabled) — no new technical risk; UI-SPEC interaction note #1 specifies the 3-state footer logic. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (native) `encodeURIComponent` | built-in | Encode the WhatsApp message text for the `?text=` query param | Browser/Node built-in. Correctly percent-encodes UTF-8 bytes for accented PT-BR characters (ã, ç, é) and converts `\n` → `%0A` automatically. No library needed. |
| `libphonenumber-js` | 1.13.6 (already installed, verified via `npm view` against project's installed version) | Already used to normalize `units.whatsappNumber` to E.164 on save (`src/lib/units/schema.ts`) | No new usage needed for Phase 6 — the stored value is already E.164 (`+5511999999999`). The phase 6 helper only needs to strip non-digit characters (including the leading `+`) for the `wa.me` path segment; do not re-parse the number with `libphonenumber-js` again at send time, that would be redundant. |
| `sonner` (via shadcn) | 2.0.7 (verified via `npm view sonner version`) | Toast confirmation after opening WhatsApp (D-07) | Prescribed by UI-SPEC. Not yet installed in this project — must run `npx shadcn@latest add sonner`. Pulls in `next-themes` as a transitive dependency (confirmed via shadcn registry source), but `next-themes`'s `useTheme()` safely returns `{}` when no `ThemeProvider` exists, and the generated `sonner.tsx` destructures `const { theme = "system" } = useTheme()` — so **no `ThemeProvider` setup is required**, it just always renders in `"system"` theme. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| base-ui `Tabs` (`@base-ui/react/tabs`, via existing `@/components/ui/tabs`) | already installed | Pickup/delivery 2-option segmented control (D-04) | Reuse exactly as UI-SPEC prescribes. **Critical gotcha:** base-ui's `TabsRoot` defaults `defaultValue` to `0` when neither `value` nor `defaultValue` is supplied — meaning an uncontrolled `<Tabs>` would auto-select the first tab, contradicting D-04 ("nenhuma opção pré-selecionada"). The planner MUST specify a **controlled** `Tabs` with `value={deliveryType}` where `deliveryType` state starts as `null`, and `onValueChange={(value) => setDeliveryType(value)}` — never rely on the uncontrolled default. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `wa.me/<digits>?text=...` | `api.whatsapp.com/send?phone=<digits>&text=...` | Functionally near-identical (api.whatsapp.com is the longer-standing enterprise/legacy domain); `wa.me` is the domain WhatsApp's own Help Center documents as "the recommended way to let people start a chat" for general/small-business use. No reason to deviate — CONTEXT.md already names `wa.me` explicitly. |
| `encodeURIComponent` | `URLSearchParams` (`new URLSearchParams({ text: message }).toString()`) | `URLSearchParams` encodes spaces as `+` instead of `%20` and has historically had inconsistent newline handling across edge cases; `encodeURIComponent` gives byte-exact control matching every wa.me tutorial/reference implementation found. CONTEXT.md's discretion note explicitly named `encodeURIComponent` — confirmed as the correct choice, no reason to use `URLSearchParams`. |
| `window.open(url, '_blank')` | `window.location.href = url` | UI-SPEC already resolved this in favor of `window.open` (keeps the menu page alive in a background tab so cart state is visibly preserved). Tradeoff to flag: `window.open` is the one that requires the synchronous-call discipline described in Common Pitfalls; `window.location.href` would not have that risk but would navigate away from the menu entirely, which UI-SPEC explicitly wants to avoid. |

**Installation:**
```bash
npx shadcn@latest add sonner
```
No new npm packages beyond what shadcn's CLI adds (`sonner`, `next-themes`) — `libphonenumber-js` is already a dependency.

**Version verification:**
```
libphonenumber-js: 1.13.6 (npm view, matches package.json ^1.13.6 already installed)
sonner: 2.0.7 (npm view, current as of research date)
```

## Architecture Patterns

### Recommended Project Structure
```
src/lib/menu/
├── whatsapp.ts          # NEW — pure functions: buildOrderMessage(), buildWhatsAppUrl()
├── cart-types.ts         # existing — CartItem type (unchanged)
└── format.ts             # existing — formatBRL (reused, unchanged)

src/app/r/[restaurantSlug]/[unitSlug]/
├── cart-sheet.tsx         # MODIFIED — adds footer (name input, delivery Tabs, send Button, clear-cart Button+AlertDialog)
├── cart-provider.tsx      # MODIFIED — reducer gains CLEAR action
└── layout.tsx             # MODIFIED — mounts <Toaster /> (sonner) alongside CartProvider
```

### Pattern 1: Pure URL-builder helper, no component coupling
**What:** A standalone module exporting functions that take plain data (cart items, unit info, name, delivery type) and return a string — no React, no hooks, no DOM access except inside the component that calls `window.open`.
**When to use:** Any time business logic (message formatting, encoding) can be tested without rendering a component. This matches the project's existing convention (`formatBRL`, `haversineDistanceKm` in `format.ts` are also pure functions consumed by components).
**Example:**
```typescript
// src/lib/menu/whatsapp.ts
import type { CartItem } from './cart-types'
import { formatBRL } from './format'

export type DeliveryType = 'pickup' | 'delivery' | null

export function buildOrderMessage(params: {
  unitName: string
  restaurantName: string
  customerName: string // '' if omitted
  deliveryType: DeliveryType
  items: CartItem[]
}): string {
  const { unitName, restaurantName, customerName, deliveryType, items } = params
  const lines: string[] = []

  lines.push(`Pedido - ${restaurantName} (${unitName})`)
  if (customerName.trim()) lines.push(`Cliente: ${customerName.trim()}`)
  if (deliveryType === 'pickup') lines.push('Retirar no local')
  if (deliveryType === 'delivery') lines.push('Receber em casa')
  lines.push('') // blank line before item list

  for (const item of items) {
    lines.push(`${item.qty}x ${item.name} - ${formatBRL(item.price * item.qty)}`)
    if (item.notes.trim()) lines.push(`  Obs: ${item.notes.trim()}`)
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  lines.push('')
  lines.push(`Subtotal: ${formatBRL(subtotal)}`)

  return lines.join('\n')
}

export function buildWhatsAppUrl(whatsappNumberE164: string, message: string): string {
  const digitsOnly = whatsappNumberE164.replace(/[^0-9]/g, '')
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`
}
```

### Pattern 2: Synchronous click handler for `window.open`
**What:** The handler that builds the URL and opens it must be a plain (non-`async`) function, or — if `async` for other reasons — must call `window.open()` as the very first statement, before any `await`.
**When to use:** Any user-gesture-triggered `window.open()` call targeting a mobile browser, especially iOS Safari.
**Example:**
```typescript
// Source: pattern confirmed against community findings on iOS Safari transient-activation timing
// (see Common Pitfalls below) — no official WhatsApp/Apple doc states an exact millisecond
// threshold, but the synchronous-call rule itself is well corroborated across multiple sources.
function handleSendOrder() {
  const message = buildOrderMessage({ /* ... */ })
  const url = buildWhatsAppUrl(unit.whatsappNumber!, message)
  window.open(url, '_blank') // MUST be synchronous, no await/.then before this line
  toast.success('Pedido enviado! Confira o WhatsApp.') // sonner toast — also synchronous, safe to call right after
}
```

### Anti-Patterns to Avoid
- **`async function handleSendOrder() { await something(); window.open(url) }`:** Breaks iOS Safari's transient-activation window even with sub-second delays (community testing found 0.5s sometimes works, 1s reliably fails) — the popup gets silently blocked with no error thrown. If any async step (e.g., a future analytics call) is needed before opening WhatsApp, call `window.open()` first (even to `about:blank` or directly to the final URL built synchronously from already-available client state) and never gate it behind a promise.
- **Re-validating/re-parsing `whatsappNumber` with `libphonenumber-js` at send time:** Unnecessary — the value is already validated and normalized to E.164 at admin-save time (`upsertUnitSchema`). Re-parsing adds a runtime dependency on a library import in the public customer-facing bundle for no benefit; a simple regex strip (`replace(/[^0-9]/g, '')`) is sufficient and keeps the customer-facing bundle lighter.
- **Using `URLSearchParams` for the `text` param:** Encodes spaces as `+` (form-encoding convention) rather than `%20`; while WhatsApp's parser tolerates this in practice, every authoritative wa.me example uses `encodeURIComponent`-style `%20` encoding — deviating adds unnecessary risk for zero benefit.
- **Leaving the delivery-type `Tabs` uncontrolled:** As described in Standard Stack, base-ui's `TabsRoot` defaults to selecting tab index `0` if no `value`/`defaultValue` is given, silently violating D-04's "no pre-selected option" requirement. Always pass a controlled `value` starting at `null`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL-safe encoding of message text (accents, line breaks, special chars) | Custom percent-encoding or manual `\n` → `%0A` replacement | `encodeURIComponent(message)` | Native, handles every UTF-8 codepoint (including PT-BR accents and any future emoji) correctly and converts `\n` automatically — no edge case a hand-rolled encoder would catch better. |
| Phone number international-format validation | New regex-based phone validator for the send-time path | Nothing new needed — reuse the fact that `whatsappNumber` is already E.164-normalized at write time via the existing `libphonenumber-js`-backed `upsertUnitSchema` | The validation already happened once, at the only place data enters the system (admin form). Re-validating at read time is redundant work for a problem already solved upstream. |
| Toast/notification UI | Custom `<div>` + `setTimeout` dismiss logic | `sonner` (`npx shadcn@latest add sonner`) | Already the project's chosen shadcn-based toast primitive per UI-SPEC; handles stacking, animation, accessibility, and dismiss timing correctly out of the box. |

**Key insight:** Every piece of this phase that looks like it might need a new validation/encoding library is actually already solved by code from Phase 4.1 (phone E.164 normalization) or by JavaScript's own `encodeURIComponent`. The only genuinely new piece of logic is string concatenation (message building) and a `window.open` call — resist the urge to add any new dependency for those two things.

## Common Pitfalls

### Pitfall 1: iOS Safari blocks `window.open()` after async work
**What goes wrong:** Tapping "Enviar pedido via WhatsApp" appears to do nothing on iPhone — no error, no console warning visible to the end user, WhatsApp simply never opens.
**Why it happens:** iOS Safari (more strictly than desktop Safari, Chrome, or Firefox) only treats `window.open()` as a legitimate user-gesture action if it executes within a very short "transient activation" window after the click event. Any `await`, `.then()`, or `setTimeout` between the click and the `window.open()` call — even a few hundred milliseconds — can cause Safari to silently treat the call as a blocked popup.
**How to avoid:** Keep `handleSendOrder` (or whatever the click handler is named) a plain synchronous function. Build the message string and the URL synchronously (all required data — cart items, unit info, name input value, delivery-type state — is already available client-side with no fetch needed), then call `window.open(url, '_blank')` as close to the first line as possible. Fire the `sonner` toast immediately after (also synchronous, safe).
**Warning signs:** If the plan introduces any `async`/`await` in the send handler (e.g., to log an analytics event to a Server Action before opening WhatsApp), flag it — that pattern will break the core happy path on iPhone specifically, which is also explicitly called out as success criterion #4 ("render and send correctly on real mobile devices").

### Pitfall 2: wa.me phone number must be digits-only, no `+`
**What goes wrong:** A `wa.me` link built with `+5511999999999` (including the `+`) in the path can fail to resolve to the correct chat in some mobile WebView/browser combinations, or redirect to a generic WhatsApp landing instead of pre-selecting the contact.
**Why it happens:** WhatsApp's documented click-to-chat format requires the phone number in the URL path to be "full international phone number… without + or leading zeroes" — i.e., digits only, country code included.
**How to avoid:** Since `units.whatsappNumber` is stored as E.164 (`+5511999999999`), strip every non-digit character (`.replace(/[^0-9]/g, '')`) before inserting it into the `wa.me/<here>` path. Do this in `buildWhatsAppUrl`, not scattered across components.
**Warning signs:** A `wa.me` link containing a literal `+` character, parentheses, dashes, or spaces in the path segment (only the `?text=` query value should ever contain encoded special characters).

### Pitfall 3: Base-ui `Tabs` auto-selecting a tab when "no default" is required
**What goes wrong:** The delivery-type selector (D-04: "nenhuma opção vem pré-selecionada por padrão") silently shows "Retirar no local" as already active on first render.
**Why it happens:** Base-ui's `TabsRoot` props default `defaultValue` to `0` (per the type definitions in `@base-ui/react/tabs/root/TabsRoot.d.ts`) when the component is used uncontrolled and neither `value` nor `defaultValue` is explicitly passed.
**How to avoid:** Use the controlled form: maintain `deliveryType` as component state initialized to `null`, pass `value={deliveryType}` and `onValueChange={(value) => setDeliveryType(value)}` to `<Tabs>`. This mirrors the established codebase pattern from Phase 4's `availability-mobile.tsx`, which already handles base-ui's `onValueChange` returning `string | null`.
**Warning signs:** Any `<Tabs>` usage in the new footer that omits an explicit `value` prop.

### Pitfall 4: Re-parsing already-normalized phone numbers
**What goes wrong:** Calling `parsePhoneNumber(unit.whatsappNumber, 'BR')` again at send time, inside client-bundle code, could throw if the stored value somehow doesn't parse (e.g., a unit created before phone validation was added, or future manual DB edits) — turning a simple digit-strip into a crash risk and pulling the (moderately sized) `libphonenumber-js` parsing code into the public customer bundle unnecessarily.
**Why it happens:** Reaching for the "validated" tool out of habit, instead of recognizing the value is already validated upstream.
**How to avoid:** Treat `units.whatsappNumber` as a trusted, already-normalized string by the time it reaches the customer-facing menu. Use a simple `.replace(/[^0-9]/g, '')` strip. If the value is genuinely malformed (legacy data), the resulting digits-only string will simply produce a `wa.me` link that doesn't resolve to a real chat — an acceptable, low-probability edge case for v1, not worth adding defensive re-parsing for.
**Warning signs:** Any new import of `libphonenumber-js` inside `src/lib/menu/whatsapp.ts` or `cart-sheet.tsx`.

### Pitfall 5: Large/long messages exceeding practical limits
**What goes wrong:** A cart with 10+ items plus long observation notes could, in theory, produce a message and URL long enough to be truncated by either WhatsApp's own text-bubble limit or a mobile browser's URL-length cap.
**Why it happens:** WhatsApp text messages have a documented ceiling around 4096 characters for normal session messages (Business API context; the consumer app's practical limit for click-to-chat prefill was not found in an authoritative WhatsApp source during this research — flagged as LOW confidence, see Open Questions). Mobile browser URL length limits (commonly cited informally around 8000 characters for some Android Chrome contexts, tens of thousands for Safari) are generally far above what a realistic restaurant order would produce.
**How to avoid:** Per D-10, this is intentionally NOT solved with truncation logic in code — it is to be validated empirically on a real device, which is success criterion #4 of this phase. The planner should ensure the phase's task list includes an explicit manual test step: build a cart with 10+ items and at least one long observation note, and verify the WhatsApp app opens with the full message intact on both an Android and an iOS device.
**Warning signs:** None to add to the code; this is a manual QA task, not an automated check, per the locked decision.

## Code Examples

### Stripping E.164 to digits-only for the wa.me path
```typescript
// Verified locally: parsePhoneNumber(val, 'BR').number (already used in src/lib/units/schema.ts)
// produces E.164, e.g. "+5511999999999". Confirmed via Node REPL that a simple digit-strip
// produces the exact digits-only format WhatsApp's click-to-chat documentation requires.
const digitsOnly = unit.whatsappNumber!.replace(/[^0-9]/g, '')
// "+5511999999999" -> "5511999999999"
```

### Full URL construction with encodeURIComponent (verified locally with PT-BR accents + newlines)
```typescript
// Verified locally via Node:
//   encodeURIComponent("Pão de Açúcar\nObs: sem cebola")
//   => "P%C3%A3o%20de%20A%C3%A7%C3%BAcar%0AObs%3A%20sem%20cebola"
// Confirms \n -> %0A and UTF-8 accented characters both encode correctly with zero extra logic.
const url = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`
```

### sonner Toaster mount (no ThemeProvider required)
```typescript
// Source: shadcn-ui/ui registry sonner.tsx (apps/v4/registry/new-york-v4/ui/sonner.tsx)
// const { theme = "system" } = useTheme() -- safe default, no ThemeProvider needed in this app.
// src/app/r/[restaurantSlug]/[unitSlug]/layout.tsx
import { Toaster } from '@/components/ui/sonner'
// ...
return (
  <CartProvider storageKey={`cart:${restaurant.id}:${unit.id}`}>
    {children}
    <Toaster />
  </CartProvider>
)
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no Jest/Vitest configured in this project) — established pattern is standalone `tsx`-run scripts (`scripts/verify-*.ts`) hitting the live DB, registered as `npm run verify-*` |
| Config file | none — see Wave 0 |
| Quick run command | `tsx scripts/verify-whatsapp.ts` (proposed, mirrors `verify-menu.ts` pattern) |
| Full suite command | `npm run verify-auth && npm run verify-catalog && npm run verify-availability && npm run verify-units-location && npm run verify-menu && tsx scripts/verify-whatsapp.ts` (all existing verify scripts + the new one) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CART-04 | Order summary (items, qty, notes, subtotal) builds correctly from cart state | unit-style (pure function, no DB) | `tsx scripts/verify-whatsapp.ts` (assert `buildOrderMessage` output contains expected lines) | ❌ Wave 0 |
| CART-05 | `wa.me` URL is correctly formatted/encoded (digits-only number, `encodeURIComponent`-encoded text, `\n`→`%0A`) | unit-style (pure function, no DB) | `tsx scripts/verify-whatsapp.ts` (assert `buildWhatsAppUrl` output structure, decode round-trip) | ❌ Wave 0 |
| CART-05 (real-device rendering) | Message opens correctly in WhatsApp app on real iOS/Android devices, including accents/emoji/large carts | manual-only | N/A — device test, justification: no automated tool can verify the WhatsApp native app's rendering of a deep link | — |
| CART-06 | Empty cart hides send button entirely (not disabled) | manual / component-level (no test framework available) — recommend visual check during `/gsd:verify-work`, not a new automated script | N/A | — |

### Sampling Rate
- **Per task commit:** `tsx scripts/verify-whatsapp.ts` (fast, no DB required if the helper functions take plain objects as input rather than hitting `getUnitBySlug` directly)
- **Per wave merge:** full existing verify-script suite (`npm run verify-menu` at minimum, since this phase touches `cart-provider.tsx` which Phase 5's `verify-menu.ts` does not directly cover but shares the same data layer conventions)
- **Phase gate:** Full suite green + the two manual device checks (real iOS Safari, real Android Chrome) called out in success criterion #4 before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/verify-whatsapp.ts` — new file, covers CART-04/CART-05 pure-function assertions (message structure, digit-stripping, encoding round-trip). No DB fixtures needed if it imports `buildOrderMessage`/`buildWhatsAppUrl` directly with hand-built `CartItem[]` and unit-data objects — can be a fast, DB-free script, an improvement on the heavier `verify-menu.ts` pattern.
- [ ] No new test framework needed — continue the project's existing `tsx scripts/verify-*.ts` convention.

## Open Questions

1. **Exact character limit for `wa.me` click-to-chat prefilled text in the consumer WhatsApp app (not Business API)**
   - What we know: WhatsApp Business API session text messages cap at 4096 characters (documented for the Cloud API/Business context). Mobile browser URL length ceilings are generally far higher (8K+ for Android Chrome in most reported cases, tens of thousands for Safari).
   - What's unclear: No official WhatsApp consumer-app documentation found stating an exact prefill-text character limit for `wa.me` links specifically opened from a mobile browser into the regular WhatsApp (not Business API) app.
   - Recommendation: Rely on D-10's decision — no code-level truncation, validate empirically with a real 10+ item cart + long notes on a real device during phase execution, exactly as success criterion #4 specifies. Do not add a defensive character-limit warning in the UI unless the manual device test in Wave 0 actually surfaces truncation.

2. **Whether `units.address` should appear in the WhatsApp message (Claude's Discretion, not resolved by UI-SPEC)**
   - What we know: `getUnitBySlug` already returns `address`; CONTEXT.md explicitly flags this as open discretion; UI-SPEC's message-format interaction note (#3) lists title/name/delivery-type/items/subtotal but does not mention address.
   - What's unclear: Whether including the unit's address in the message header adds customer value (e.g., for delivery confirmation context) or is redundant noise (the unit is already the wa.me recipient, so the customer is implicitly texting "that" unit).
   - Recommendation: Planner should make an explicit, documented choice. Leaning recommendation based on UI-SPEC's silence: omit it from the message body for v1 (keep the message D-05-minimal: title/name/delivery-type/items/subtotal) since the UI-SPEC's detailed interaction notes already enumerate the exact line structure without address, and adding an unscoped line risks contradicting the "exact format" intent of D-05.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `sonner` (npm) | D-07 toast | ✗ (not yet installed) | latest = 2.0.7 | Install via `npx shadcn@latest add sonner` during this phase — no fallback needed, trivial install |
| `next-themes` (npm, transitive via shadcn sonner) | sonner's theme detection | ✗ (not yet installed) | bundled by shadcn CLI | None needed — works without a `ThemeProvider`, defaults to `"system"` |
| `libphonenumber-js` (npm) | E.164 source data (already normalized at write time) | ✓ | 1.13.6 | — |
| Real iOS device (Safari) | Success criterion #4 manual test | unknown (not verifiable from this environment) | — | Flag for human: physical device or iOS Simulator + real WhatsApp app session needed; cannot be fully verified by an automated script |
| Real Android device (Chrome) | Success criterion #4 manual test | unknown (not verifiable from this environment) | — | Flag for human: physical device or Android emulator + real WhatsApp app session needed |

**Missing dependencies with no fallback:**
- None — `sonner`/`next-themes` install cleanly via the standard shadcn CLI flow; no blocking gaps.

**Missing dependencies with fallback:**
- Real-device testing has no software fallback — it is an inherently manual step per D-10/success criterion #4. The planner should include an explicit manual-verification task in the phase plan rather than attempting to automate it.

## Sources

### Primary (HIGH confidence)
- Live codebase read: `src/lib/units/schema.ts`, `src/db/schema.ts`, `src/lib/menu/queries.ts`, `src/lib/menu/format.ts`, `src/app/r/[restaurantSlug]/[unitSlug]/cart-sheet.tsx`, `cart-provider.tsx`, `cart-types.ts`, `layout.tsx`, `scripts/verify-menu.ts`, `src/components/ui/tabs.tsx`, `src/components/ui/button.tsx`, `src/components/ui/alert-dialog.tsx`, `node_modules/@base-ui/react/tabs/root/TabsRoot.d.ts` — confirmed exact stored phone format, existing component APIs, and base-ui Tabs default-value behavior directly from source.
- `npm view libphonenumber-js version` / `npm view sonner version` — direct registry queries, confirms 1.13.6 and 2.0.7 respectively.
- Local Node REPL verification of `encodeURIComponent` behavior on accented PT-BR text, newlines, and emoji — directly executed, not inferred.

### Secondary (MEDIUM confidence)
- [How to use click to chat | WhatsApp Help Center](https://faq.whatsapp.com/5913398998672934) — fetch was truncated by the tool but cited consistently across multiple independent secondary sources for the phone-format rule (no `+`, no leading zero, no spaces/dashes) and the `wa.me/<number>?text=<encoded>` structure.
- [Understanding window.open() Behavior on iOS Safari | Don't Panic Labs](https://dontpaniclabs.com/blog/post/2025/07/29/understanding-window-open-behavior-on-ios-safari/) — directly fetched, explains transient-activation timing and the synchronous-call requirement with concrete delay testing (0.5s works, 1s+ fails).
- [shadcn-ui/ui GitHub discussions/issues on sonner + next-themes dependency](https://github.com/shadcn-ui/ui/discussions/6829) and [raw sonner.tsx source](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/sonner.tsx) — confirms `next-themes` is a transitive dependency of shadcn's sonner block and that `useTheme()` defaults safely without a provider.

### Tertiary (LOW confidence)
- WhatsApp consumer-app (non-Business-API) exact character limit for `wa.me` prefilled text — no single authoritative source found; cross-referenced WhatsApp Business API's 4096-char session-message limit as the closest documented analog, flagged as Open Question #1, not stated as fact for the consumer app.
- General mobile browser URL length limits (Android Chrome ~8192 chars cited informally) — multiple SEO/technical blog sources agree on the rough order of magnitude but none is an authoritative browser-vendor source; treated as directional only, not a hard constraint to code against (consistent with D-10's "no truncation logic, validate empirically" decision).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries either already installed and verified in the live codebase, or a trivial, well-documented shadcn CLI install (sonner).
- Architecture: HIGH — directly derived from reading the actual Phase 5 code this phase extends; pattern is a straightforward additive pure-function module + component footer extension.
- Pitfalls: HIGH for phone-format and base-ui Tabs default-value issues (verified directly against source/type definitions); MEDIUM for the iOS Safari popup-timing pitfall (well-corroborated across multiple independent sources, but no official Apple/WebKit doc with an exact millisecond threshold was found).

**Research date:** 2026-06-18
**Valid until:** 2026-07-18 (30 days — stable web platform APIs and a small, already-resolved dependency set; revisit only if WhatsApp changes its click-to-chat URL contract or shadcn changes the sonner component's theme dependency)
