# Moonbox Salon — Motion Upgrade ToDo

## Cinematic public hero and brand entrance

- [x] The hero opens as a premium futuristic environment with continuous but subtle cinematic movement, readable text and CTA contrast, layered depth/parallax, moving gradient lighting, ambient particles, floating translucent salon/product motifs and an animated glass dashboard showcase.
- [x] The existing official crescent logo remains recognizable and is not redrawn, distorted, rotated or replaced; only a soft glow, light pass and opacity/typography entrance are animated.
- [x] The hero clearly identifies the dashboard visual as an illustrative demo and does not imply that animated values are live customer data.

## Continuous motion, scroll storytelling and interactions

- [x] Hero elements move at different depths while scrolling; background layers, light fields and decorative 3D objects use controlled parallax and coherent premium easing.
- [x] Text uses accessible word/line reveal, opacity/position transitions, gradient emphasis and restrained animated underlines without a typewriter effect.
- [x] Major sections reveal through viewport-aware staggered motion; feature cards, images, panels and section transitions feel like one continuous story rather than disconnected cards.
- [x] Pointer interactions include shallow 3D tilt, cursor-following glow and/or magnetic CTA feedback only where useful; effects are disabled or simplified for touch and never interfere with click or text selection.

## Animated product demonstrations

- [x] The dashboard preview has controlled illustrative demo motion for revenue/counters, chart drawing, progress/status changes, appointment entries, notifications or calendar highlights, with an explicit sample/demo label.
- [x] Major feature concepts include meaningful motion demonstrations for appointments, POS, customers, staff, inventory, reports, online booking and website builder without replacing the real functional modules.
- [x] The mobile section uses premium perspective phone mockups containing Moonbox-responsive screens, subtle device movement, reflections/shadows and animated screen content; it does not show an unrelated fake app.

## Performance, accessibility and internal SaaS restraint

- [x] Motion uses GPU-friendly transforms, viewport activation, lazy/conditional animation where applicable, reduced-motion support, low-power/mobile simplification and static fallbacks.
- [x] Internal dashboard screens receive restrained sidebar/card/chart/dropdown/modal/loading/button motion while POS and appointment entry remain fast and usable.
- [x] Existing routes, buttons, authentication, tenant isolation, booking, dashboard modules and backend integrations remain functional.

## Validation and delivery

- [x] TypeScript diagnostics and `npm run lint` pass.
- [x] `npm run build` passes.
- [x] Existing automated tests pass.
- [x] Preview serves HTTP 200 and `/manus-routes.json` remains valid and synchronized.
- [x] A clean canonical checkpoint is saved; production is not published automatically.


# Phase 02 — POS and customer checkout experience

- [ ] Improve the existing POS layout without removing business functionality: clear product/service selection, category navigation, instant product search, cart/order summary, quantity adjustment, item removal, visible subtotal/discount/tax/grand total, all existing payment methods, clear confirmation, empty/error states, responsive tablet/desktop layout and touch-friendly controls; minimize checkout clicks.
- [ ] POS customer selection searches tenant-owned customer names and phone numbers, including partial names and partial phone numbers, case-insensitively for names, with normalized phone matching, debounced autocomplete, customer name/phone results, clear selection, switching/removal and direct customer creation with name, phone, optional email/address. Prevent duplicate phones and never return another tenant's customers.
- [ ] Preserve safe checkout ordering: validate the cart and cash amount, apply existing permissions, calculate totals, save the transaction before indicating success, avoid duplicate transactions on repeated submits, generate a receipt only after storage confirms success, and offer printing.

# Phase 02 — Thermal receipts and reprints

- [ ] Support browser-native 58mm and 80mm receipt printing and a selectable paper-width setting (80mm default) with a compact monochrome print layout and print-specific `@media print`/`@page`, minimal margins, correct width, legible text, no app navigation/buttons/backgrounds/unwanted blank pages; do not claim direct USB/Bluetooth hardware integration.
- [ ] Receipt previews/prints include salon logo, business name/address/phone where configured, receipt/invoice number, transaction date/time, customer name/phone, items/quantities/unit prices/item totals, subtotal, discounts, configured tax, total, payment method, paid amount, cash received/change or balance where relevant, and thank-you message.
- [ ] After successful sale expose Print Receipt, Preview Receipt, Close; sales history permits reprinting the original saved transaction without creating a sale. Tenant-specific printer paper-width preference and receipt header/footer/customer-display settings are safely stored where supported.

# Phase 02 — Customer website/portfolio responsiveness

- [ ] Published customer salon websites and portfolios, not only the builder/editor preview, work on 320px, 360px, 375px, 390px, 414px, 430px, 768px, 1024px and desktop viewports. Check landing, hero, about, services, contact, testimonials, footer, navigation, images/videos and all existing supported sections.
- [ ] Responsive layouts have no unwanted horizontal scrolling, overlapping text, cut-off buttons, broken layouts or overflowing images; typography, spacing, image sizing/aspect ratios, touch targets, content alignment, mobile navigation/menu and gallery grids adapt to screen size. Desktop remains appropriate and existing custom branding/content is preserved.
- [ ] Keep website builder/management, portfolio builder/management, CMS, templates, sections, settings, galleries/media, domains, publish/unpublish, SEO, website navigation, and customer-generated sites intact; preserve all customer content/data and website/portfolio integrations.
- [ ] Preserve customer-site/portfolio online booking buttons, forms, widgets, sections, submission behavior, booking APIs, availability, confirmation, notifications and required integrations. Do not remove shared booking data/tables/functions/policies/storage/RLS because they contain booking references.

# Phase 02 — Navigation and standalone Booking Service scope

- [ ] Remove only the Platform Website, Setup Wizard and Booking Service shortcuts from the visible top header; retain all other navigation, spacing/alignment, responsive navigation and working links, and preserve Platform Website and Setup Wizard underlying workflows through appropriate internal access.
- [ ] Remove the standalone Booking Service module only if a distinct dedicated module is present; remove its dedicated navigation/sidebar/dashboard card/pages/components/settings/routes/exclusive APIs/exclusive permissions only after dependency proof. Preserve Website Builder, Portfolio Builder, customer-published websites and their embedded online booking.
- [ ] Audit booking dependencies and document shared versus module-exclusive records/code. Preserve shared database tables/APIs/functions/storage/policies and all customer website/portfolio records; avoid destructive migrations or modifying applied migrations. Verify no dead imports/routes/references and that website/portfolio and online booking actions/APIs remain functional.

# Phase 02 — Integration, security and delivery

- [ ] Regression scope includes customer search by full/partial name and phone, creation, products/services, cash and other existing payment methods, saved receipt/58mm/80mm printing/reprinting, no duplicate sale, published website/portfolio mobile layouts/navigation/images/galleries/sections/desktop, and remaining navigation links.
- [ ] Preserve tenant isolation, role-based access, Super Admin authorization, RLS, private environment secrets and public-site privacy. Do not deploy to production or modify production records without explicit authorization.
- [ ] Execute available dependency install, TypeScript check, lint, build, unit/integration/API tests, migration validation, security checks and responsive/browser checks as supported. Fix errors introduced by this change; do not claim unexecuted checks passed.
- [ ] Deliver updated source and ZIP, phase summary, changed/removed files, migrations, environment-variable requirements, actual build/test results, known issues, deployment instructions and a feature-preservation report. Do not mark unverified printer hardware, production access or live-published site behavior as verified.
