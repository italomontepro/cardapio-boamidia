# Feature Research

**Domain:** Multi-tenant digital menu / WhatsApp-ordering SaaS for restaurants (Brazil, small/medium businesses)
**Researched:** 2026-06-15
**Confidence:** MEDIUM

## Feature Landscape

Brazilian digital menu products (Cardápio Web, Goomer, Saipos, Cardapex, Cardapiofast, Consumer/MenuDino, meucardapio.ai, Brendi) converge on a common pattern: a no-login, link/QR-code-based menu that customers browse and use to build an order, which is then sent to the restaurant via WhatsApp (either as a formatted text message, or — in more advanced/paid tools — via deeper WhatsApp Business API/catalog integration). Adoption of QR-code menus in Brazil is high (Abrasel: ~38% already adopted, ~25% planning to). Most competitors bundle far more than the "send order via WhatsApp" core — online payments (PIX/cards), order status tracking, loyalty/cashback, delivery zone management, kitchen printer integration, and analytics dashboards. Boa Mídia's v1 deliberately strips most of this to focus on the thinnest viable loop: browse → cart → wa.me message. That's a valid and common entry point (several budget/free tools position themselves exactly this way), but it means v1 will look "basic" next to incumbents — the differentiation has to come from multi-tenant/multi-unit architecture, ease of restaurant onboarding, and polish of the core flow, not feature breadth.

### Table Stakes (Users Expect These)

Features users assume exist for *any* digital menu product. Missing these makes the product feel broken or incomplete, even for a minimal v1.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Menu browsing by category | Universal pattern — every digital menu groups products into categories (Lanches, Bebidas, etc.) | LOW | Simple list/grid grouped by category; sticky category nav is a common nicety but not required for v1 |
| Product cards with photo, name, description, price | Customers expect to see what they're ordering before adding to cart | LOW | Photo upload + storage (Supabase Storage) is the main cost driver here, not the display |
| Cart with quantity adjustment | Even the most minimal ordering flow needs add/remove/quantity controls | LOW-MEDIUM | State can be client-side only (no persistence needed across sessions for v1) |
| Item notes/observations ("sem cebola", "ponto da carne") | Brazilian food ordering culture relies heavily on customization notes; absence feels broken | LOW | Free-text field per cart item, included in WhatsApp message |
| Order summary before sending | Customers expect a final review step (items, quantities, subtotal) before committing | LOW | Can be the same screen as the cart, just with a "Enviar pedido" CTA |
| WhatsApp send with pre-filled order message | This *is* the core value proposition — the entire product hinges on it | MEDIUM | wa.me links have practical length limits on some devices/browsers; long carts (many items + notes) can produce messages that truncate or fail to open WhatsApp. Needs message-formatting strategy and testing across Android/iOS/desktop |
| No login required for end customers | Friction-free ordering is the norm — competitors explicitly market "sem cadastro" / "sem app" | LOW | Already part of design; just don't add accidental auth gates |
| Mobile-first responsive design | Vast majority of QR-code menu access is on phones | LOW-MEDIUM | Tailwind makes this manageable, but needs real device testing (WhatsApp deep links behave differently on iOS Safari vs Android Chrome vs in-app browsers) |
| Restaurant branding (logo, name, colors) on menu page | Customers need to recognize which restaurant they're ordering from, especially via shared QR/link | LOW | Minimal: logo + restaurant name in header is enough for v1 |
| Per-unit product availability ("esgotado"/unavailable items hidden or marked) | Multi-unit reality: a product sold at Unit A may not exist at Unit B; showing unavailable items as orderable breaks trust | MEDIUM | Requires a join table (product × unit × available boolean) — directly named in PROJECT.md requirements |
| Unit selection before menu (address, WhatsApp number visible) | With multiple branches, customer must know which unit they're ordering from/picking up at | LOW-MEDIUM | Simple list of units with name + address; could later add "nearest unit" but not required for v1 |
| Admin login (both platform admin and restaurant admin) | Any multi-tenant SaaS needs authenticated admin areas | MEDIUM | Two roles/scopes — straightforward with Supabase Auth + RLS, but role-based access adds design complexity |
| Admin CRUD: categories & products | Core content management — restaurant admin must be able to update menu without developer involvement | MEDIUM | Standard CRUD forms; ordering/sorting of categories and products adds modest complexity |
| Admin CRUD: product photo upload | Photos are table stakes for the customer-facing menu, so the upload UX is table stakes for admin | MEDIUM | Image upload, storage, and (ideally) basic resize/compression — Supabase Storage + client-side resize is typical |
| Admin CRUD: units/branches (name, address, WhatsApp number) | Required for the multi-unit model described in PROJECT.md | LOW-MEDIUM | Simple CRUD, but WhatsApp number format validation (international format for wa.me) matters |
| Admin: per-unit availability toggle for products | Direct requirement — restaurant admin must control which products show per unit | MEDIUM | UI pattern: matrix/checklist (products × units) or per-product toggle list per unit |
| Platform super-admin CRUD: restaurants (create/edit/deactivate) | Core SaaS operation — onboarding and offboarding tenants | MEDIUM | Includes provisioning the restaurant's first admin user/credentials and initial slug/link |
| Unique, shareable restaurant link/slug | The entire customer entry point depends on a stable, human-readable URL (e.g., `/r/restaurante-slug`) | LOW-MEDIUM | Slug uniqueness validation, generation from restaurant name, collision handling |
| Empty/error states (empty cart, no units, no products in category) | Basic UX hygiene — without these the app feels unfinished or buggy when data is sparse (common during onboarding) | LOW | Easy to skip, easy to regret — should be planned from the start |

