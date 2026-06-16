---
phase: 4
slug: per-unit-availability-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-16
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | tsx scripts (no jest/vitest — project uses integration scripts) |
| **Config file** | none — scripts run directly via `npx tsx scripts/verify-X.ts` |
| **Quick run command** | `npm run verify-availability` |
| **Full suite command** | `npm run verify-auth && npm run verify-catalog && npm run verify-availability` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run verify-availability`
- **After every plan wave:** Run `npm run verify-auth && npm run verify-catalog && npm run verify-availability`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-T01 | 04-01 | 0 | CTLG-07 | integration | `npm run verify-availability` | ❌ W0 | ⬜ pending |
| 04-02-T01 | 04-02 | 1 | CTLG-07 | integration | `npm run verify-availability` | ✅ after W0 | ⬜ pending |
| 04-02-T02 | 04-02 | 1 | CTLG-07 | integration | `npm run verify-availability` | ✅ after W0 | ⬜ pending |
| 04-02-T03 | 04-02 | 1 | CTLG-07 | integration | `npx tsc --noEmit` | ✅ always | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-availability.ts` — covers CTLG-07 (toggle INSERT/DELETE, unit isolation, default=available)
  - Pattern: reuse dotenv + dynamic import + db structure from `scripts/verify-catalog.ts`
  - Assertions:
    1. INSERT row → product is unavailable at that unit
    2. DELETE row → product is available again (absence = available)
    3. Unit A toggle does not affect Unit B (same product)
    4. Product with no row returns as available
  - Add `"verify-availability": "tsx scripts/verify-availability.ts"` to `package.json` scripts

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Switch optimistic update (UI) | CTLG-07 | useOptimistic feedback is visual, not testable via script | Toggle a switch, verify instant UI response before server completes |
| Cross-unit isolation (UI) | CTLG-07 | Matrix visual state | Mark product unavailable in unit A, confirm unit B column unchanged |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
