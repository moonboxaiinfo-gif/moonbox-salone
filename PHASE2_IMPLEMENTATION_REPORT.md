# Moonbox Salon Phase 02 Implementation Report

## Summary

Implemented scoped updates in the supplied Vite/React project. POS now includes debounced salon-scoped customer name/phone search, quick customer creation with normalized duplicate-phone detection, cash tender entry, and a synchronous checkout guard. Sale persistence rejects repeated invoice IDs/numbers and validates all product stock before applying sale movements. Successful and historical invoices open a compact receipt preview with persisted per-tenant 58mm/80mm selection and browser-native print styling. Existing public salon/portfolio layouts received phone/tablet responsive refinements. The three requested labels were removed from the header navigation; routes and internal workflows were kept. The Vite host allowlist now includes the exact sandbox forwarded hostname used for this live preview.

## Booking scope and preservation findings

The supplied source has no distinct module/component/API named or functioning as a standalone Booking Service manager. Its header's “Booking Service” control linked to the tenant public booking flow, and that public booking feature is shared with website/portfolio CTAs. The sidebar `online_booking` tab manages that same online-booking experience. Therefore the header label/control was removed, but the public `/book/:salonSlug` route, `PublicBookingPage`, `PublicBookingFlow`, `OnlineBookingManager`, `PublicWebsiteApi.submitBooking`, website/portfolio booking CTAs, booking-related schema/policies, data and integrations were deliberately preserved. No booking migrations, database tables or records were removed. Platform Website and Setup Wizard header controls were removed; the public root and existing `/app?onboarding=true` query workflow remain.

## Modified files

- `plan.md` — adds the implementation and architecture plan for this request.
- `TODO.md` — appends the request outcomes and acceptance clauses while preserving the prior project history.
- `FEATURE_PRESERVATION_MATRIX.md` — records Phase 02 preservation findings.
- `PHASE2_IMPLEMENTATION_REPORT.md` — this report.
- `vite.config.ts` — allowlists the exact external forwarded hostname for preview access; preserves the existing host allowlist.
- `src/App.tsx` — removes former header-only callbacks.
- `src/components/common/Header.tsx` — removes the three visible header shortcuts.
- `src/components/pos/POSRegister.tsx` — customer autocomplete/create, phone normalization, cash received and duplicate-submit lock.
- `src/services/storageService.ts` — invoice idempotency and inventory preflight.
- `src/types/index.ts` — optional saved cash-received value for invoices.
- `src/components/invoices/InvoiceViewModal.tsx` — thermal receipt preview and width preference/print rules.
- `src/components/invoices/InvoiceList.tsx` — labels saved transaction access as receipt reprint.
- `src/services/storageService.test.ts` — duplicate invoice regression test.
- `src/components/website/themes/ModernMinimal.tsx`, `LuxeElegance.tsx`, `GlamStudio.tsx` — responsive headers/navigation.
- `src/components/public/PublicSalonPage.tsx`, `PublicPortfolioPage.tsx` — responsive public/preview controls.

No source files were removed. No database migrations were added or changed. No new environment variables or dependencies were added.

## Validation performed

- `npm ci` — passed; audit reported 0 vulnerabilities.
- `npm run lint` (`tsc --noEmit`) — passed.
- `npm test` — all 23 tests passed, including the new repeated-invoice regression.
- `npm run build` — passed; Vite emitted the existing large-chunk advisory (>500 kB minified client JS).
- Static scope check confirmed the three shortcut labels are absent from `Header.tsx`, public booking route/API and online-booking components remain in source, and migrations are unchanged.
- Archive comparison confirmed no source files were deleted.
- Live preview returned HTTP 200 from the external forwarded URL, and the sandbox browser successfully rendered the homepage after the specific host was added to Vite's allowlist.

## Limits and known issues

- Browser viewport automation and live published salon website verification were not available in this task; responsive behavior was implemented by source inspection, not claimed as hardware/browser-tested across every requested width.
- No thermal printer hardware was available. Printing uses the native browser print dialog; printer driver/paper configuration and physical 58mm/80mm output require real-device verification. This does not claim direct USB/Bluetooth printing.
- Receipt paper width is saved in tenant-namespaced browser local storage (device/browser-specific), not synchronized to the database. No existing printer-settings table/service exists in the supplied code. The actual salon logo is not configured in the existing tenant model; the receipt uses the existing Moonbox logo mark and salon name/contact data.
- The project POS currently reads `StorageService` tenant-filtered records from its established local persistence abstraction, rather than executing a server-side customer query. No Supabase customer-search query/index was invented that would bypass the current architecture.
- No production Supabase credentials, database, printer, or Netlify deployment was accessed. Online booking regression is source-preservation-reviewed and existing automated suites passed; live booking submission was not performed.

## Deployment

Use the existing Netlify configuration (`npm install --legacy-peer-deps --no-audit --no-fund && npm run build`, publish `dist`, existing functions/redirects), with the currently documented `.env.example` configuration supplied through the deployment's secure environment settings. Apply no database migration for these changes. Do not commit actual secrets or deploy without the owner's authorization. After deployment, verify a published salon/portfolio site and online-booking submission, browser print preview with both receipt widths, and the tenant-specific printer setting on the target cashier device.
