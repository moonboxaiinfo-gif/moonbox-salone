# 07 - SaaS Business Logic Audit

## Lifecycle source coverage

- Registration RPC creates profile, pending salon, owner membership, pending subscription, and audit row.
- Trial grant/revoke/extend RPCs exist, and Netlify also exposes lifecycle actions.
- Package assignment activates the salon and sets subscription status.
- Suspension is controllable through Super Admin status updates.
- Manual bank payments use private receipts and a review RPC.
- Operational entitlement checks test trial/active status, dates, salon status, and plan features.

## Verified working

Static source review confirms business lifecycle records and database entitlement functions exist. Local tests passed for source contracts and repository RPC envelopes.

## Defective or unverified areas

### MBX-AUD-006 - HIGH

Super Admin lifecycle writes are split across separate service-role calls. This violates a strong atomicity requirement for financial and subscription state.

### MBX-AUD-008 - MEDIUM

Trial and subscription state are maintained through both RPC and direct function implementations. Final live behavior depends on which migration is applied and whether remote functions reflect the latest source.

## Required lifecycle tests

1. Register salon and verify pending status.
2. Approve/grant 14-day trial.
3. Verify trial blocks on expiry.
4. Submit bank transfer and private receipt.
5. Reject payment and preserve pending/expired state.
6. Approve payment and activate subscription atomically.
7. Suspend/reactivate salon.
8. Expire active subscription.
9. Verify plan feature entitlements.
10. Verify audit trail for every change.

