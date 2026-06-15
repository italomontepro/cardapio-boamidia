# Pitfalls Research

**Domain:** Multi-tenant SaaS digital menu (cardápio digital) — Next.js + Supabase + WhatsApp ordering
**Researched:** 2026-06-15
**Confidence:** HIGH (RLS/Storage findings verified against official Supabase docs and recent CVE disclosure; WhatsApp/wa.me findings MEDIUM — community sources, cross-checked across multiple)

## Critical Pitfalls

### Pitfall 1: Tables Created Without RLS Enabled (Open-by-Default Data Leak)

**What goes wrong:**
Every new Postgres table in Supabase has RLS **disabled by default**. If a migration creates `restaurants`, `units`, `categories`, `products`, or `availability` tables without an explicit `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, all rows are readable (and writable) by anyone via the public anon key — including data from every tenant. This is not hypothetical: a May 2025 disclosure (CVE-2025-48757) found 303 endpoints across 170 "vibe-coded" Supabase projects with tables fully exposed to unauthenticated requests, precisely because RLS was never enabled.

**Why it happens:**
Developers write a migration, test locally with an admin/service-role connection (which bypasses RLS entirely), see everything "working," and never notice the table is wide open — because their test session has god-mode access.

**How to avoid:**
- Turn on the Supabase dashboard toggle: **Authentication → Policies → "Enable RLS on new tables"** at project setup, before creating any tables.
- Add `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;` as a mandatory line in every table-creation migration — make it part of the migration template/checklist.
- Write a CI check (a small SQL script run against the dev DB) that fails if any table in `public` schema has `relrowsecurity = false`.
- Test every table with the **anon key** (no auth), not just service-role — anon access is what the public menu pages use, and admin endpoints must NOT be reachable this way.

**Warning signs:**
- A table query "just works" from the browser/anon client without you having written any policy for it.
- `select relname, relrowsecurity from pg_class where relkind='r' and relnamespace = 'public'::regnamespace;` shows `false` for any tenant-data table.

**Phase to address:**
Data model / database schema phase (Phase 1) — RLS must be designed alongside the schema, not retrofitted. This is the single highest-priority item for the foundational phase.

---

### Pitfall 2: RLS Policies That Reference the Wrong "Tenant" Identity

**What goes wrong:**
`auth.uid()` returns the authenticated **user's** UUID, not the restaurant/tenant ID. A naive policy like `USING (auth.uid() = restaurant_id)` is meaningless for this domain — restaurant admins are users who *belong to* a restaurant (tenant), and the relationship lives in a join table (e.g., `restaurant_admins` or a `tenant_id` column on a `profiles`/`admins` table). Writing policies straight against `auth.uid()` without resolving it to a tenant_id first either blocks all access (table appears empty) or — worse — if someone "fixes" it by loosening the policy, leaks all tenants' data to all admins.

A second variant: policies on the `products`/`categories`/`availability` tables don't account for **joins**. Even if `products` has a correct tenant-scoped policy, if it's joined to `units` (which has its own RLS) and `units`' policy is missing or wrong, the join silently returns nothing or — depending on policy direction — exposes rows from other tenants.

**Why it happens:**
RLS policies are written and tested table-by-table in isolation. The two-level hierarchy here (platform super-admin → restaurant admin → restaurant → units → categories/products/availability) means tenant scoping must be resolved through 2-3 levels of joins/subqueries, and it's easy to get the subquery direction backwards.

**How to avoid:**
- Create a `SECURITY DEFINER` helper function, e.g. `get_my_restaurant_id()` or `is_admin_of(restaurant_id uuid)`, that resolves the current `auth.uid()` to the tenant(s) they administer. Reference this helper in every tenant-scoped policy instead of inlining the join logic repeatedly.
- For the super-admin role, use a **separate** helper (`is_platform_admin()`) backed by a dedicated table/flag — never a client-editable JWT claim (see Pitfall 3).
- Enable RLS on **every** table in the chain (restaurants, units, categories, products, availability, restaurant_admins) — a policy on `products` doesn't protect `units` if `units` has RLS disabled or a permissive policy.
- Write integration tests that log in as Restaurant A's admin and assert 0 rows / 403 when querying Restaurant B's units, products, and availability.

**Warning signs:**
- Restaurant admin dashboard shows products/units belonging to a different restaurant after switching test accounts.
- A query that joins 2+ tables returns different results than the sum of querying each table independently with the same filters.

**Phase to address:**
Data model / RLS phase (Phase 1) for the helper functions and base policies; Admin auth/dashboard phase for the cross-tenant integration tests.

---

### Pitfall 3: Role/Tenant Info Stored in Client-Mutable JWT Metadata

**What goes wrong:**
Storing "is_super_admin" or "restaurant_id" in Supabase Auth's `user_metadata` (as opposed to `app_metadata` or a server-side table) is dangerous because `user_metadata` can be updated by the authenticated user themselves via the client SDK. Even `app_metadata`-based custom claims have caused real incidents when developers assumed they were immutable from the client. A restaurant admin could, in theory, escalate themselves to platform super-admin or attach themselves to another restaurant if role/tenant assignment isn't enforced purely server-side via RLS-protected tables.

**Why it happens:**
It's tempting to put role/tenant info "on the user" for convenience (avoids a join), and tutorials often demo `user_metadata` for roles without flagging the mutability issue.

**How to avoid:**
- Store role (`platform_admin` | `restaurant_admin`) and tenant association (`restaurant_id`) in a dedicated Postgres table (e.g., `admin_users`) with its own RLS — never rely on JWT `user_metadata` for authorization decisions.
- Only platform super-admins (via a service-role/admin-only mutation path) can insert/update rows in `admin_users` that grant restaurant access — restaurant admins cannot self-assign or change their own tenant_id.
- If using custom JWT claims for performance, generate them via a `SECURITY DEFINER` function/hook controlled server-side, and still double-check against the `admin_users` table for sensitive mutations (defense in depth).

**Warning signs:**
- Any code path that reads `supabase.auth.getUser()`'s `user_metadata.restaurant_id` or `role` to decide what data to show/allow, without cross-referencing a server-side table.
- Restaurant admin signup/invite flow lets the new user set their own `restaurant_id`.

**Phase to address:**
Admin authentication & authorization phase — design the `admin_users` table and invite/assignment flow before building any admin CRUD UI.

---

### Pitfall 4: Public Storage Bucket for Product Photos = No Real Tenant Boundary

**What goes wrong:**
For product photos, the natural choice is a **public** Supabase Storage bucket (since menu images need to be viewable by anonymous customers without auth). However, "public" in Supabase Storage means **anyone with the URL can read the file regardless of RLS** — access control is effectively bypassed for reads. This is *fine* for the read side (menu images should be public), but two related mistakes commonly occur:
1. **Upload/delete policies are left too permissive** — if the bucket's INSERT/UPDATE/DELETE policies aren't scoped per-tenant (e.g., by folder prefix matching the admin's `restaurant_id`), Restaurant A's admin can overwrite or delete Restaurant B's product images by guessing/enumerating file paths.
2. **Folder structure isn't tenant-prefixed** — if files are stored as `products/<random-id>.jpg` instead of `products/<restaurant_id>/<unit_id>/<product_id>.jpg`, there's no clean way to write a storage policy that restricts an admin to their own tenant's files, and cleanup/migration (e.g., deleting a tenant) becomes painful.

Additionally, Supabase Storage "folders" are just key prefixes — there's no inherited folder-level permission system. Policies must explicitly match on path patterns (e.g., using `storage.foldername(name)`).

**Why it happens:**
Public bucket = "it works" for the read path (images load on the menu), so the upload-side policy gets a rubber-stamp `true` or is copy-pasted from a single-tenant tutorial.

**How to avoid:**
- Use a **public** bucket for product images (correct choice for performance and CDN caching of menu photos — no signed URLs needed for customer-facing pages).
- Enforce tenant isolation on **write** operations only: storage policies for INSERT/UPDATE/DELETE must check that the path prefix (`restaurant_id/...`) matches the authenticated admin's `restaurant_id` (via the same helper function from Pitfall 2).
- Adopt the path convention `<restaurant_id>/<unit_id-or-shared>/<product_id>/<filename>` from day one — retrofitting path structure later requires rewriting every stored URL reference in the `products` table.
- Validate uploads server-side (see Pitfall 5) before they hit storage — don't rely on the bucket's MIME/size config alone.

**Warning signs:**
- Storage policy for INSERT/UPDATE/DELETE is `WITH CHECK (true)` or `auth.role() = 'authenticated'` with no tenant check.
- Product image URLs in the database don't encode any tenant/restaurant identifier — impossible to audit "which files belong to restaurant X."

**Phase to address:**
Product/photo upload phase (admin restaurant CRUD) — design bucket structure and policies alongside the `products` table schema, ideally in the same phase as Pitfall 1/2's RLS work.

---

### Pitfall 5: Trusting Client-Side File Validation for Product Photo Uploads

**What goes wrong:**
Relying solely on `<input accept="image/*">` and client-side checks (file extension, reported MIME type, file size from `File.size`) for product photo uploads. Supabase Storage's built-in MIME validation has historically checked the **filename/extension**, not the actual file bytes — a malicious or careless upload (e.g., a renamed `.html`/`.svg` with embedded script, or an oversized file) can pass client checks and bucket config and still land in storage, potentially served back with the wrong content-type or exploited for stored XSS if served inline.

**Why it happens:**
Client-side validation is fast to implement and "looks done" in a demo — the upload form rejects obviously-wrong files, so it feels secure. Server-side/magic-number validation is an extra step that's easy to skip for an MVP.

**How to avoid:**
- Enforce file size and allowed MIME types (`image/jpeg`, `image/png`, `image/webp`) at the **bucket level** in Supabase Storage config (per-bucket `file_size_limit` and `allowed_mime_types`), as a baseline.
- Validate actual file content (magic-number/signature check, not just extension) in a server action / API route before uploading, especially since admin uploads are authenticated and could otherwise be scripted.
- Generate the storage filename server-side (e.g., `${productId}-${timestamp}.${ext}`) — never use the user-supplied filename directly, to avoid path traversal or collision issues.
- Consider Supabase's image transformation/resize-on-the-fly feature (or a simple resize step) so oversized uploads (e.g., 20MB phone photos) don't bloat storage and slow down the public menu.

**Warning signs:**
- Upload flow has no server-side step between the file input and `storage.from(bucket).upload()` — purely client → storage.
- No size/dimension limits enforced anywhere; a single admin upload could be 50MB and tank menu page load times.

**Phase to address:**
Product/photo upload phase.

---

### Pitfall 6: Brazilian Phone Number "Ninth Digit" Mismatch Breaks wa.me Links

**What goes wrong:**
Brazilian mobile numbers require a "9" prefix after the area code (DDD) for area codes 11-19, 21, 22, 24, 27, 28 (e.g., `+55 11 98765-4321`), but **not** for many other area codes — and WhatsApp's own internal ID for a number doesn't always match the dialing format users expect, especially for older registrations. If a restaurant admin enters their WhatsApp number in a form without normalization (e.g., omits the country code, omits/duplicates the "9", includes formatting like `(11) 98765-4321` with parentheses/dashes/spaces), the generated `wa.me/<number>` link either:
- Opens WhatsApp to "invalid number" / "phone number shared via url is invalid",
- Or opens a chat with the **wrong contact** if digits are misaligned.

This is a **critical** pitfall specifically for this project because the entire ordering flow depends on `wa.me/<unit_phone>?text=<order>` working correctly for every unit — a malformatted number silently breaks the core value proposition for that unit, and the failure is only visible when a real customer tries to order (admins testing on their own device may have WhatsApp cached/linked differently).

**Why it happens:**
The admin form for "unit WhatsApp number" is treated as a free-text field. Brazilian users are accustomed to typing numbers with parentheses, dashes, and sometimes without the leading 9 or country code, because that's how they're displayed/dialed locally — but `wa.me` requires the strict format `55<DDD><number>` with no symbols.

**How to avoid:**
- Build a phone input component that captures DDD + number separately (or with an input mask), and **normalize/store** the number in canonical E.164-like format (`5511987654321`) — strip all non-digit characters, prepend `55` if missing.
- At save time, validate the digit count: country code (2) + DDD (2) + number (8 or 9 digits) = 12 or 13 digits total. Show a preview/test link in the admin UI ("Test this WhatsApp link") so admins can click-verify the number opens the correct chat before saving.
- Do NOT attempt to "smart-guess" whether the 9th digit should be added/removed based on area code — require the admin to type the number as it appears on their own WhatsApp, and only strip formatting characters (don't add/remove digits programmatically), since ANATEL rules have had transition periods and exceptions.
- Add a unit-level "send test message to yourself" action during onboarding as a manual verification step.

**Warning signs:**
- Phone number field accepts free-form text with no format validation.
- No way for the admin to preview/test the generated wa.me link before going live.
- Support requests like "customers say the WhatsApp button doesn't work" with no easy way to diagnose which unit/number is wrong.

**Phase to address:**
Unit/branch management phase (admin CRUD of units with WhatsApp numbers) for input normalization + preview; Cart/WhatsApp order phase for final link generation and end-to-end testing with real Brazilian numbers across multiple area codes.

---

### Pitfall 7: Unencoded/Improperly Encoded Order Message Breaks the wa.me Link

**What goes wrong:**
The order message (formatted cart with item names, quantities, observations, prices, totals) must be passed as the `text` query parameter on `https://wa.me/<number>?text=<message>`. Common breakages:
- Spaces, line breaks (`\n`), and special characters (`:`, `&`, `?`, `#`, accented Portuguese characters like `ç`, `ã`, `é`) are not properly URL-encoded, causing the link to truncate at the first unencoded `&`/`#`, break line formatting, or fail to open at all on some mobile browsers/WebViews.
- Mixing `encodeURI()` and `encodeURIComponent()` incorrectly — `encodeURIComponent` is required for the message *value* (it encodes `&`, `#`, `?` which `encodeURI` leaves alone and which would otherwise be interpreted as URL syntax delimiters).
- Emojis in product names/observations (if admins add them) are stored as UTF-16 surrogate pairs in JS strings; `encodeURIComponent` handles well-formed surrogate pairs correctly, but a **lone surrogate** (e.g., from copy-pasted text with a stray half-emoji, or truncation logic that cuts a string mid-emoji) throws a `URIError: URI malformed`.
- Total message length: there's no hard documented limit on the `wa.me` `text` param itself, but very long pre-filled messages (large carts with many items + observations) can be truncated or fail silently on some mobile browsers/WebView wrappers (practical safe target: keep under ~2000 characters; WhatsApp message bodies generally degrade in readability well before any technical limit).

