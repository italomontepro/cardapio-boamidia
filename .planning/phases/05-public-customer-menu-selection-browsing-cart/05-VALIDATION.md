---
phase: 05
slug: public-customer-menu-selection-browsing-cart
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-17
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected — no Jest/Vitest/RTL in this repo. Existing pattern: hand-written `scripts/verify-*.ts` run via `tsx` against the live Supabase DB. |
| **Config file** | none — Wave 0 creates `scripts/verify-menu.ts` following `scripts/verify-availability.ts`'s exact structure |
| **Quick run command** | `npx tsx scripts/verify-menu.ts` |
| **Full suite command** | same — no quick/full distinction in this project's convention |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit (server-side/data logic):** Run `npx tsx scripts/verify-menu.ts`
- **After every plan wave:** Run the same script + manual click-through in `npm run dev` for any cart/UI behavior touched that wave
- **Before `/gsd:verify-work`:** `verify-menu.ts` green + manual cart flow (add → adjust qty → remove → reload page → confirm localStorage persistence) documented in the final plan's SUMMARY.md
- **Max feedback latency:** ~10 seconds (script) + manual click-through per wave

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-0X-0X | TBD | TBD | MENU-01 (unit list / auto-skip single unit) | live-db smoke | `npx tsx scripts/verify-menu.ts` | ❌ W0 | ⬜ pending |
| 05-0X-0X | TBD | TBD | MENU-02 (categories in sortOrder) | live-db smoke | same | ❌ W0 | ⬜ pending |
| 05-0X-0X | TBD | TBD | MENU-03 (unavailable products excluded) | live-db smoke | same | ❌ W0 | ⬜ pending |
| 05-0X-0X | TBD | TBD | MENU-04 (featured products derived correctly) | live-db smoke | same | ❌ W0 | ⬜ pending |
| 05-0X-0X | TBD | TBD | MENU-05 (formatBRL output) | pure-function assertion | same | ❌ W0 | ⬜ pending |
| 05-0X-0X | TBD | TBD | MENU-06 (0-units / 0-available-in-category empty states) | live-db smoke | same | ❌ W0 | ⬜ pending |
| 05-0X-0X | TBD | TBD | MENU-07 / D-03 (haversineDistanceKm correctness) | pure-function assertion | same | ❌ W0 | ⬜ pending |
| 05-0X-0X | TBD | TBD | CART-01/02/03 (add/adjust/remove, localStorage scoping) | manual | manual click-through during `/gsd:verify-work` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Exact task IDs to be finalized by gsd-planner — this map will be reconciled against the actual PLAN.md files.*

---

## Wave 0 Requirements

- [ ] `scripts/verify-menu.ts` — new script following `scripts/verify-availability.ts`'s exact structure (dotenv walk-up, dynamic imports after `config()`). Asserts: (1) `getRestaurantBySlug` returns null for inactive/nonexistent slugs, (2) `getUnitsForRestaurant` ordering, (3) `getMenuForUnit` correctly excludes unavailable products and derives `featured`, (4) category with all products unavailable is absent from result (D-13), (5) `haversineDistanceKm` against 2-3 known coordinate pairs with expected distances, (6) `formatBRL` output for representative values.
- [ ] No shared fixtures beyond existing seeded restaurant/unit/product data from `scripts/seed.ts`.
- [ ] No test framework install — project convention is hand-written `tsx` + `assert` scripts, not Jest/Vitest/RTL.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Cart add/adjust-qty/remove + localStorage persistence | CART-01, CART-02, CART-03 | No client-side/component test framework installed (no Vitest/RTL); `tsx` scripts cannot render React or access `localStorage`/`window` | In `npm run dev`, add items to cart via product Dialog, adjust quantities and remove items in the bottom sheet, reload the page, confirm cart state persists; switch to a different unit and confirm cart is isolated (D-10) |
| Geolocation permission flow (D-03) | MENU-01 | Requires real browser permission prompt, not testable headlessly | Visit a multi-unit restaurant link, accept/deny the geolocation prompt, confirm graceful fallback to plain card list on denial and nearest-unit ordering on acceptance |
| Tabs navigation + "Destaques" strip + unit indicator (D-05/D-06/D-07) | MENU-02, MENU-04 | Visual/interaction UI, no test framework installed | Click through category tabs, confirm featured strip stays visible across tab switches, confirm current-unit name is always visible |

---

## Validation Sign-Off

- [x] All tasks have automated verify (script) or Wave 0 dependency, except cart/UI interaction items explicitly marked manual-only above
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (all server-side/data-shape logic covered by `verify-menu.ts`; only cart/UI tasks are manual)
- [x] Wave 0 covers all MISSING references (`scripts/verify-menu.ts` to be created)
- [x] No watch-mode flags
- [x] Feedback latency < 10s (script) — manual click-through is per-wave, not per-task
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
