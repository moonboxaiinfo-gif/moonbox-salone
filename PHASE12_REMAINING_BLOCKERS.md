# Moonbox Salon — Phase 12 Remaining Blockers

The application code and local validation are complete for this phase. The items below remain before production readiness; they were not performed because the supplied project is demo/test-only and explicitly forbids live database use, SQL execution, credential creation and deployment.

## Database and security verification

1. **Migration not applied.** `supabase/migrations/20261114000000_phase12_domain_integrity.sql` is source-only. Review it against the actual deployed schema and migration history, then apply through the normal migration process in disposable staging. In particular, verify the existing column names/types, function signature/grants, trigger ordering and data compatibility before release.
2. **RLS/roles not live-tested.** Repository code checks the authenticated user’s active `salon_members` set and scopes repository access to that salon, but no two-tenant RLS tests or Owner/Manager/Receptionist/Staff permission matrix were run against PostgreSQL. Inactive membership, revocation, session expiry and account switching need staging tests. RLS remains authoritative.
3. **Concurrency not database-executed.** The migration retains the existing overlap trigger/idempotency index and adds advisory locks and server booking checks, but concurrent public booking, simultaneous customer matching, duplicate idempotency retries and direct appointment conflicts require actual Postgres tests.
4. **No SQL parser/runtime validation.** The SQL was reviewed as source and covered by source-contract tests; it was deliberately not executed. Validate it using the project’s normal migration/test setup before deployment.

## Behavioral limits requiring staging/product review

- Public booking and staff/appointment validation now use configured weekly salon/staff hours and breaks where entries exist. The application has no explicit salon timezone field, holiday/exception calendar or tested interpretation for every legacy row with empty hours. Confirm defaults and business-local time behavior before publishing bookings.
- Public RPC rejects past dates and enforces duration/overlap, but advance-notice windows and the maximum booking horizon are not enforced server-side in this migration. Add and test timezone-aware server rules if those settings must be security/business constraints rather than UI guidance.
- Appointment calendar/modal client conflict checks are advisory and may be stale; the database overlap trigger is final. Verify error mapping and user-visible retry behavior against real PostgREST constraint errors.
- Customer deletion is not supported by the supplied business workflows/repository and was not added. If a deletion/retention policy is introduced later, implement it as a separately authorized, audited operation.

## Test-infrastructure and release blockers

- Phase 12 added source-contract and fake-client tests for loading/error/retry/cancellation/session guards and confirmed CRUD, but there is no mounted React/DOM test setup in the supplied project. Browser-rendered loading/empty/error/retry and in-flight tenant/session switch scenarios remain untested dynamically.
- Production Supabase URL/anon-key setup, controlled staging configuration, migration application and deployment were not performed. `.env.example` remains a template; no actual credentials were requested or created.
- `npm run build` passes but retains the project’s Vite warning that the main JavaScript chunk is above 500 kB. This is a performance follow-up, not a Phase 12 correctness failure.

**Release gate:** Do not represent this project as live-verified or enable production booking until the additive migration is reviewed/applied in staging and the RLS, role, status, working-hours, overlap and idempotency tests pass against the intended database.
