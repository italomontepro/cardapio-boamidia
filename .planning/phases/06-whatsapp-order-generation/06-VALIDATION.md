---
phase: 06
slug: whatsapp-order-generation
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-18
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no Jest/Vitest configured) — project convention is standalone `tsx`-run scripts (`scripts/verify-*.ts`) registered as `npm run verify-*` |
| **Config file** | none — Wave 0 creates `scripts/verify-whatsapp.ts` |
| **Quick run command** | `tsx scripts/verify-whatsapp.ts` |
| **Full suite command** | `npm run verify-auth && npm run verify-catalog && npm run verify-availability && npm run verify-units-location && npm run verify-menu && tsx scripts/verify-whatsapp.ts` |
| **Estimated runtime** | ~5 seconds (verify-whatsapp.ts is DB-free, pure-function only) |

---

## Sampling Rate

- **After every task commit:** Run `tsx scripts/verify-whatsapp.ts`
- **After every plan wave:** Run `npm run verify-menu` (shares data layer with this phase) + `tsx scripts/verify-whatsapp.ts`
- **Before `/gsd:verify-work`:** Full suite must be green, plus the two manual device checks below
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 0 | CART-04 | unit-style (pure function, no DB) | `tsx scripts/verify-whatsapp.ts` (assert `buildOrderMessage` output) | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 0 | CART-05 | unit-style (pure function, no DB) | `tsx scripts/verify-whatsapp.ts` (assert `buildWhatsAppUrl` structure + decode round-trip) | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | CART-04, CART-06 | component wiring (CartSheet footer) | `tsx scripts/verify-whatsapp.ts` + manual visual check | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | CART-05 | manual-only | N/A — see Manual-Only Verifications | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-whatsapp.ts` — new file, DB-free, covers CART-04/CART-05 pure-function assertions (message structure, digit-stripping, encoding round-trip) by importing `buildOrderMessage`/`buildWhatsAppUrl` directly with hand-built `CartItem[]` and unit-data objects.
- [ ] No new test framework needed — continues the project's existing `tsx scripts/verify-*.ts` convention.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Message opens correctly in the WhatsApp app on real iOS Safari and Android Chrome, including accents/emoji/large (10+ item) carts | CART-05 | No automated tool can verify the native WhatsApp app's rendering of a `wa.me` deep link | Open the public menu on a real iOS device (Safari) and a real Android device (Chrome), add 10+ items with accented/emoji notes, tap "Enviar pedido via WhatsApp", confirm WhatsApp opens with the correctly formatted, undamaged message |
| Empty cart hides the send button entirely (not just disabled) | CART-06 | No test framework configured for component-level assertions | Open the cardápio with an empty cart, open the CartSheet, confirm no "Enviar pedido" button is rendered |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-18 (gsd-plan-checker, Phase 6 plan verification)