### Differentiators (Competitive Advantage)

Features that set Boa Mídia apart from generic single-restaurant menu tools, or that align with its multi-tenant SaaS positioning. Not required for the core loop, but valuable for adoption and retention.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| True multi-tenant architecture with shared menu, per-unit availability | Most competing "multi-unit" tools are bolted onto single-restaurant products; Boa Mídia's data model (restaurant → units → shared catalog with per-unit availability) is the architectural core and is genuinely harder to retrofit later than to build correctly now | MEDIUM-HIGH | This is the central design decision in PROJECT.md — gets it right now or pay a costly migration later |
| Fast restaurant onboarding (platform admin provisions new tenant in minutes) | SaaS growth depends on low friction to add new paying customers; if onboarding a restaurant requires manual DB work, it doesn't scale | MEDIUM | Worth investing in once core loop validated — a guided "create restaurant" wizard (name, slug, first unit, first admin user) |
| Clean, fast, ad-free customer menu page | Many Brazilian competitors clutter the menu with their own branding, upsells, or "powered by" banners; a clean, fast, restaurant-branded experience is a differentiator for restaurant owners choosing a platform | LOW-MEDIUM | Mostly a design/performance discipline, not new functionality — Next.js + Tailwind already supports this well |
| WhatsApp message formatting quality (clear, professional order summary) | The generated message is the restaurant's first impression of the order — well-structured (itemized, with notes, subtotal, unit name) messages reduce back-and-forth and errors vs. competitors' often messy auto-generated text | LOW-MEDIUM | Pure logic/formatting work — high value relative to cost, directly improves the core value prop |
| Category/product ordering control (drag-and-drop or simple order field) | Restaurant admins care a lot about menu order (highlighting popular/high-margin items first) — competitors with rigid alphabetical-only ordering frustrate owners | LOW-MEDIUM | Simple integer "sort order" field + basic up/down controls is enough; full drag-and-drop can wait |
| "Featured"/highlighted products (e.g., "Mais pedido", "Promoção") | Common ask from restaurant owners to drive attention to specific items without full promo/discount engine | LOW | A boolean flag + badge rendering — small effort, visible value |
| Multiple languages / currency formatting (R$ locale-correct) | Even for Brazil-only v1, correct `pt-BR` currency and date formatting signals polish | LOW | Use `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})` — trivial but easy to get wrong |
| Per-unit operating hours / "fechado agora" indicator | Customers landing on a closed unit's menu and ordering anyway is a common complaint in WhatsApp-ordering setups; showing hours (even static, non-enforced) builds trust | LOW-MEDIUM | Could start as a simple display field (no real-time enforcement) and evolve later |

### Anti-Features (Commonly Requested, Often Problematic — Explicitly Out of Scope for v1)

Features that are standard in mature competitors (CardapioWeb, Goomer, Saipos, Brendi) and will likely be requested by restaurant owners, but are explicitly deferred per PROJECT.md's "Out of Scope" section. Documenting them here prevents scope creep during roadmap/requirements work.

