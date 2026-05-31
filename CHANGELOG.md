# Changelog

All notable changes to HAIP are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added — Split Folios & House Accounts

- **House Accounts** — a non-guest ledger for walk-in retail, bar/restaurant,
  vendor, or internal sales not tied to any reservation. Open/close lifecycle,
  a `products` retail catalog, and charge/payment posting on the same unified
  ledger as folios. New `/house-accounts` + `/products` endpoints and
  `houseaccount.*` webhook events.
- **Split Folio** — multiple folios per reservation with config-driven routing
  rules (room & tax → company, incidentals → guest) and move-transactions
  between folios (individually or by charge type; night-audit-locked charges are
  protected). New `/folios/routing-rules` and `/folios/:id/move-transactions`
  endpoints.
- **Payment Correction Matrix** — `POST /payments/:id/correct` picks the safe
  operation by payment state: **void** uncaptured authorizations (and same-day
  cash), **refund** captured cards, or post a compensating **adjustment**.
  Illegal overrides (e.g. voiding a captured card) are rejected.
- Schema: `charges`/`payments` now belong to **either** a folio **or** a house
  account (`folio_id` nullable + nullable `house_account_id`).

### Added — AI Intelligence Layer (accounting)

AI on top of the new accounting layer — a differentiator with no equivalent in
the baseline feature set. HAIP now ships **10 built-in agents** (was 9).

- **A/R Collections Prioritization agent** (new agent type `ar_collections`) —
  ranks open Accounts Receivable ledgers by collection priority (balance × days
  overdue beyond terms × open-transfer count) into low/medium/high tiers with a
  recommended action.
- **Cash-variance anomaly detection** — the Night Audit Anomaly agent now scans
  closed cashier shifts and flags over/short drawer variances
  (`cash_variance_outlier`, 11 anomaly types total).
- **Deposit-forfeit risk scoring** — the Cancellation Prediction agent now scores
  held deposits as likely-forfeit vs. likely-refund with exposure amounts
  (additive `depositRisk` on each reservation score).

### Added — Accounting & Cashiering

A new accounting layer that makes HAIP's financials correct-by-construction,
not just functional.

- **Deposit Ledger** — advance deposits are now tracked as a **liability**, not
  revenue, with a full recognition lifecycle: `held → applied → refunded /
  forfeited`, including refundable vs. non-refundable handling and
  status-transition guards. New `/deposits` endpoints and `deposit.*` webhook
  events.
- **Accounts Receivable (A/R)** — named A/R ledgers for post-stay direct billing.
  Transfer an outstanding folio balance to A/R (zeroing the folio), record A/R
  payments, reverse transfers with a preserved audit trail, and view aging
  buckets (0–30 / 31–60 / 61–90 / 90+). New `/ar/*` endpoints and `ar.*` webhook
  events.
- **Cash Drawer & Cashiering** — per-drawer cash tracking with shift sessions,
  cash movements (payment, refund, paid-out, drop), shift close with
  expected-vs-counted **variance** detection, and a cashier's report. New
  `/cash/*` endpoints and `cashdrawer.*` webhook events.
- **Daily Trial Balance** — reconciliation across the Deposit, Guest, and A/R
  ledgers. New `GET /reports/trial-balance` endpoint.
- **Custom Accounting Codes** — user-defined transaction and General Ledger (GL)
  codes for export to external accounting systems. New `/accounting/codes`
  endpoints.

### Changed
- API surface grew to ~140 endpoints (+42: 20 accounting, 7 cashier, 11 house
  accounts/products, 3 split-folio, plus payment-correct and the trial-balance
  report).
- Webhook catalog grew to **55 event types** (+18: 11 accounting, 7 house-account
  & folio).
- Test suite: **643 tests across 53 files** (was 551 across 45), all passing —
  61 new tests across the accounting, AI-hook, house-account, split-folio, and
  payment-correction features.

### Notes
- All new property-scoped tables enforce `property_id` multi-tenancy: every
  read/update/delete filters by both `id` and `propertyId`.
- Money math uses `decimal.js` with `numeric(12,2)` storage throughout.
- 7 new tables and 6 new enums, added to the idempotent `push-schema.ts`
  migration.
- The A/R transfer-to-zero is a ledger move (reuses the folio adjustment path),
  not a payment, per the deposit/A/R domain rules.

## [0.1.0]

Initial public baseline: reservations, folios, rate plans, rooms, guests,
housekeeping, night audit, reports, channel manager, payments (Stripe), tax
engine, webhooks, Connect API, and the 9-agent AI framework.
