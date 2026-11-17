# Moonbox Salon SaaS — Phase 02 CMS Status

## Implemented and verified

- Added a protected Super Admin `Landing Page Editor` navigation section.
- Added private draft and published content models with revision snapshots.
- Added draft save, reset-to-published, validation, publish, and revision restore service methods.
- Added General, Hero, Gallery, FAQ, Contact & WhatsApp, SEO & Footer editor panels.
- Added image URL editing and local preview uploads for JPG, PNG, and WEBP up to 2 MB.
- Added gallery enable/disable, captions, alt text, display order, replacement, and deletion controls.
- Added FAQ enable/disable, editing, ordering, creation, and deletion controls.
- Added configurable phone, email, address, hours, maps URL, social links, WhatsApp number, and WhatsApp message.
- Added safe WhatsApp URL generation; invalid or empty numbers hide the public WhatsApp button.
- Added dynamic public hero copy, hero poster, gallery, FAQ, footer, contact links, social links, and SEO title/description/canonical updates.
- Added a floating mobile-friendly WhatsApp CTA only when a valid number is configured.
- Kept subscription pricing sourced from the existing `StorageService.getPlans()` path; the CMS does not duplicate plan pricing.
- Added a safe static default fallback when no published CMS document exists.
- Added audit events for draft save, draft reset, and publish actions.
- Added a Supabase migration for platform landing-page documents and media metadata with RLS policies based on the existing AAL2-aware `is_super_admin()` predicate.

## Validation evidence

- TypeScript check passed.
- Unit tests passed: 22/22.
- Production build passed.
- Public homepage returned HTTP 200.
- Route manifest returned HTTP 200.
- `robots.txt` returned HTTP 200.
- `sitemap.xml` returned HTTP 200.
- Desktop public landing-page smoke screenshot reviewed after dynamic bindings.

## Remaining production integration work

- The editor currently persists through the existing browser storage service for the sandbox and fallback mode. Production publishing must connect `LandingPageService` reads/writes to the new Supabase CMS tables so drafts and published versions are shared across administrators and devices.
- The migration creates CMS media metadata tables but a dedicated private/draft-safe platform storage bucket and signed delivery endpoint still need to be deployed. Local editor uploads are data URLs for preview and are not a production asset-storage substitute.
- The current public page binds the most relevant existing CMS sections: hero, gallery, FAQ, contact, WhatsApp, footer, and SEO. The existing feature, story, and how-it-works cards remain source-defined to avoid duplicating the product feature system; they should be moved into CMS JSON only after the production Supabase read/write service is connected.
- DNS/hosting deployment is still required for production Super Admin access and public CMS API delivery.