**Why it happens:**
Building the message with template literals (`\`Pedido:\n${items.map(...)}\``) and then doing a naive `wa.me/${phone}?text=${message}` without encoding "looks correct" in local testing (desktop browsers are forgiving and often auto-encode), but breaks on mobile Safari/Chrome WebViews or when the message contains `&`/`#`.

**How to avoid:**
- Always build the message as a plain string with `\n` for line breaks, then pass it through `encodeURIComponent()` exactly once before appending to the URL — never `encodeURI()`, never manual `.replace()` of spaces with `+` (that's form-encoding, not URL-encoding, and inconsistent with `wa.me`'s expectations).
- Before encoding, run `message.normalize()` and guard against lone surrogates — if truncating the message for length limits, truncate by Unicode code point / grapheme cluster, not raw string index, to avoid splitting an emoji and producing a lone surrogate that crashes `encodeURIComponent`.
- Cap the generated message length (e.g., truncate item list or summarize if cart is huge) and test with: long product names, accented characters (ç, ã, õ, é), emojis in observations, and carts with 10+ items.
- Test the final link on actual mobile devices (iOS Safari + Android Chrome + in-app WebView if the link is opened from inside a browser embedded in another app) — desktop testing alone is insufficient.

**Warning signs:**
- Order message built with string concatenation/template literals and appended directly to `wa.me/...?text=` without an `encodeURIComponent()` call.
- No test cases with Portuguese accented characters, emojis, or `&`/`#` in product names or customer observations.
- "It works on my computer" but customers report blank/broken WhatsApp messages on mobile.