| Feature | Why Requested | Why Problematic (for v1) | Alternative |
|---------|---------------|------------------|-------------|
| Online payment (PIX, credit card checkout) | Every mature competitor offers it; restaurant owners will ask "where's the pay button?" | Massive scope increase: payment gateway integration, reconciliation, refunds, compliance, security review — completely changes the trust/liability model of the product | v1 explicitly keeps payment "fora do sistema" — order is agreed via WhatsApp, payment happens at delivery/pickup as today. Revisit only after the core ordering loop is validated |
| Order persistence / order history / status tracking ("recebido → preparando → entregue") | Standard expectation from food-delivery-app users (iFood, Rappi-style UX) | Requires order data model, real-time updates (websockets/polling), restaurant-side order management UI, notification system — a second product on top of the menu | v1 sends the order as a WhatsApp message only; the conversation in WhatsApp *is* the order management system for now. Order history can be added later as an additive layer without changing the core menu model |
| Public restaurant self-signup | Lowers friction to grow tenant count without platform-admin involvement | Requires billing/plans, abuse prevention, email verification, onboarding automation — premature before there's a proven onboarding flow and pricing model | Platform super-admin manually creates restaurants (already the documented v1 model); revisit once there's demand from restaurants finding the product organically |
| Loyalty/cashback programs | Competitors (Goomer, Brendi) push this as a retention driver; restaurant owners may ask for it early | Requires customer identity (phone/email capture), points ledger, redemption logic — none of which exist in a no-login flow | Defer entirely; if pursued later, likely requires introducing lightweight customer identity (phone number) first |
| Real-time inventory/stock sync with POS or kitchen systems | "My product sold out, menu should auto-hide it" is a natural ask once availability toggles exist | Requires POS integrations (Saipos, etc.) which vary per restaurant and are a huge integration surface | v1's manual per-unit availability toggle (admin marks item unavailable) covers 90% of the practical need at a fraction of the cost |
| Delivery zone / delivery fee calculation | Common in delivery-focused competitors (Cardapiofast, Consumer) | Requires geolocation, address input, fee rules per unit — significant UI and logic addition, and conflicts with "no login, minimal friction" goal | Delivery fee/logistics negotiation happens via WhatsApp conversation as it does today; not the menu app's job in v1 |
| Multi-language menu (beyond pt-BR) | "Future-proofing" instinct, especially if targeting tourist areas | Adds i18n infrastructure (content translation per product/category, locale switching) with no validated demand yet | Build the data model so a `locale`/translations table *could* be added later without restructuring, but don't build the UI now |
| Push notifications / customer accounts for repeat ordering | "Customers should be able to reorder easily" | Requires customer identity and persistence — directly conflicts with the no-login design and v1 scope | WhatsApp itself serves as the "history" — customers can scroll their chat with the restaurant to see past orders |

## Feature Dependencies

```
Restaurant link/slug (unique)
    └──requires──> Platform super-admin CRUD: restaurants
                       └──requires──> Platform admin login

Unit selection page
    └──requires──> Admin CRUD: units/branches (name, address, WhatsApp number)
                       └──requires──> Restaurant admin login

Customer menu browsing (categories/products)
    └──requires──> Admin CRUD: categories & products
    └──requires──> Admin: product photo upload (for photos to display)

Per-unit availability filtering on customer menu
    └──requires──> Admin CRUD: categories & products
    └──requires──> Admin CRUD: units/branches
    └──requires──> Admin: per-unit availability toggle

Cart + order summary
    └──requires──> Customer menu browsing

WhatsApp send (wa.me) with formatted order
    └──requires──> Cart + order summary
    └──requires──> Admin CRUD: units/branches (for unit's WhatsApp number)
    └──requires──> WhatsApp message formatting quality (differentiator, but tightly coupled)

"Featured" products / category ordering ──enhances──> Customer menu browsing (no hard dependency)

Per-unit operating hours ──enhances──> Unit selection page (no hard dependency)

Online payment / Order persistence / Loyalty (anti-features) ──conflicts──> No-login customer flow
    (each would require introducing customer identity, breaking the frictionless design)
```

### Dependency Notes

