---
plan: 03-01
phase: 03-restaurant-admin-units-catalog-photos
status: complete
wave: 1
completed: 2026-06-16
---

# Summary: 03-01 Setup — Infrastructure for Phase 3

## One-liner
Installed shadcn accordion/textarea/checkbox/separator, configured next/image remotePatterns for Supabase Storage CDN, added Drizzle relations() to schema.ts, and created verify-catalog.ts stub.

## What Was Built

### T01: shadcn components + next/image remotePatterns
- Installed via `npx shadcn@latest add`: accordion, textarea, checkbox, separator
- Added `images.remotePatterns` to `next.config.ts` for `*.supabase.co` Storage CDN

### T02: Drizzle relations + verify-catalog.ts stub
- Added `relations()` exports to `src/db/schema.ts` for all 6 tables (restaurants, units, categories, products, productAvailability, adminUsers)
- Created `scripts/verify-catalog.ts` stub following `scripts/verify-restaurants.ts` pattern

### T03: Supabase Storage bucket (human checkpoint)
- User acknowledged: create bucket `product-images` (Public: ON) in Supabase Dashboard before testing photo upload

## Key Decisions
- D-19: remotePatterns set to `*.supabase.co/storage/v1/object/public/**`
- Drizzle relations() added as metadata only — no SQL migration needed

## Files Created/Modified
- `next.config.ts` — added images.remotePatterns
- `src/db/schema.ts` — added relations() exports
- `scripts/verify-catalog.ts` — stub created
- `src/components/ui/accordion.tsx`, `textarea.tsx`, `checkbox.tsx`, `separator.tsx` — installed

## Self-Check: PASSED
- shadcn components importable
- remotePatterns configured
- Drizzle relations exported
- verify-catalog.ts stub exists
