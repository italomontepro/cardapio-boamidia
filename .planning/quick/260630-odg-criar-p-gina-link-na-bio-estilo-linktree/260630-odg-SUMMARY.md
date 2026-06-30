---
phase: quick
plan: 260630-odg
subsystem: public-menu
tags: [link-in-bio, linktree, whatsapp, server-component, public-route]
dependency_graph:
  requires:
    - src/lib/menu/queries.ts (getRestaurantBySlug, getUnitsForRestaurant)
    - src/lib/menu/whatsapp.ts (buildWhatsAppUrl)
    - src/components/ui/button.tsx (buttonVariants)
  provides:
    - Public Linktree-style page at /r/[restaurantSlug]/link
  affects:
    - Public URL space for restaurant sharing
tech_stack:
  added: []
  patterns:
    - Server Component with async params (Next.js 16 App Router)
    - buttonVariants applied to <a> tag (Base UI Button has no asChild)
    - notFound() for inactive/missing restaurant, graceful empty state for zero units
key_files:
  created:
    - src/app/r/[restaurantSlug]/link/page.tsx
  modified: []
decisions:
  - Used buttonVariants (not Button asChild) because the project's Button uses Base UI which has no asChild prop — styling anchor tags with buttonVariants is the correct pattern here
metrics:
  duration: "~5 min"
  completed_date: "2026-06-30"
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 260630-odg: Criar Página Link na Bio Estilo Linktree — Summary

**One-liner:** Mobile-first Linktree-style `/r/[slug]/link` page listing restaurant units as WhatsApp pill buttons via `buildWhatsAppUrl`, with disabled state for units lacking a phone number.

## What Was Built

A single new Server Component at `src/app/r/[restaurantSlug]/link/page.tsx` that:

- Fetches restaurant and units using existing `getRestaurantBySlug` / `getUnitsForRestaurant` queries
- Returns 404 via `notFound()` for inactive or nonexistent slugs
- Renders a graceful centered empty state when a valid restaurant has zero units
- Lists each unit as a large rounded pill button using `buttonVariants` applied to `<a>` elements
- Units with a `whatsappNumber` link directly to `wa.me/<digits>?text=<encoded message>` via `buildWhatsAppUrl` (opens in new tab)
- Units without a `whatsappNumber` render as a non-clickable `<div>` styled as a disabled outline pill with "WhatsApp indisponível" label
- Pure Server Component: no `'use client'`, no client state, no geolocation

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Linktree-style link-in-bio page | 17195d5 | src/app/r/[restaurantSlug]/link/page.tsx |

## Deviations from Plan

### Auto-adjusted Approach

**1. [Rule 1 - Incompatible API] Used `buttonVariants` instead of `Button asChild`**
- **Found during:** Task 1 implementation
- **Issue:** The plan specifies `<Button asChild>` wrapping an `<a>`, but the project's Button component uses `@base-ui/react/button` which does not expose an `asChild` prop (that is a Radix UI pattern). Using `asChild` would pass unknown props silently and break the anchor behavior.
- **Fix:** Imported `buttonVariants` from `@/components/ui/button` and applied it directly to the `<a>` tag using `cn(buttonVariants({ size: 'lg' }), ...)`. This is the correct pattern for Base UI in this codebase.
- **Files modified:** src/app/r/[restaurantSlug]/link/page.tsx
- **Commit:** 17195d5

**2. Pre-existing TypeScript errors out of scope**
- `src/app/painel/unidades/unit-location-map.tsx` has 3 TS2307 errors (Leaflet PNG image imports). These pre-exist this task and are unrelated. Logged as deferred — no fix attempted.

## Known Stubs

None — the page is fully wired to live queries and the WhatsApp URL builder.

## Self-Check: PASSED
