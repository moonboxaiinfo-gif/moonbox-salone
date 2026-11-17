# Moonbox Salon — Landing Asset Optimization Report

## Scope

The existing Moonbox Salon application was preserved. Changes are limited to the public marketing landing page, its verified decorative assets, and marketing-image delivery. Authentication, salon dashboard modules, public booking, portfolio/CMS data, Supabase migrations, Netlify Functions, tenant isolation, and Super Admin workflows were not removed or replaced.

## Asset decisions

| Asset | Decision | Reason |
|---|---|---|
| `public/moonbox-salon-lifestyle-hero.mp4` | Removed | Used only as a decorative landing-page background; replaced with the configured static hero image. |
| `public/moonbox-hero-cinematic.mp4` | Removed | No source reference found. No functional dependency. |
| `public/moonbox-hero-cinematic-poster.jpg` | Removed | No source reference found after full-project search. |
| `public/moonbox-salon-lifestyle-hero-poster.jpg` | Keep | Used by landing defaults, SEO metadata, and retained as a static hero fallback. |
| `public/salon-interior-still.jpg` | Keep | Used by public salon pages, landing gallery, and the static experience section. |
| `public/salon-stylist-still.jpg` | Keep | Used by landing gallery and seeded salon content. |
| `public/salon-client-still.jpg` | Keep | Used by landing gallery and seeded salon content. |
| `public/brand/moonbox-salon-official.jpg` | Keep unchanged | Official brand asset used for metadata and favicon. |
| `public/brand/moonbox-salon-mark.jpg` | Keep unchanged | Functional logo used throughout application screens. |
| `public/*-management.jpg` and `services-packages.jpg` | Keep as fallback/CMS-safe originals | Existing content may reference these paths; they were not overwritten or deleted. |
| `public/*-management.webp` and `services-packages.webp` | Added | Compressed landing-page delivery variants; approximately 126–196 KB each versus multi-megabyte source JPGs. |

## Landing page changes

The hero and experience panel no longer download or autoplay background video. They use static imagery with eager hero loading, `fetchPriority="high"`, explicit alternative text where applicable, and lazy loading below the fold. The new public palette is scoped to `.moonbox-landing`: deep navy, royal blue, electric cyan, white, and neutral grey. Internal salon operations retain their existing styling tokens.

Default marketing copy now uses the requested positioning: “Run Your Salon. Beautifully.” with the supporting message about appointments, clients, staff, sales, and the full salon business. Existing CMS-published values still override these defaults through `LandingPageService`.

The dashboard mockup and ambient motion accents were aligned to the new blue/cyan palette. Reduced-motion behavior remains active through the existing motion primitives and CSS fallback.

The final light-mode pass adds a warm ivory base, light-blue elevated surfaces, controlled gradient section backgrounds, stronger navy text contrast, and more restrained depth shadows. These refinements are scoped to the public landing page; the dark theme continues to use its separate navy surface tokens and the theme toggle remains unchanged.

The complete landing-page pass also aligns the default hero with “Your Salon. Your Business. One Beautiful System.”, simplifies the primary navigation to Home, Features, How It Works, Pricing, and FAQ while retaining Login and Get Started actions, and adds a capability strip for appointment management, salon operations, customer management, and business insights. Existing product previews, pricing retrieval, FAQ content, CTA handlers, and CMS overrides remain connected.

The complete visual replacement now lives in `src/components/public/PremiumLandingPage.tsx`. The public root route in `src/App.tsx` uses this new composition; the previous landing component remains available in source but is no longer the public root presentation. The replacement uses the real published landing content, real configured plans, existing FAQ data, official logo, genuine dashboard/calendar/customer previews, and the existing login, registration, and interactive-demo handlers.

## Preserved

All existing public routes, auth screens, salon dashboard modules, appointment workflow, public booking flow, portfolio/public salon pages, CMS editor, subscription flow, Supabase schemas/migrations, RLS boundaries, environment variable architecture, and Netlify Functions remain in place.

## Verification

- `npm run lint` — executed after changes.
- `npm test -- --run` — existing test suite retained.
- `npm run build` — production build executed after changes.
- Light-mode refinement build, tests, and live preview checks — passed.
- Complete visual replacement lint, tests, build, and root-route checks — passed.
- Full-project search completed before video deletion; no remaining source references to the removed MP4s or unused cinematic poster.
- No production database or deployment was modified.

## Remaining considerations

The source JPG marketing assets are intentionally retained as safe fallbacks and for possible CMS/local-storage references. They can only be removed after confirming that deployed CMS content and any persisted landing configuration no longer references them.
