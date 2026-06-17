# Roadmap: Boa Mídia — Cardápio Digital

## Overview

This roadmap delivers a multi-tenant SaaS digital menu platform end-to-end, following the natural dependency chain: a correct, isolated data model and auth foundation first; then platform-level restaurant provisioning; then restaurant admin tools to build out units, catalog, and photos; then per-unit availability (the most multi-tenant-specific feature); then the public customer-facing menu and cart; and finally the WhatsApp order generation that is the core value proposition. Each phase produces a demoable increment, and by the end of Phase 6 a real customer can open a restaurant's link, pick a unit, browse an availability-filtered menu, build a cart, and send a formatted order via WhatsApp.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation — Data Model, RLS & Auth Roles** - Multi-tenant schema, Row Level Security, and admin login for both roles is in place and verified secure (completed 2026-06-15)
- [x] **Phase 2: Platform Super-Admin — Restaurant Provisioning** - Super admin can log in and fully manage the list of restaurants on the platform (completed 2026-06-16)
- [x] **Phase 3: Restaurant Admin — Units, Catalog & Photos** - Restaurant admin can log in and build out their units, categories, products, and product photos (completed 2026-06-16)
- [x] **Phase 4: Per-Unit Availability Management** - Restaurant admin can control which products are available at which units (completed 2026-06-16)
- [ ] **Phase 04.1: Localização de Unidades via Mapa (INSERTED)** - Restaurant admin can pin each unit's exact lat/lng through a 3-step wizard with an interactive map, supplying the data Phase 5's "nearest unit" feature depends on
- [ ] **Phase 5: Public Customer Menu — Selection, Browsing & Cart** - Customers can open a restaurant's link, pick a unit, browse the availability-filtered menu, and build a cart
- [ ] **Phase 6: WhatsApp Order Generation** - Customers can send a complete, well-formatted order from their cart directly to the chosen unit's WhatsApp

## Phase Details

### Phase 1: Foundation — Data Model, RLS & Auth Roles
**Goal**: The multi-tenant data model exists with Row Level Security correctly enforced, and both admin roles (platform super-admin and restaurant admin) can authenticate against it with strict tenant isolation.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. A super admin user can log in to a platform admin area
  2. A restaurant admin user can log in to a restaurant admin area, scoped only to their own restaurant
  3. Logging in as one restaurant's admin and querying another restaurant's data returns nothing (cross-tenant isolation verified)
  4. Database schema for restaurants, units, categories, products, availability, and admin users exists with RLS enabled on every table
**Plans**: 5 plans
Plans:
- [x] 01-01-PLAN.md — Scaffold Next.js 16 app, install deps, provision Supabase project, configure Drizzle (Session/Transaction mode)
- [x] 01-02-PLAN.md — Define Drizzle schema for all 6 tables and apply initial migration
- [x] 01-03-PLAN.md — Write and apply RLS policy migration (helper functions + policies for all 6 tables)
- [x] 01-04-PLAN.md — Implement @supabase/ssr clients, session middleware, and seed script (1 super admin + 2 restaurant admins)
- [x] 01-05-PLAN.md — Implement login/logout, /admin and /painel landing pages, and verify-auth script

### Phase 2: Platform Super-Admin — Restaurant Provisioning
**Goal**: The platform super-admin can fully manage the roster of restaurant tenants, including provisioning each restaurant's first admin user.
**Depends on**: Phase 1
**Requirements**: PLAT-01, PLAT-02, PLAT-03, PLAT-04, PLAT-05
**Success Criteria** (what must be TRUE):
  1. Super admin can create a new restaurant with a unique name and slug (the future menu link)
  2. Super admin can edit an existing restaurant's details
  3. Super admin can activate or deactivate a restaurant
  4. Super admin can see a list of all restaurants on the platform
  5. When a restaurant is created, its first admin user is provisioned and can log in scoped to that restaurant
**Plans**: TBD
**UI hint**: yes

### Phase 3: Restaurant Admin — Units, Catalog & Photos
**Goal**: A restaurant admin can fully build out their restaurant's structure and menu content: branches/units with contact info, categories, products with descriptions and prices, and product photos.
**Depends on**: Phase 2
**Requirements**: UNIT-01, UNIT-02, UNIT-03, CTLG-01, CTLG-02, CTLG-03, CTLG-04, CTLG-05, CTLG-06
**Success Criteria** (what must be TRUE):
  1. Restaurant admin can create, edit, and remove units/branches with name, address, and WhatsApp number, and an invalid WhatsApp number format is rejected
  2. Restaurant admin can set displayed operating hours for each unit
  3. Restaurant admin can create, edit, remove, and reorder menu categories
  4. Restaurant admin can create, edit, remove, and reorder products within a category, including name, description, and price
  5. Restaurant admin can upload a photo for each product
  6. Restaurant admin can mark a product as "featured/promo"
**Plans**: 4 plans
Plans:
- [x] 03-01-PLAN.md — Setup: shadcn components, next/image remotePatterns, Drizzle relations, verify-catalog stub, Storage bucket
- [x] 03-02-PLAN.md — Sidebar layout + Units CRUD (WhatsApp validation, hours)
- [x] 03-03-PLAN.md — Categories CRUD + reorder (sort_order swap)
- [x] 03-04-PLAN.md — Products CRUD + photo upload + accordion cardapio
**UI hint**: yes

