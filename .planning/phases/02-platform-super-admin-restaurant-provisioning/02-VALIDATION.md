---
phase: 2
slug: platform-super-admin-restaurant-provisioning
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-15
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured — `tsx` integration scripts (Phase 1 convention, see `scripts/verify-auth.ts`) |
| **Config file** | none — Wave 0 creates `scripts/verify-restaurants.ts` |
| **Quick run command** | `npx tsx scripts/verify-restaurants.ts` |
| **Full suite command** | `npx tsx scripts/verify-restaurants.ts && npx tsx scripts/verify-auth.ts` |
| **Estimated runtime** | ~10-20 seconds (direct Postgres + Auth API calls, no UI) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsx scripts/verify-restaurants.ts`
- **After every plan wave:** Run `npx tsx scripts/verify-restaurants.ts && npx tsx scripts/verify-auth.ts` (regression check — D-11 modifies `login()`)
- **Before `/gsd:verify-work`:** Full suite must be green, plus manual UAT for D-06 and D-12 (UI-only behaviors)
- **Max feedback latency:** ~20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | Wave 0 | setup | `npx tsx scripts/verify-restaurants.ts` (stub) | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PLAT-01 | integration | `npx tsx scripts/verify-restaurants.ts` — create restaurant, assert new row with expected slug | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PLAT-01 (D-05) | integration | `npx tsx scripts/verify-restaurants.ts` — duplicate slug rejected, no duplicate row created | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PLAT-02 | integration | `npx tsx scripts/verify-restaurants.ts` — update restaurant row, assert change persisted | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PLAT-03 | integration | `npx tsx scripts/verify-restaurants.ts` — toggle `is_active`, assert flip | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PLAT-04 | integration | `npx tsx scripts/verify-restaurants.ts` — assert listing query returns expected rows/columns (incl. admin count) | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PLAT-05 | integration | `npx tsx scripts/verify-restaurants.ts` — create restaurant provisions `admin_users` + `auth.users`, temp password allows `signInWithPassword` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | PLAT-05 (D-07 rollback) | integration | `npx tsx scripts/verify-restaurants.ts` — simulate `admin_users` insert failure, assert orphaned `auth.users` row cleaned up and no `restaurants` row remains | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | D-11 | integration | `npx tsx scripts/verify-auth.ts` (extended) — `restaurant_admin` of inactive restaurant denied login | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | D-11 | integration | `npx tsx scripts/verify-auth.ts` (extended) — `super_admin` login unaffected by `is_active` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs and exact plan/wave assignments to be filled in by the planner — this table maps phase requirements to the required automated commands and Wave 0 dependencies.*

---

## Wave 0 Requirements

- [ ] `scripts/verify-restaurants.ts` — new integration script (pattern-matched to `scripts/verify-auth.ts`) covering PLAT-01..05 and D-07 rollback
- [ ] Extend `scripts/verify-auth.ts` (or add a sibling script) — covers D-11's `is_active` login gate for `restaurant_admin` (denied when inactive) and `super_admin` (unaffected)
- [ ] `npm install slugify` — required before any task that uses `generateSlug()` (D-04)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Slug-edit warning on active restaurant | PLAT-02 (D-06) | UI-only copy/interaction, no automatable assertion in tsx-script-based validation | Edit the slug of an active restaurant in the Dialog; confirm the warning copy appears before saving |
| Deactivate confirmation flow | PLAT-03 (D-12) | UI-only interaction (AlertDialog), no automatable assertion in tsx-script-based validation | Click "Desativar"; confirm AlertDialog appears; Cancel leaves `is_active=true`; Confirm flips it to `false` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
