# Moonbox Salon — Extreme Motion & Cinematic Upgrade

## Implementation approach

Preserve the existing Moonbox Salon routes, SaaS workflows, branding, content and current light/dark token system. Upgrade the public landing route through reusable Motion components rather than replacing the application architecture. The public experience will use Motion for scroll-linked transforms, reveal choreography, tilt and controlled looping demo states; CSS will provide GPU-friendly ambient gradients, light sweeps, particles, glass depth and reduced-motion fallbacks. No external stock video is available in the repository, so the hero and CTA will use an original CSS cinematic stage with poster-like gradients and floating geometric salon motifs instead of an unstable third-party video URL. The dashboard showcase will remain explicitly labeled as an illustrative demo.

Internal screens will receive restrained motion only: sidebar width transitions, active indicator movement, subtle card entrances and existing modal/dropdown feedback, with POS and appointment workflows optimized for speed. Touch devices will avoid pointer-driven tilt. `prefers-reduced-motion` will disable continuous loops and replace parallax with static composition.

## Project structure

- `src/components/public/NewLandingPage.tsx`: public cinematic page composition, hero stage, scroll storytelling, feature demonstrations, phone showcase and CTA.
- `src/components/landing/mockups.tsx`: reusable animated dashboard, chart, calendar, phone and feature mockups; demo-only state and labels.
- `src/index.css`: shared Moonbox tokens, GPU-friendly keyframes, ambient light and reduced-motion fallbacks.
- `src/components/common/Sidebar.tsx`: restrained internal navigation transitions and grouped shell behavior.
- `src/components/common/Header.tsx`, `src/components/auth/LoginPage.tsx`, `src/context/ThemeContext.tsx`: production-safe account and theme behavior preserved from the prior transformation.

## Design direction

- **Design movement:** cinematic digital atelier — a premium salon operations system presented like a futuristic product film.
- **Core principles:** depth without clutter; continuous but calm motion; real product clarity over decoration; accessible fallback by default.
- **Color philosophy:** deep navy gives the experience cinematic contrast, violet signals intelligence and craft, cyan adds a controlled technological glint, and pale lavender keeps light mode refined rather than stark.
- **Layout paradigm:** an editorial scroll narrative with layered stages, floating product evidence and asymmetric feature moments instead of a static card wall.
- **Signature elements:** crescent-inspired light arcs, translucent floating panels, animated dashboard glass and soft cyan-violet light sweeps.
- **Interaction philosophy:** pointer motion should reward attention without blocking clicks, text selection or keyboard use; motion is directional and informative, not ornamental noise.
- **Animation:** 0.7–1.2s reveal easing for storytelling, 8–14s ambient loops, shallow perspective, limited simultaneous movement, viewport activation and automatic reduced-motion fallback.
- **Typography system:** existing Plus Jakarta Sans with bold editorial headlines, compact tracking for eyebrow labels and readable body copy.
- **Brand essence:** a next-generation salon command center for owners who want operational calm and a more beautiful way to grow; precise, elegant, alive.
- **Brand voice:** concise, confident and craft-led. Example lines: “Your salon. Beautifully managed.” and “Less time managing paperwork. More time growing your business.”
- **Wordmark & logo:** retain the existing official crescent mark exactly; animate only glow, opacity and surrounding light.
- **Signature brand color:** Moonbox violet `#7653F5`, paired with a restrained cyan highlight.

## Build and delivery

Use the existing Motion dependency and avoid adding Three.js, GSAP, video libraries or Lottie without a concrete need. Validate with TypeScript diagnostics, `npm run lint`, `npm run build`, `npm test`, Preview health and route-manifest checks. Save a canonical checkpoint after validation. Do not publish automatically.


# Phase 02 — POS, receipts, navigation, booking scope, and responsive customer websites

## Implementation approach

Continue the existing Vite/React application and its StorageService/local persistence, Supabase RLS/migrations, Netlify functions, routes, and Moonbox visual system. Improve the existing POS without substituting mock services: use tenant-scoped existing customer records, quick client search by normalized phone/name, and the existing customer persistence model for in-POS customer creation with duplicate checks. Preserve the existing transaction write path and only show confirmation/receipt after `createInvoice` succeeds. Add a tenant-specific receipt width preference (58mm/80mm) to the existing invoice/receipt preview and print UI, and reuse saved invoice data for sales-history reprints. No database migration is justified by the inspected data layer; do not add database schema changes or drop shared booking schema.

Remove the three requested shortcuts only from the top header. The current app has no separate standalone Booking Service module: `Booking Service` opens the tenant's existing public booking route, and `online_booking`, `/book/:salonSlug`, public booking APIs, website CTAs, appointments and shared database policies support online booking. Therefore preserve these shared functions, website/portfolio management and data. Keep Platform Website and Setup Wizard functions/routes while removing only their header entries. Improve published salon/portfolio responsive layouts without editing the CMS data model, publishing workflow, or customer content.

## Project structure

- `src/components/pos/POSRegister.tsx`: existing catalog, cart, customer selection and checkout workflow.
- `src/components/customers/CustomerModal.tsx` / `src/services/storageService.ts`: existing tenant-scoped customer record/persistence contracts.
- `src/components/invoices/InvoiceViewModal.tsx` and `InvoiceList.tsx`: receipt preview/thermal printing and saved transaction reprints.
- `src/components/common/Header.tsx`: visible header shortcuts; underlying app routes/workflows remain.
- `src/components/website/` and `src/components/public/`: website builder, public renderer and portfolio pages; responsive changes are presentation-only.
- `supabase/migrations/`: preserve booking-related schema/policies because they support customer-facing online booking; no new migration unless source inspection establishes an actual schema need.

## Design and interaction decisions

Retain the existing Champagne Luxury color system, Plus Jakarta Sans, compact rounded cards and familiar POS controls. The register prioritizes fast search, readable cart totals, large tap targets and error visibility. Receipts use monochrome high-contrast typography, compact content, no decorative background, selectable 58mm/80mm paper, and standard browser printing (no claim of direct hardware pairing). Published websites preserve tenant-defined content and branding while using fluid widths, responsive imagery, wrapping typography and touch-friendly navigation.