### Phase 4: Per-Unit Availability Management
**Goal**: A restaurant admin can control, per unit, which products are currently available — the foundation for the customer menu showing only what each branch actually offers.
**Depends on**: Phase 3
**Requirements**: CTLG-07
**Success Criteria** (what must be TRUE):
  1. Restaurant admin can toggle a product's availability on/off for each individual unit
  2. Toggling availability for one unit does not affect the product's availability at other units
  3. A documented default applies when no explicit availability record exists for a product/unit pair
**Plans**: 2 plans
Plans:
- [x] 04-01-PLAN.md — Wave 0 setup: shadcn switch/select/tooltip, Disponibilidade nav link, verify-availability script
- [x] 04-02-PLAN.md — toggleAvailability Server Action + /painel/disponibilidade page + desktop matrix & mobile views (optimistic)
**UI hint**: yes

### Phase 04.1: Localização de unidades via mapa - lat/lng e formulário em etapas no admin (INSERTED)

**Goal:** O admin do restaurante consegue definir a localização precisa de cada unidade através de um formulário em etapas com seleção interativa no mapa, fornecendo o dado de lat/lng que a Fase 5 depende para sugerir a unidade mais próxima ao cliente.
**Requirements**: None mapped (urgent inserted phase — de facto requirement stated in CONTEXT.md `<domain>`)
**Depends on:** Phase 4
**Success Criteria** (what must be TRUE):
  1. The `units` table has nullable lat/lng columns; existing Phase-3 units remain valid (lat/lng null)
  2. A restaurant admin can set a unit's exact location via a 3-step wizard (Básico → Contato/Horário → Localização) with progress indicator and Próximo/Voltar navigation
  3. Step 3 shows an interactive Leaflet/OSM map; entering it auto-geocodes the typed address (Nominatim) and the admin can drag the pin to adjust, or search again manually
  4. Location is optional — a unit can be saved without a pin and is flagged with a discreet "Sem localização" badge in the units table
**Plans:** 3/4 plans executed
Plans:
- [x] 04.1-01-PLAN.md — Install leaflet/react-leaflet, add nullable lat/lng to units schema + migration, Wave 0 verify-units-location script
- [x] 04.1-02-PLAN.md — Extend upsertUnitSchema with lat/lng, persist in createUnit/updateUnit, server-side Nominatim geocode helper + geocodeUnitAddress Server Action
- [x] 04.1-03-PLAN.md — Client-only Leaflet map widget (draggable marker, icon fix, recenter) + next/dynamic ssr:false loader
- [ ] 04.1-04-PLAN.md — 3-step wizard refactor (progress indicator, step-gated nav), Step 3 map with auto-geocode + manual search, "Sem localização" badge on units table

### Phase 5: Public Customer Menu — Selection, Browsing & Cart
**Goal**: A customer can open a restaurant's unique link, choose their unit, browse that unit's availability-filtered menu, and assemble a cart with quantities and notes — all on a fast, mobile-first, pt-BR formatted experience.
**Depends on**: Phase 4
**Requirements**: MENU-01, MENU-02, MENU-03, MENU-04, MENU-05, MENU-06, MENU-07, CART-01, CART-02, CART-03
**Success Criteria** (what must be TRUE):
  1. Customer visiting the restaurant's link sees a unit-selection page showing each unit's name, address, and hours
  2. After picking a unit, customer sees the menu organized by category in the admin-defined order, with name, description, photo, and price for each product
  3. Only products available at the selected unit are shown, and featured products are visually highlighted
  4. Prices display in pt-BR currency format (R$) and the layout is responsive/mobile-first
  5. Empty states are handled gracefully (no units, category with no available products)
  6. Customer can add products to a cart with quantities, add per-item notes, and adjust quantities or remove items afterward
**Plans**: TBD
**UI hint**: yes

### Phase 6: WhatsApp Order Generation
**Goal**: A customer can review their full order and send it as a correctly formatted message via WhatsApp directly to the selected unit's number, completing the core value loop end-to-end.
**Depends on**: Phase 5
**Requirements**: CART-04, CART-05, CART-06
**Success Criteria** (what must be TRUE):
  1. Customer sees an order summary (items, quantities, notes, subtotal) before sending
  2. Customer can tap "send order" and it opens WhatsApp (wa.me) pre-filled with a correctly formatted, properly encoded message addressed to the selected unit's number
  3. An empty cart shows an appropriate state and cannot be sent
  4. Order messages with accents, emojis, and large carts (10+ items) render and send correctly on real mobile devices
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 04.1 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation — Data Model, RLS & Auth Roles | 5/5 | Complete   | 2026-06-15 |
| 2. Platform Super-Admin — Restaurant Provisioning | 4/4 | Complete   | 2026-06-16 |
| 3. Restaurant Admin — Units, Catalog & Photos | 4/4 | Complete   | 2026-06-16 |
| 4. Per-Unit Availability Management | 2/2 | Complete   | 2026-06-16 |
| 04.1. Localização de Unidades via Mapa (INSERTED) | 3/4 | In Progress|  |
| 5. Public Customer Menu — Selection, Browsing & Cart | 0/TBD | Not started | - |
| 6. WhatsApp Order Generation | 0/TBD | Not started | - |
