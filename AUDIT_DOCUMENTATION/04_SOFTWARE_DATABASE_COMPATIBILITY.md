# 04 - Software/Database Compatibility

## Verified compatibility

The typed repository references Supabase tables and RPCs that correspond to migration definitions:

- `profiles`, `salon_members`, `salons`, `salon_subscriptions`, and `subscription_plans`
- `customers`, `services`, `service_categories`, `staff`, `appointments`
- `products`, `product_categories`, `stock_movements`, `invoices`, `commissions`
- `expenses`, `expense_categories`, `manual_payment_requests`, `support_tickets`
- `notifications`, `audit_logs`, `announcements`
- `website_configs`, `website_reviews`, `landing_page_documents`, `landing_page_media`

Representative RPC calls include `create_salon_for_current_user`, `submit_public_booking`, `create_pos_invoice`, `record_stock_movement_atomic`, `review_manual_payment`, `get_salon_customers`, `get_salon_appointments`, `save_salon_customer`, `save_salon_appointment`, and `mark_commission_paid`.

## Mismatch findings

### MBX-AUD-002 - HIGH

- **Exact path:** `server.mjs`, `publicWebsiteApi.ts`, `netlify/functions/public-api.ts`
- **Description:** Public booking and website traffic can target different storage architectures.
- **Evidence:** Express/MySQL endpoints use `mbx_*` tables, while browser Netlify/Supabase code invokes Netlify resources and Postgres RPCs.
- **Business impact:** Published websites, reviews, and bookings may be split across systems.
- **Technical impact:** Duplicate IDs, missing records, inconsistent entitlement checks, and unusable fallback paths.
- **Recommended solution:** Make Netlify/Supabase the single public path and remove or clearly isolate the MySQL server.
- **Verification procedure:** Call each public endpoint from the deployed frontend and verify only the expected backend receives each write.

### MBX-AUD-008 - MEDIUM

- **Exact path:** `supabase/migrations/20261017000000_admin_controlled_trials_and_mfa.sql`, `supabase/migrations/20261117190000_database_architecture_completion.sql`, `netlify/functions/supabase-admin.ts`
- **Description:** Trial semantics are implemented in both database RPCs and direct Netlify service-role writes.
- **Evidence:** The latest migration says `trial_ends_at` is authoritative, while `extend_trial` in the Netlify function updates subscription status and `trial_ends_at` but not `end_date`.
- **Business impact:** An incorrectly synchronized UI or partial migration state could cause inconsistent expiry displays.
- **Technical impact:** Direct writes have no shared database transaction or central trial invariant.
- **Recommended solution:** Route all trial/package/payment changes through audited database RPCs with one transaction.
- **Verification procedure:** Extend/revoke/activate in staging and verify salon status, subscription status, trial date, end date, audit row, and operational helper result atomically.

