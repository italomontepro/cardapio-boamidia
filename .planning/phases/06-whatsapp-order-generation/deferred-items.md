# Deferred Items — Phase 06

Issues discovered during execution that are out of scope for the current plan (pre-existing,
unrelated to the files this plan modifies). Logged per executor SCOPE BOUNDARY rule — not fixed.

## 06-01

- **Pre-existing type errors in `src/app/painel/unidades/unit-location-map.tsx`** (Phase 04.1,
  not touched by 06-01): `tsc --noEmit` reports 3 `TS2307` errors for missing type declarations
  on `leaflet/dist/images/marker-icon.png`, `marker-icon-2x.png`, `marker-shadow.png`. Confirmed
  unrelated to `whatsapp.ts`, `cart-provider.tsx`, or the unit `layout.tsx` — present before this
  plan's changes and outside this plan's `files_modified` scope. Needs a `.png` module
  declaration (e.g. `declare module '*.png'` in a `.d.ts`) or switching to `next/image`-compatible
  imports; flag for a future Phase 04.1 follow-up or maintenance task.
