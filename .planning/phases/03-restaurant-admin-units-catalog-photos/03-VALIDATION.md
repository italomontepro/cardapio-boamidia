---
phase: 3
slug: restaurant-admin-units-catalog-photos
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-16
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | tsx integration scripts (pattern established in Phase 1: `scripts/verify-auth.ts`, Phase 2: `scripts/verify-restaurants.ts`) |
| **Config file** | none — convention: `scripts/verify-{domain}.ts` |
| **Quick run command** | `npx tsx scripts/verify-catalog.ts` |
| **Full suite command** | `npx tsx scripts/verify-catalog.ts && npx tsx scripts/verify-restaurants.ts && npx tsx scripts/verify-auth.ts` |
| **Estimated runtime** | ~15-30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsx scripts/verify-catalog.ts`
- **After every plan wave:** Run `npx tsx scripts/verify-catalog.ts && npx tsx scripts/verify-auth.ts`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| UNIT-01 | Create unit → row inserted with correct restaurantId; invalid WhatsApp rejected | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 | ⬜ pending |
| UNIT-01 | Edit unit → updated row; invalid WhatsApp blocked (zod error) | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 | ⬜ pending |
| UNIT-01 | Delete unit → row removed | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 | ⬜ pending |
| UNIT-02 | Create/edit unit with hours text → hours saved | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 | ⬜ pending |
| UNIT-03 | Create category → row with correct restaurantId + sort_order at MAX+1 | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 | ⬜ pending |
| UNIT-03 | Reorder categories (moveUp/moveDown) → sort_order values swapped | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 | ⬜ pending |
| UNIT-03 | Delete category → row removed (products cascade) | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 | ⬜ pending |
| CTLG-01 | Create product → row with name, description, price, isFeatured=false, categoryId | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 | ⬜ pending |
| CTLG-01 | Edit product → updated row | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 | ⬜ pending |
| CTLG-01 | Delete product → row removed | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 | ⬜ pending |
| CTLG-02 | Upload photo → file in Storage at correct path; products.image_url updated | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 | ⬜ pending |
| CTLG-03 | Create product with is_featured=true → isFeatured=true in DB | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 | ⬜ pending |
| CTLG-04 | Move product up/down → sort_order swap in same category | integration | `npx tsx scripts/verify-catalog.ts` | ❌ Wave 0 | ⬜ pending |
| CTLG-05 | Sidebar links render, active state reflects pathname | manual | Browser inspection | — | ⬜ pending |
| CTLG-06 | Accordion renders all categories; product list appears on expand | manual | Browser inspection | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-catalog.ts` — new integration script; pattern-matched to `scripts/verify-restaurants.ts`; covers UNIT-01..03, CTLG-01..04; requires live Supabase Storage for CTLG-02 (photo upload)
- [ ] `npx shadcn@latest add accordion textarea checkbox separator` — must run before any plan that uses these components
- [ ] `next.config.ts` remotePatterns update — must be done before any plan that renders product images via next/image

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar links render, active state correct | CTLG-05 | UI rendering — no headless test infra | Open /painel/unidades and /painel/cardapio in browser; verify active link highlights correctly |
| Accordion renders categories + products | CTLG-06 | UI interaction — expand/collapse | Open /painel/cardapio; verify each category expands to show products inline |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
