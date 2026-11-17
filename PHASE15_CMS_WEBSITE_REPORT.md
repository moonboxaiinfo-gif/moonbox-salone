# Phase 15 CMS and Website Report

## Audit findings (source only)

`src/services/websiteService.ts` stores website records and reviews in browser localStorage/in-memory state. Its local `status === 'published'` check is not a server authorization boundary. Review submission rate limits are browser-only, and stored review objects contain customer phone and tenant identifiers. `src/services/landingPageService.ts` still delegates to local StorageService/platform-content state rather than awaited Supabase persistence. These are not production-durable CMS paths.

`src/services/publicWebsiteApi.ts` calls GET, publish, unpublish, reviews, and a booking fallback under `/api/public/websites/...`. The supplied `netlify/functions/` archive contains only `_security.ts`, `cloudinary-sign.ts`, `send-email.ts`, and `supabase-admin.ts`; there are no matching website route handlers in this archive. Publish/unpublish client requests do not include an Authorization header in the existing code.

## Implemented in this continuation

No CMS tables, endpoint handlers, revision workflows, public projection, or media services were added. This report records actual open work rather than treating existing local methods as a migration.

## Required implementation before release

1. Add authenticated publish/unpublish handlers that verify the caller and derive salon membership/role from trusted state; do not trust a client-provided tenant role or tenant object.
2. Add public slug retrieval that filters published rows server-side and projects only public salon, service, selected staff, portfolio, and approved review fields.
3. Persist reviews server-side as pending; validate size/rating/name and enforce server-side throttling; do not expose customer phone, internal tenant columns, or moderation metadata.
4. Migrate CMS drafts, published state, revision history, preview, publish, and rollback to trusted repository/server operations; prove anonymous draft denial.
5. Implement private media/receipt Storage buckets and path policies; provide scoped signed retrieval rather than public receipt URLs.
6. Add endpoint validation, CORS allowlists, rate limits, error handling, and API tests; then verify against disposable staging only.

**Status:** audited from source; CMS, public website handlers, and private storage NOT IMPLEMENTED/NOT VERIFIED.