- **Restaurant link/slug requires Platform super-admin CRUD:** the slug is generated/assigned at restaurant-creation time by the platform admin — there's no self-service path in v1, so this CRUD must exist before any restaurant can have a working link.
- **Unit selection requires Admin CRUD: units/branches:** the customer-facing unit picker is purely a read view over data the restaurant admin manages — units must be creatable before the picker has anything to show. This also means seed/demo data is needed for early customer-flow testing before admin CRUD is fully built.
- **Per-unit availability filtering requires three prior pieces (products, units, availability toggle):** this is the most "multi-tenant-specific" feature and has the widest dependency fan-in — it should be sequenced after the basic CRUDs for products and units exist, likely in its own phase since it touches both admin UI and customer-facing query logic (filtering joins).
- **WhatsApp send requires unit's WhatsApp number to exist and be validated:** an empty or malformed phone number on a unit breaks the entire core value proposition for that unit — validation at admin-CRUD time (international format, e.g., `55DDDNNNNNNNNN`) is cheap insurance against a "core flow broken" bug discovered late.
- **WhatsApp message formatting quality enhances (and is nearly inseparable from) WhatsApp send:** while listed as a differentiator, in practice this should be built in the same phase as the basic send — there's little value in shipping a poorly-formatted message and "improving" it later, since the message *is* the product's output.
- **Anti-features conflict with no-login design:** any future addition of payment, order history, or loyalty will require introducing some form of customer identity (phone number capture at minimum). This is worth flagging now even though out of scope, because it affects how "clean" the v1 data model needs to be to avoid a painful migration later (e.g., consider whether an `orders` table — even unused in v1 — is cheap to add now vs. retrofit later). Recommendation: do NOT pre-build it, but be aware the decision to skip it is a deliberate v1 simplification with a known future cost.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the core value proposition ("customer picks unit, builds order, sends via WhatsApp").

- [ ] Platform admin login + CRUD restaurants (create/edit/deactivate, assign slug) — without this, no tenant can exist
- [ ] Restaurant admin login (scoped to own restaurant) — required for any content management
- [ ] Restaurant admin CRUD: units/branches (name, address, WhatsApp number, validated format)
- [ ] Restaurant admin CRUD: categories & products (name, description, price)
- [ ] Restaurant admin: product photo upload
- [ ] Restaurant admin: per-unit product availability toggle
- [ ] Customer: unique link → unit selection page
- [ ] Customer: menu browsing (categories/products, filtered by unit availability, photos+desc+price)
- [ ] Customer: cart (add/remove/quantity, item notes)
- [ ] Customer: order summary + "Enviar pedido via WhatsApp" → wa.me with formatted message to selected unit's number
- [ ] Basic empty/error states (no units yet, empty cart, no products in category)
- [ ] Mobile-first responsive layout with `pt-BR` currency formatting

### Add After Validation (v1.x)

Features to add once the core loop is working and a few real restaurants are using it.

- [ ] Category/product sort order (drag-and-drop or simple ordering control) — trigger: restaurant admins complain about item ordering
- [ ] "Featured"/promo badge on products — trigger: restaurant admins want to highlight specific items
- [ ] Per-unit operating hours display — trigger: complaints about orders sent to closed units
- [ ] Onboarding wizard for platform admin (streamlined "add restaurant" flow) — trigger: onboarding multiple restaurants becomes a bottleneck
- [ ] Image compression/resizing on upload — trigger: photo upload sizes causing slow menu loads
- [ ] Sticky category navigation / search within menu — trigger: restaurants with large menus (>30 items) report navigation friction

### Future Consideration (v2+)

Features to defer until product-market fit is established and the no-login model is deliberately revisited.

