---
phase: 1
slug: foundation-data-model-rls-auth-roles
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-15
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected — greenfield repo. Use `tsx` for lightweight integration scripts; introduce `vitest` if the planner wants a runner now (later phases will need it for CRUD/cart logic). |
| **Config file** | none — Wave 0 creates `scripts/verify-auth.ts` and `scripts/seed.ts` |
| **Quick run command** | `npx tsx scripts/verify-auth.ts --as=<role>` |
| **Full suite command** | `npx tsx scripts/verify-auth.ts` (runs all seeded users/roles) |
| **Estimated runtime** | ~10-20 seconds (network calls to Supabase Auth + Postgres) |

---

## Sampling Rate

- **After every task commit:** For schema/migration tasks, run `drizzle-kit generate` (dry validation) plus the RLS-enabled SQL check (`select relname, relrowsecurity from pg_class where relkind='r' and relnamespace='public'::regnamespace;`). For auth/UI tasks, manually exercise `/admin/login` with each seeded user.
- **After every plan wave:** Run the full `npx tsx scripts/verify-auth.ts` suite (all seeded users × expected scoped results) plus the RLS-enabled check.
- **Before `/gsd:verify-work`:** All three success criteria (super admin login + scoped view, restaurant admin login + scoped view, cross-tenant query returns nothing) must pass via `scripts/verify-auth.ts`, and `relrowsecurity = true` for all 6 tables.
- **Max feedback latency:** ~20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | (schema) | SQL check | `psql "$DATABASE_URL" -c "select relname, relrowsecurity from pg_class where relkind='r' and relnamespace='public'::regnamespace;"` | ✅ (psql available; ad-hoc query, no file) | ⬜ pending |
| TBD | TBD | 0 | (seed) | script | `npx tsx scripts/seed.ts` | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | AUTH-01 | integration (script) | `npx tsx scripts/verify-auth.ts --as=super_admin` | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | AUTH-02 | integration (script) | `npx tsx scripts/verify-auth.ts --as=restaurant_admin_1` | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | AUTH-03 | integration (script) + SQL | `npx tsx scripts/verify-auth.ts --as=restaurant_admin_1 --query=restaurant_b_data` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Planner should fill in actual Task ID / Plan / Wave values once plans are created.*

---

## Wave 0 Requirements

- [ ] Confirm/create the Supabase project and obtain connection strings & keys — prerequisite for everything else, not a code task but must be sequenced first
- [ ] `.env` / `.env.example` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key), `SUPABASE_SECRET_KEY`, `DATABASE_URL` (Session Mode, port 5432, for drizzle-kit), `DATABASE_URL_RUNTIME` (Transaction Mode, port 6543, for app runtime)
- [ ] `scripts/seed.ts` — creates 1 super_admin + admins for 2+ restaurants (D-04), required before AUTH-03 isolation test can run
- [ ] `scripts/verify-auth.ts` — covers AUTH-01, AUTH-02, AUTH-03 (logs in as each seeded user via `supabase-js`, asserts RLS-scoped query results)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| `/admin/login` UX (form submission, redirect-by-role, error states) | AUTH-01, AUTH-02 | Browser-level session/cookie behavior not worth automating with Playwright for a single login form in Phase 1 | Log in as each seeded user in a browser; confirm redirect to `/admin` (super_admin) or `/painel` (restaurant_admin) and that the post-login page shows only the expected scoped data |
| Logout flow | (D-10) | Simple cookie-clearing action | Click logout; confirm redirect to `/admin/login` and that protected routes redirect back to login when accessed afterward |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (Supabase project, env vars, seed script, verify-auth script)
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
