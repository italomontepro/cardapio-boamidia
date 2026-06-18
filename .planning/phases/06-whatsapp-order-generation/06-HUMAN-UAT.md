---
status: partial
phase: 06-whatsapp-order-generation
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md]
started: 2026-06-18T06:21:25Z
updated: 2026-06-18T06:30:00Z
---

## Current Test

number: 1
name: Real-device WhatsApp send flow (iOS Safari + Android Chrome)
expected: |
  On both a real iOS Safari device and a real Android Chrome device:
  empty cart hides the send button; a 10+ item cart with accented/emoji
  notes opens WhatsApp with the full, undamaged message; the post-send
  toast fires and the cart is preserved; clear-cart works behind the
  AlertDialog confirm; a unit with no whatsappNumber shows the red
  warning instead of the send button.
awaiting: user response

## Tests

### 1. Real-device WhatsApp send flow (iOS Safari + Android Chrome)
expected: |
  Manual verification procedure (8 steps), run on a REAL iOS device
  (Safari) and a REAL Android device (Chrome):
  1. Open a unit menu with an empty cart -> confirm NO "Enviar pedido
     via WhatsApp" button is rendered (hidden, not disabled) -- CART-06.
  2. Add 10+ items, including at least one item with an accented/emoji
     note (e.g. "Pão de Açúcar 🍕 sem cebola").
  3. Type a name, pick "Retirar no local".
  4. Tap "Enviar pedido via WhatsApp".
  5. Confirm WhatsApp opens with the correct unit's chat pre-selected,
     the full message is intact (accents, line breaks, all 10+ items,
     subtotal), nothing truncated -- CART-05 + Phase 6 success
     criterion #4.
  6. Confirm the "Pedido enviado! Confira o WhatsApp." toast appears,
     and the cart is STILL intact after returning to the app -- D-06.
  7. Tap "Limpar carrinho" -> confirm the AlertDialog appears ->
     "Limpar tudo" empties the cart.
  8. (Optional) Visit a unit with no whatsappNumber configured ->
     confirm the red warning replaces the send button -- D-09.
result: pending
reason: |
  Skipped for now by explicit user decision ("Pular o teste em
  dispositivo por agora") rather than performed or silently marked
  passed. Root blocker: the live database currently has zero seeded
  `units` rows (4 restaurants exist, 0 units), so there is no unit
  with a `whatsappNumber` from which to even construct a wa.me test
  URL inside this environment -- let alone open it on a physical
  device. Requires either seeding at least one unit with a real
  WhatsApp number (via /painel/unidades or a seed script) before this
  test can be attempted, then real iOS Safari + Android Chrome
  testing as described above.

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

- truth: "Order messages with accents, emojis, and large carts (10+ items) render and send correctly on real mobile devices"
  status: pending
  reason: "No seeded units with a whatsappNumber exist in the live DB at the time of Phase 6 execution, so no test wa.me URL could be constructed; user explicitly chose to skip the device test for now rather than fake/simulate it."
  severity: major
  test: 1
  root_cause: ""
  artifacts: []
  missing:
    - "Seed at least one unit with a real/valid WhatsApp number (E.164) via /painel/unidades or scripts/seed.ts"
    - "Real iOS Safari device test of the 8-step procedure above"
    - "Real Android Chrome device test of the 8-step procedure above"
  debug_session: ""