**Phase to address:**
Cart / WhatsApp order generation phase — this is the core value proposition, deserves dedicated end-to-end testing on real mobile devices with real Portuguese-language menu data.

---

### Pitfall 8: Per-Unit Product Availability Logic Computed Client-Side or Cached Stale

**What goes wrong:**
Since the menu is "shared" across units but availability is per-unit, the query that renders the public menu for a chosen unit must filter products by that unit's availability — not just list all of the restaurant's products. If this filtering is done client-side (fetch all products, then filter in JS based on a separately-fetched availability list), or if the page is statically cached/ISR'd without proper revalidation, customers can:
- See products as available that the unit doesn't actually carry (leading to orders for items the unit can't fulfill),
- Or fail to see newly-available items after an admin update, if cache revalidation isn't wired to availability changes.

**Why it happens:**
"Shared catalog + per-unit availability" is a many-to-many relationship (`product_availability(product_id, unit_id, is_available)`) that's easy to model in the DB but easy to query incorrectly — e.g., a `LEFT JOIN` that doesn't default missing rows to "unavailable" (or "available", depending on the chosen default), producing inconsistent results depending on whether a row exists in `product_availability` at all.

**How to avoid:**
- Decide and document the default: if a product has **no row** in `product_availability` for a given unit, is it available or not? (Recommendation: default to available unless explicitly marked unavailable, OR require an explicit row per product-unit pair created on product creation — pick one and enforce it consistently in the query, not in app logic.)
- Do the availability filter in the database query (single query joining `products` + `product_availability` filtered by `unit_id`), not client-side — this also keeps RLS/anon access simple (one query, one policy to verify).
- If using Next.js caching (ISR/fetch cache) for menu pages, key the cache by `(restaurant_slug, unit_id)` and set revalidation (on-demand via `revalidatePath`/`revalidateTag` triggered from the admin's availability-toggle action) so toggling availability reflects quickly — don't rely solely on time-based revalidation for something admins expect to be near-instant.

**Warning signs:**
- Two separate fetches (all products, then all availability records) combined in a `.filter()` in a React component.
- Toggling a product's availability in the admin doesn't change what the public menu shows for several minutes (cache not invalidated).

**Phase to address:**
Public menu rendering phase (data fetching/query design) and admin availability-management phase (cache invalidation on toggle).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single shared `admins` table with a `role` enum column instead of separate `platform_admins`/`restaurant_admins` tables | Simpler schema, one auth check path | Harder to write tight RLS per role; risk of role-confusion bugs as roles grow | Acceptable for v1 IF role + tenant_id columns are never client-writable and every policy explicitly checks role |
| Free-text "WhatsApp number" field with no input mask/normalization | Faster admin form to ship | Broken order links discovered only by real customers (Pitfall 6) | Never acceptable — minimal normalization (strip non-digits, validate digit count) is cheap and high-value |
| Storing product images without tenant-prefixed paths (`products/<uuid>.jpg`) | Slightly simpler upload code | Storage policies can't enforce tenant isolation on writes; painful to audit/migrate per-tenant later (Pitfall 4) | Only acceptable for true single-tenant prototypes — never for multi-tenant from day one |
| No "no internet/WhatsApp not installed" fallback for the order button | Less UI work | Customers without WhatsApp installed (or on desktop without WhatsApp Web linked) get a dead/confusing experience | Acceptable for v1 launch targeting mobile-first WhatsApp-heavy markets (Brazil), but should be a known follow-up — `wa.me` does redirect to WhatsApp Web on desktop if no app, which mitigates this somewhat |
| Skipping server-side image validation, relying on bucket MIME/size config only | Faster to ship upload feature | Stored XSS / oversized files / content-type confusion (Pitfall 5) | Only acceptable if bucket-level `allowed_mime_types` + `file_size_limit` are set AND images are served from a separate storage domain (not same-origin) reducing XSS blast radius |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth (admin login) | Storing role/tenant_id in `user_metadata`/`app_metadata` and trusting it client-side | Store in a server-side `admin_users` table with its own RLS; resolve via `SECURITY DEFINER` helper functions in policies |
| Supabase Storage (product photos) | Public bucket with permissive write policies (`WITH CHECK (true)`) | Public bucket for reads; tenant-prefixed paths + write policies scoped to `restaurant_id` matching the admin's tenant |
| Supabase Postgres RLS + joins | Writing a policy on `products` and assuming it protects joined `units`/`categories` data too | Enable RLS + write explicit policies on every table in the join chain; test joined queries, not just single-table queries |
| WhatsApp `wa.me` deep link | Passing raw template-literal message string directly into the URL | `encodeURIComponent()` the message exactly once; normalize phone numbers to digits-only `55DDDNNNNNNNNN` before concatenation |
| Next.js + Supabase realtime/caching for availability | Fetching products and availability separately and merging client-side, with default ISR caching | Single server-side query joining availability per unit; use `revalidatePath`/`revalidateTag` from admin actions for near-instant updates |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `auth.uid()` used directly (unwrapped) in RLS policies | Admin dashboard queries get progressively slower as `products`/`availability` rows grow | Always write `(select auth.uid())` instead of `auth.uid()` in `USING`/`WITH CHECK` clauses — Postgres then evaluates once per query, not once per row | Noticeable once a tenant's `products` or `availability` table reaches ~1k-10k rows; severe at 100k+ |
| No index on `tenant_id`/`restaurant_id`/`unit_id` columns referenced in RLS policies | RLS-filtered queries do full table scans | Add indexes on every foreign key column used inside RLS policy `USING`/`WITH CHECK` expressions (e.g., `restaurant_id`, `unit_id`) | Becomes visible once total cross-tenant row counts (sum across all restaurants) grow into the thousands |
| Unoptimized product images served directly from Storage at full upload resolution | Public menu pages load slowly on mobile (the primary device for end customers) | Use Supabase image transformation/resize, or a CDN/Next.js `<Image>` with remote loader, to serve appropriately-sized images for menu thumbnails vs detail views | Immediately noticeable on 3G/4G — directly affects core conversion (customers abandoning before ordering) |
| Re-fetching full menu (all categories/products) on every unit switch without caching | Slow unit-switching UX, redundant Supabase reads | Cache per-unit menu responses (ISR or client cache) keyed by unit id, invalidate on admin availability changes | Matters once a restaurant has many units and customers browse multiple before choosing |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Anon/public Supabase key exposed with overly broad table access (RLS disabled or default-allow) | Full cross-tenant data leak readable by anyone (CVE-2025-48757 pattern) | Enable RLS on every table at creation; never enable RLS without writing policies (which would otherwise just hide data, signaling "it works" while actually broken) |
| Trusting `user_metadata`/JWT app_metadata for role/tenant authorization | Privilege escalation — restaurant admin becomes platform admin or accesses another tenant | Authorization decisions backed by server-side tables with their own RLS, validated via `SECURITY DEFINER` functions |
| Storage write policies not scoped per tenant | Cross-tenant file overwrite/deletion (Restaurant A admin can delete Restaurant B's product photos) | Path-prefix-based storage policies tied to the admin's resolved `restaurant_id` |
| Server-side rendering of the public menu accidentally using the **service role key** (which bypasses RLS) for convenience | Any RLS misconfiguration becomes irrelevant — every query returns everything, masking bugs until exploited | Public-facing menu pages/server components use the **anon key** (respecting RLS); service role key reserved for trusted server-only admin operations (e.g., platform admin restaurant CRUD), never exposed to or reachable from customer-facing code paths |
| No rate limiting / abuse protection on the public menu link or order-generation endpoint | Scraping of all restaurants' menus/prices, or abuse of any server action that constructs wa.me links (e.g., spam-generating links) | Basic rate limiting on public API routes/server actions (even simple IP-based) if any server-side processing is involved before redirecting to wa.me |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|------------------|
| Customer reaches unit selection page but a unit has no configured WhatsApp number / is inactive | Customer picks a unit, builds a cart, then the "send order" button fails or opens an invalid chat | Hide/disable units with missing or invalid WhatsApp numbers from the public unit-selection list; admin UI should flag incomplete units |
| Cart persists in browser state but the customer navigates away/closes WhatsApp before sending | Customer loses their cart, has to rebuild it (no order persistence in v1 by design) | Persist cart in `localStorage`/`sessionStorage` per unit so returning to the tab restores the cart even if WhatsApp opened in a separate app/tab |
| Order message sent via WhatsApp has no reference to "which unit/restaurant" if the restaurant has many units with similar names | Unit staff receiving the message may not immediately know which menu/pricing applied | Include restaurant name + unit name/address explicitly in the generated message header, not just relying on "the number they texted" |
| Product photos missing for some items (admin hasn't uploaded yet) | Inconsistent-looking menu, items without photos look broken/unfinished | Design a graceful placeholder (category icon or restaurant logo) for products without photos — don't leave broken `<img>` tags |
| Long product descriptions or many observations make the WhatsApp message huge | Message gets truncated or unreadable on the receiving end (restaurant staff) | Keep per-item message format compact (name x qty - price, observation on its own short line); consider a soft warning to the customer if cart is very large |

## "Looks Done But Isn't" Checklist

- [ ] **RLS on tenant tables:** "It works in the admin dashboard" — verify by querying every tenant table (`restaurants`, `units`, `categories`, `products`, `product_availability`, `admin_users`) with the **anon key** and confirm zero/expected rows, not service-role.
- [ ] **Cross-tenant isolation:** "Restaurant admin can manage their menu" — verify by logging in as Restaurant A's admin and attempting to read/update/delete Restaurant B's units/products/categories via direct API calls (not just through the UI, which may hide the option but not block the request).
- [ ] **wa.me order link:** "Order button opens WhatsApp" — verify with: (a) a real Brazilian mobile number with the 9th digit, (b) a product name containing accented characters (ç, ã), (c) a cart with an emoji in customer observations, (d) a large cart (10+ items with observations), tested on an actual mobile device, not just desktop browser.
- [ ] **Per-unit availability:** "Menu shows correct items per unit" — verify by toggling a product's availability for one unit in the admin and confirming the public menu for that specific unit updates (and other units are unaffected) without a full redeploy/cache clear.
- [ ] **Product photo upload:** "Upload works" — verify file size limits are enforced server-side (not just the `<input>` attribute), that uploaded images are stored under a tenant-prefixed path, and that another tenant's admin cannot overwrite/delete the file via direct storage API calls.
- [ ] **Platform super-admin scope:** "Super admin manages restaurants" — verify the super-admin role check is NOT based on a JWT claim alone, and that a restaurant admin account cannot self-promote or access the super-admin CRUD endpoints.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|-----------------|
| RLS disabled / missing on a launched table | MEDIUM | Enable RLS immediately (this will start returning empty results to anon/authenticated clients until policies exist — expect temporary breakage); write and test policies per table; audit Supabase logs for any anomalous access during the exposure window |
| Cross-tenant data leak discovered via wrong RLS policy | HIGH | Fix policy + add regression test; audit which tenants' data was exposed and for how long; notify affected restaurant owners per data-protection obligations (LGPD applies in Brazil) |
| Storage paths not tenant-prefixed, discovered late | MEDIUM-HIGH | Write a migration script to move existing files to `<restaurant_id>/...` paths, update all `image_url` references in `products` table, then update storage policies — requires careful sequencing to avoid broken image links during migration |
| wa.me links broken for some units due to phone format | LOW | Add a normalization function applied retroactively to all stored unit phone numbers (strip formatting, validate digit count); add the "test link" admin UI feature; re-verify each unit |
| Availability cache staleness causing wrong menu items shown | LOW | Add `revalidateTag`/`revalidatePath` calls to the availability-toggle server action; for already-deployed instances, reduce ISR revalidation interval temporarily while the fix ships |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| RLS disabled by default (Pitfall 1) | Phase 1 — Data model & RLS foundation | Query every tenant table with anon key; CI check on `pg_class.relrowsecurity` |
| Wrong tenant-identity in RLS policies / cross-join leaks (Pitfall 2) | Phase 1 — Data model & RLS foundation | Cross-tenant integration tests (login as Restaurant A admin, attempt access to Restaurant B data) |
| Role/tenant in client-mutable JWT metadata (Pitfall 3) | Admin auth & authorization phase | Attempt self-promotion/self-reassignment via API as a restaurant admin; confirm blocked |
| Public storage bucket without tenant-scoped write policies (Pitfall 4) | Product/photo upload phase | Attempt cross-tenant upload/delete via storage API as Restaurant A admin targeting Restaurant B's path |
| Client-only file validation for uploads (Pitfall 5) | Product/photo upload phase | Attempt upload of oversized file and renamed non-image file; confirm server-side rejection |
| Brazilian phone number / wa.me format (Pitfall 6) | Unit management phase + Cart/WhatsApp phase | Test wa.me links with real numbers across multiple DDDs (with and without 9th digit) on mobile |
| Message encoding for wa.me (Pitfall 7) | Cart/WhatsApp order generation phase | End-to-end test with accents, emojis, long carts, special chars, on real mobile devices |
| Per-unit availability query correctness + caching (Pitfall 8) | Public menu rendering phase + availability admin phase | Toggle availability in admin, confirm public menu reflects change for correct unit only, within seconds |

## Sources

- [Supabase RLS: Common Mistakes, the (select auth.uid()) Trap & CVE-2025-48757 Breakdown](https://vibeappscanner.com/supabase-row-level-security)
- [Row-Level Security in Supabase: Multi-Tenant SaaS from Day One](https://dev.to/issuecapture/row-level-security-in-supabase-multi-tenant-saas-from-day-one-4lon)
- [Supabase RLS Best Practices: Production Patterns for Secure Multi-Tenant Apps](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Supabase Storage Buckets fundamentals (official docs)](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Supabase Storage Access Control (official docs)](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Storage Helper Functions (official docs)](https://supabase.com/docs/guides/storage/schema/helper-functions)
- [Supabase Storage RLS: Secure File Access for SaaS Apps](https://promptxl.com/supabase-storage-rls/)
- [Improper MIME Type Validation Based on File Extensions — supabase/storage Issue #576](https://github.com/supabase/storage/issues/576)
- [mime-type does not check uploaded files, only the filename — supabase/supabase Issue #27120](https://github.com/supabase/supabase/issues/27120)
- [Adding a Super Admin to Next.js Supabase application (MakerKit)](https://makerkit.dev/docs/next-supabase-turbo/admin/adding-super-admin)
- [Role-Based Access Control (RBAC) in Next.js Supabase (MakerKit)](https://makerkit.dev/docs/next-supabase-turbo/development/permissions-and-roles)
- [Supabase Authentication and Authorization in Next.js: Implementation Guide (Permit.io)](https://www.permit.io/blog/supabase-authentication-and-authorization-in-nextjs-implementation-guide)
- [WhatsApp Message Length Guide — Character Limits & Optimal Length 2025 (WA.Expert)](https://wa.expert/pages/whatsapp-message-length-guide)
- [How to Generate a WhatsApp Deep Link with a Pre-Populated Message (Meta Developer Community)](https://developers.facebook.com/community/threads/957849225969148/)
- [How to Use WhatsApp Links to Initiate Conversations (Messangi)](https://support.messangi.com/hc/en-us/articles/39008577066139-How-to-Use-WhatsApp-Links-to-Initiate-Conversations)
- [A brief note on inconsistencies for mobile numbers and WhatsApp IDs in Brazil (digit '9') (Gupshup)](https://support.gupshup.io/hc/en-us/articles/4407840924953-A-brief-note-on-the-inconsistencies-for-mobile-numbers-and-their-WhatsApp-IDs-in-Brazil-digit-9-Mexico-digit-1)
- [Telephone numbers in Brazil (Wikipedia)](https://en.wikipedia.org/wiki/Telephone_numbers_in_Brazil)
- [encodeURIComponent() — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)
- [How to Normalize International Phone Numbers For WhatsApp (Wassenger)](https://wassenger.com/blog/en/how-to-normalize-international-phone-numbers-for-whatsapp)

---
*Pitfalls research for: Multi-tenant SaaS digital menu (cardápio digital) — Boa Mídia*
*Researched: 2026-06-15*
