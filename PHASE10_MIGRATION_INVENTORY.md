# Phase 10 Supabase Migration Inventory

No migration was modified or executed during Phase 10. The archive contains these ten migrations, in dependency order:

1. `supabase/migrations/20261013000000_initial_schema.sql`
2. `supabase/migrations/20261017000000_admin_controlled_trials_and_mfa.sql`
3. `supabase/migrations/20261028000000_website_portfolio_builder.sql`
4. `supabase/migrations/20261109000000_enforce_superadmin_aal2.sql`
5. `supabase/migrations/20261109000001_landing_page_cms.sql`
6. `supabase/migrations/20261111000000_appointment_operations_hardening.sql`
7. `supabase/migrations/20261112000000_public_boundary_hardening.sql`
8. `supabase/migrations/20261113000000_auth_registration_rpc.sql`
9. `supabase/migrations/20261113000001_pos_atomic_rpc.sql`
10. `supabase/migrations/20261113000002_phase4_business_transactions.sql`

## Status

- Duplicate timestamps found: none in the supplied archive.
- Live migration history checked: no; no live Supabase project is connected.
- SQL executed: no.
- Applied-migration assumptions: not made.
- Additive migration required next: reviewed server-side POS price/totals authority, plus any notification/support/CMS schema gaps confirmed against staging.

Before applying anything, compare the target staging database migration history with this exact list and apply only missing migrations after review. Do not replay already-applied files.
