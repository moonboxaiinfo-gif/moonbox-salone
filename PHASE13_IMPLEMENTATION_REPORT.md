# Phase 13 Implementation Report

**Project:** Moonbox Salon, Moonbox Digital Sri Lanka  
**Scope:** Database integrity, security, migration readiness, and POS financial boundary  
**Status:** Partial implementation; migration is additive source only. No database connection or deployment was used.

## Implemented

Added `supabase/migrations/20261116000000_phase13_pos_authoritative.sql`. It replaces the existing POS RPC without modifying earlier migration files. The RPC checks the authenticated server-side `sell` permission, serializes duplicate invoice numbers, validates line shape and quantity, resolves service/product prices from salon-owned rows, checks customer and staff ownership, derives line subtotals/discount/tax/total/paid amount, locks product rows in stable order, prevents insufficient-stock sales, creates stock movements, updates customer aggregates, records staff commissions using database rates, and returns the persisted invoice envelope. The migration also removes the broad invoice `FOR ALL` policy and authenticated direct invoice DML grants so invoice writes use the RPC boundary.

The same additive migration restricts membership administration to owners (or the existing AAL2 Super Admin helper) and replaces the payment-review function’s invalid email-to-UUID assignment with `auth.uid()` for `reviewed_by`. The Super Admin MFA check and pending-only payment transition are retained.

A focused source review caught and corrected two additional migration hazards before packaging: invoice amount checks now align with `NUMERIC(12,2)` destination limits, commission amount columns are widened to match, and the owner policy is dropped before creation so the migration source is rerunnable. These remain unparsed source changes; PostgreSQL validation is outstanding.

Application changes add cancellable async tenant resources for products, stock movements, product categories, expenses, expense categories, and commissions. Inventory, POS product selection, expenses, and commissions now consume those resources with loading/error/retry states. Product stock changes go through the stock-movement RPC; opening inventory starts at zero, uses the confirmed database product UUID, and records a movement. Post-commit re-fetches were removed from stock/invoice/expense/commission write wrappers so a refresh failure cannot be reported as a failed committed mutation. `.env.example` now uses empty values with browser/server variable separation.

## Validation evidence

Baseline before edits: `npm run lint` passed; `npm test -- --run` passed 12 files / 68 tests; `npm run build` passed with the existing large-chunk advisory.

After the first implementation pass: `npm run lint` passed; `npm test -- --run` passed 13 files / 74 tests. Final validation is recorded in `PHASE16_TEST_RESULTS.md` after the packaging pass. Static source-contract tests do not execute PostgreSQL and do not prove deployed RLS.

## Not implemented / not verified

No SQL was executed, parsed by a PostgreSQL server, or applied. No live/staging Supabase project, Netlify deployment, or production system was accessed. The role matrix remains incomplete outside the targeted membership/invoice/payment changes; customer and appointment policies, Storage policies, AAL2 behavior, migration compatibility, concurrency, and database grants require disposable staging tests. This report does not call the project Phase 13 complete or production-ready.
