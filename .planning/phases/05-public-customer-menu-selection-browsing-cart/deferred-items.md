# Deferred Items — Phase 05

Issues discovered during plan execution that are out of scope for the current
plan's task changes (pre-existing, unrelated files) and therefore not auto-fixed.

## From 05-04 execution

- **`src/app/painel/unidades/unit-location-map.tsx`** — `npx tsc --noEmit` reports
  3 pre-existing errors (`TS2307: Cannot find module 'leaflet/dist/images/marker-icon.png'`
  etc.) for the Leaflet marker icon image imports. This file was created in Phase
  04.1 (commit `35b8a64`, plan 04.1-03) and is unrelated to Phase 05 Plan 04's
  scope (`src/app/r/[restaurantSlug]/[unitSlug]/*`). Likely needs a `@types`
  declaration or `declare module` shim for `*.png` imports from the `leaflet`
  package, or switching to `next/image`-friendly static imports. Not fixed here
  per the deviation rules' scope boundary (pre-existing failures in unrelated
  files are out of scope for this plan).