- [ ] Online payment (PIX/cards) — defer until restaurant demand and a clear liability/compliance plan exist
- [ ] Order history/status tracking — defer until there's a need beyond "the WhatsApp chat is the order log"
- [ ] Public restaurant self-signup with billing/plans — defer until manual onboarding becomes the actual growth bottleneck
- [ ] Loyalty/cashback — defer until customer identity model is deliberately introduced
- [ ] Delivery zone/fee calculation — defer; remains a WhatsApp-conversation topic
- [ ] Multi-language menus — defer until non-pt-BR markets are targeted

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Platform admin CRUD: restaurants | HIGH | MEDIUM | P1 |
| Restaurant admin login/auth (two-role model) | HIGH | MEDIUM | P1 |
| Admin CRUD: units/branches | HIGH | LOW-MEDIUM | P1 |
| Admin CRUD: categories & products | HIGH | MEDIUM | P1 |
| Admin: product photo upload | HIGH | MEDIUM | P1 |
| Admin: per-unit availability toggle | HIGH | MEDIUM | P1 |
| Customer: unit selection page | HIGH | LOW-MEDIUM | P1 |
| Customer: menu browsing w/ availability filter | HIGH | MEDIUM | P1 |
| Customer: cart with notes | HIGH | LOW-MEDIUM | P1 |
| WhatsApp send (wa.me) with formatted message | HIGH | MEDIUM | P1 |
| Empty/error states | MEDIUM | LOW | P1 |
| Category/product sort order | MEDIUM | LOW-MEDIUM | P2 |
| "Featured"/promo badge | MEDIUM | LOW | P2 |
| Per-unit operating hours | MEDIUM | LOW-MEDIUM | P2 |
| Onboarding wizard for platform admin | MEDIUM | MEDIUM | P2 |
| Image compression on upload | LOW-MEDIUM | LOW-MEDIUM | P2 |
| Search/sticky nav for large menus | LOW-MEDIUM | MEDIUM | P3 |
| Online payment | HIGH (long-term) | HIGH | P3 |
| Order history/tracking | HIGH (long-term) | HIGH | P3 |
| Self-signup/billing | MEDIUM (long-term) | HIGH | P3 |
| Loyalty/cashback | MEDIUM (long-term) | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Cardápio Web / Goomer / Saipos (mature incumbents) | Brendi / Cardapiofast / Consumer (budget/no-fee tier) | Boa Mídia v1 Approach |
|---------|--------------------------------------------------|--------------------------------------------------------|------------------------|
| Order delivery channel | WhatsApp + in-app order management + kitchen printer integration | Primarily WhatsApp/link-based, "sem taxa" positioning | WhatsApp only (wa.me), no order management UI |
| Multi-unit support | Centralized multi-store dashboards (Cardapiofast explicitly supports this) | Mostly single-store, multi-unit less emphasized | Native multi-tenant + multi-unit data model from day one (architectural differentiator) |
| Payment | PIX, cards, digital wallets integrated | Often offers PIX but optional | None — explicitly out of scope |
| Loyalty/promotions | Cashback, scheduled promos, automated discounts | Basic promo banners | None for v1; "featured" badge as lightweight v1.x alternative |
| Availability management | Real-time stock sync, "esgotado" auto-hide | Manual toggle typically | Manual per-unit availability toggle (admin-controlled) |
| Customer login | None required for ordering (industry norm) | None required | None required (matches industry norm) |
| Branding/customization | Heavy customization options, often paid tiers | Basic branding (logo, colors) | Basic branding (logo, name) for v1; deeper customization is a future differentiator |
| Onboarding model | Sales-assisted, account managers | Self-signup common | Platform-admin-provisioned only (deliberate v1 constraint) |

## Sources

- [Comparativo de Cardápios Digitais com QR Code no Brasil 2026 - Moby Dev](https://blog.mobydev.com.br/post/melhor-ferramenta-cardapio-digital-brasil-2025-2026) — feature comparison across Brazilian platforms (MEDIUM confidence, single blog source)
- [Sistema de cardápio digital pelo WhatsApp - meucardapio.ai](https://meucardapio.ai/sistema-cardapio-digital-whatsapp/) — WhatsApp-centric ordering positioning (LOW-MEDIUM confidence)
- [Cardápio digital: como criar catálogo para delivery em 2026 - Brendi](https://brendi.com.br/blog/cardapio-digital-catalogo-gratis-2026/) — no-fee/no-signup positioning, multi-unit mentions (MEDIUM confidence)
- [Cardápio Digital Grátis - Cardapiofast](https://cardapiofast.com/) — multi-store centralized dashboard claims (LOW confidence, vendor marketing)
- [Cardápio Digital Grátis Consumer / MenuDino](https://consumer.com.br/cardapio-digital) — no-app, link/QR/WhatsApp ordering flow (LOW-MEDIUM confidence)
- [WhatsApp Ordering System for Restaurants - uEngage](https://www.uengage.io/edge/whatsapp-ordering) — general WhatsApp ordering patterns, multi-branch auto-routing concepts (LOW confidence, international vendor)
- [How to Create a WhatsApp Link (wa.me) With a Pre-Filled Message - QuadLayers](https://quadlayers.com/how-to-create-a-whatsapp-link-wa-me-with-a-pre-filled-message/) — wa.me link format, encoding, phone number format (MEDIUM confidence, corroborated across multiple sources)
- [Create a WhatsApp Link: wa.me Formula - Qualimero](https://qualimero.com/en/blog/create-whatsapp-link) — wa.me link mechanics (MEDIUM confidence)
- Abrasel QR-code adoption statistic (~38% adopted, ~25% planning) cited via Moby Dev article — (LOW confidence, secondary citation, original Abrasel source not directly verified)

---
*Feature research for: Multi-tenant digital menu / WhatsApp-ordering SaaS (Brazil)*
*Researched: 2026-06-15*
