<p align="center">
  <img src="https://img.shields.io/badge/HAIP-Hotel%20AI%20Platform-0066FF?style=for-the-badge&labelColor=000000" alt="HAIP" />
</p>

<h1 align="center">HAIP — Hotel AI Platform</h1>

<p align="center">
  <strong>The open-source, API-first hotel PMS where AI agents are first-class citizens.</strong>
</p>

<p align="center">
  <a href="https://github.com/telivity-otaip/haip/actions"><img src="https://github.com/telivity-otaip/haip/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript&logoColor=white" alt="TypeScript Strict" />
  <img src="https://img.shields.io/badge/NestJS-framework-E0234E?logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/PostgreSQL-database-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/License-Apache%202.0-blue" alt="Apache 2.0 License" />
  <img src="https://img.shields.io/badge/Status-Phase%208%20Complete-brightgreen" alt="Phase 8 Complete" />
</p>

<p align="center">
  <a href="#what-is-haip">What is HAIP</a> &middot;
  <a href="#architecture">Architecture</a> &middot;
  <a href="#features">Features</a> &middot;
  <a href="#tech-stack">Tech Stack</a> &middot;
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#api-reference">API Reference</a> &middot;
  <a href="#otaip-integration">OTAIP Integration</a> &middot;
  <a href="#contributing">Contributing</a>
</p>

---

## What is HAIP

The hotel industry runs on closed-source, legacy PMS platforms that charge per-room fees, lock data behind proprietary APIs, and treat integrations as an afterthought. Hotels pay $5–15/room/month just for the privilege of managing their own operations.

HAIP is a **complete, production-grade hotel Property Management System** built from scratch with modern architecture. Reservation lifecycle, folio & billing, rate plans, housekeeping with digital checklists, night audit, channel distribution to 450+ OTAs, revenue reporting, a React admin dashboard — all open source under Apache 2.0.

What makes HAIP different is that **AI agents are built into the architecture from day one**. HAIP is the sister project to [OTAIP](https://github.com/telivity-otaip/otaip) (Open Travel AI Platform). Together they form **Telivity's open-source travel infrastructure**. OTAIP agents connect to HAIP via the Connect API — the PMS works without AI, but the AI makes it extraordinary.

### What HAIP is NOT

HAIP is not a wrapper around another PMS. It's not a booking widget. It's not a SaaS dashboard with "AI" slapped on the marketing page. It's a real PMS with real hotel operations logic — night audits at 3am, folio routing rules, rate parity enforcement, guest registration compliance across jurisdictions.

---

## Architecture

```mermaid
graph TB
    subgraph Clients
        Dashboard["React Dashboard<br/>(Vite + TanStack Query)"]
        OTAIP["OTAIP Agents<br/>(Hotel Search · Rate Compare · Booking)"]
        ThirdParty["Third-Party Integrations"]
    end

    subgraph HAIP["HAIP PMS (NestJS)"]
        direction TB
        REST["REST API<br/>OpenAPI 3.0"]
        WS["WebSocket Gateway<br/>Real-time Events"]
        Connect["Connect API<br/>OTAIP Agent Layer"]

        subgraph Modules
            direction LR
            Reservation["Reservations<br/>Lifecycle + Availability"]
            Folio["Folio & Billing<br/>Charges + Routing"]
            Room["Rooms<br/>Status State Machine"]
            Guest["Guest Profiles<br/>VIP + Preferences"]
            RatePlan["Rate Plans<br/>BAR + Derived + Restrictions"]
            Payment["Payments<br/>Stripe/Adyen Tokenization"]
            HK["Housekeeping<br/>Tasks + Checklists + Inspection"]
            NA["Night Audit<br/>Automated Day Close"]
            Channel["Channel Manager<br/>ARI Sync + Rate Parity"]
            Reports["Reports<br/>Revenue + Occupancy + KPIs"]
        end

        Webhook["Webhook Engine<br/>entity.action Events"]
    end

    subgraph Infrastructure
        PG["PostgreSQL 16<br/>(Multi-tenant)"]
        Redis["Redis 7<br/>(Cache + Pub/Sub)"]
        OTAs["OTA Channels<br/>Booking.com · Expedia · 450+"]
    end

    Dashboard -->|HTTP + WebSocket| REST
    Dashboard -->|Real-time| WS
    OTAIP -->|REST| Connect
    ThirdParty -->|REST| REST

    REST --> Modules
    Connect --> Modules
    Modules --> PG
    Modules --> Redis
    Channel --> OTAs
    Webhook -->|POST| ThirdParty
    WS -->|Broadcast| Dashboard
```

**Option B Architecture** — The PMS is standalone. It works without OTAIP. OTAIP agents sit on top via the Connect API, using purpose-built endpoints for AI agent workflows. This is the [Apaleo](https://apaleo.com) model, done open source.

### Key Design Decisions

- **Multi-tenant from day one** — `property_id` on every table, designed for portfolio operators managing multiple hotels
- **Event-driven** — Webhook events on every state change (`reservation.created`, `folio.charge_posted`, `room.status_changed`). Build anything on top.
- **ChannelAdapter pattern** — Same abstraction as OTAIP's ConnectAdapter. SiteMinder/DerbySoft adapters for instant 450+ OTA reach
- **Compliance as infrastructure** — PCI tokenization (Stripe/Adyen), GDPR audit trails, guest registration per jurisdiction. Not bolted on — built in.
- **Real-time dashboard** — WebSocket broadcasting per property. Room status changes, new reservations, housekeeping updates — all pushed instantly.

---

## Features

### Reservation Management
- Full lifecycle state machine: `pending → confirmed → assigned → checked_in → stayover → due_out → checked_out`
- Real-time availability engine with room type inventory
- Room assignment with automatic status transitions
- Group check-in (batch operations)
- Express checkout
- No-show and cancellation handling with policy enforcement
- Every state transition fires a webhook event and is audit-logged

### Folio & Billing
- Guest folios, master folios, and city ledger accounts
- Charge posting with department codes and revenue categories
- Charge routing rules (e.g., room & tax to company, incidentals to guest)
- Charge reversal, transfer between folios, and city ledger transfer
- Folio settlement and close workflows
- Charge locking for night audit

### Rate Plans & Pricing
- BAR (Best Available Rate), derived rates, and negotiated rates
- Rate derivation: amount or percentage adjustments from parent plans
- Restrictions: MinLOS, MaxLOS, CTA (Closed to Arrival), CTD (Closed to Departure)
- Effective rate calculation with date-range awareness
- Occupancy-based rate adjustments

### Room Management
- Room type configuration with amenities, max occupancy, and base rates
- Room status state machine: `vacant_clean → occupied → vacant_dirty → clean → inspected → guest_ready`
- Connecting room support
- ADA/accessible room tracking
- Real-time status summary dashboard

### Guest Profiles
- Full guest profiles with contact, preferences, and stay history
- VIP level tracking (standard, silver, gold, platinum, diamond)
- Do Not Rent (DNR) flagging
- GDPR consent tracking and data retention controls
- Guest search with flexible filters

### Housekeeping
- Task CRUD with 6 task types: checkout clean, stayover, deep clean, inspection, turndown, maintenance
- Auto-task creation on checkout (event-driven via `room.status_changed`)
- Digital checklists with templates per task type
- ADA and VIP-aware checklist augmentation (automatic extra items)
- Staff assignment, auto-assignment (round-robin by floor/priority), and workload tracking
- Task lifecycle: `pending → assigned → in_progress → completed → inspected`
- Inspection pass/fail with automatic re-clean on failure
- Room status integration — completing a task transitions the room through `clean → inspected → guest_ready`
- Stayover task generation for occupied rooms
- Dashboard with room summary, task summary, housekeeper performance, and urgent rooms
- Analytics: average turn time, median turn time, inspection pass rate, maintenance issue rate, breakdown by room type and housekeeper

### Night Audit & Reporting
- Automated night audit: room revenue posting, no-show processing, rate validation, day close
- Daily revenue reports with department breakdown
- Occupancy reports with ADR (Average Daily Rate) and RevPAR
- Financial summaries with revenue categories
- Occupancy trend analysis over date ranges
- KPI dashboard in the admin UI

### Channel Manager
- ARI (Availability, Rates, Inventory) push to connected OTAs
- Channel connection management with credentials and mapping
- Inbound reservation processing from OTA channels
- Reservation pull from channels
- Rate parity monitoring and enforcement
- Rate override capabilities per channel
- Stop-sell functionality
- Sync logging for audit trails
- SiteMinder adapter pattern for 450+ OTA connectivity

### Payments
- PCI DSS compliant — never stores raw card data
- Stripe/Adyen tokenization
- Authorization, capture, void, and refund workflows
- Payment recording with method tracking (card, cash, bank transfer)
- Linked to folio charges

### Webhook Engine
- Real-time webhook delivery on every entity state change
- Event format: `entity.action` (e.g., `reservation.created`, `housekeeping.task_completed`)
- Subscription management for external consumers

### Admin Dashboard
- React SPA with 12 pages: Dashboard, Reservations, Check-In/Out, Guests, Rooms, Housekeeping, Rate Plans, Folios, Night Audit, Reports, Channel Manager, Settings
- Real-time updates via WebSocket (new reservations, room status changes)
- Responsive layout with mobile sidebar drawer
- Calendar view for reservations (day/week/month)
- Housekeeping kanban board
- KPI cards with trend indicators
- Skeleton loading states, toast notifications, error boundaries
- Served as static files in production (single Docker image)

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Language | TypeScript (strict mode) | End-to-end type safety |
| Runtime | Node.js ≥ 20 | Server runtime |
| API Framework | NestJS | Modules, DI, decorators, OpenAPI generation |
| Frontend | React 19 + Vite | Admin dashboard SPA |
| UI State | TanStack Query + TanStack Router | Server state + file-based routing |
| Styling | Tailwind CSS 4 | Utility-first CSS |
| Database | PostgreSQL 16 | Multi-tenant relational storage |
| ORM | Drizzle ORM | TypeScript-native, no magic |
| Cache & Queue | Redis 7 + BullMQ | Caching, job queues, pub/sub |
| Real-time | Socket.IO (via NestJS Gateway) | WebSocket broadcasting per property |
| API Spec | OpenAPI 3.0 (auto-generated) | Swagger UI at `/docs` |
| Auth | OAuth 2.0 / OpenID Connect | Standards-based authentication |
| Payments | Stripe / Adyen (tokenized) | PCI DSS compliant |
| Package Manager | pnpm workspaces | Monorepo management |
| Testing | Vitest + React Testing Library | Unit and component tests |
| Build | tsup (packages) + Vite (dashboard) + nest build (API) | Fast builds |
| Containers | Docker + docker-compose | Local dev and production deployment |
| CI | GitHub Actions | Automated testing and builds |

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Docker & Docker Compose

### Run locally (development)

```bash
# Clone the repository
git clone https://github.com/telivity-otaip/haip.git
cd haip

# Start PostgreSQL + Redis
docker compose up -d postgres redis

# Install dependencies
pnpm install

# Copy environment config
cp .env.example .env

# Build workspace packages (database + shared)
pnpm build

# Run database migrations
pnpm --filter @haip/api run migrate

# Seed demo data (Telivity Grand Hotel)
pnpm --filter @haip/api run seed

# Start the API (with hot reload)
pnpm dev

# In a separate terminal — start the dashboard
pnpm --filter @haip/dashboard dev
```

- API: `http://localhost:3000`
- Swagger docs: `http://localhost:3000/docs`
- Dashboard: `http://localhost:5173`

### Run with Docker (production)

```bash
docker compose up
```

This starts PostgreSQL, Redis, and the HAIP API + Dashboard in a single container. The dashboard is served as static files by NestJS in production mode.

### Run tests

```bash
# All tests (API + Dashboard)
pnpm test

# API tests only
pnpm --filter @haip/api test

# Dashboard component tests
pnpm --filter @haip/dashboard test

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

---

## Demo Hotel — Telivity Grand Hotel

The seed script creates a fully configured demo property with realistic data:

| Entity | Count | Details |
|--------|-------|---------|
| Property | 1 | Telivity Grand Hotel — 4-star, 85 rooms, USD, America/New_York |
| Room Types | 5 | Standard King, Standard Double, Deluxe King, Junior Suite, Executive Suite |
| Rooms | 85 | Across 8 floors with real room numbers, 5 ADA-accessible rooms |
| Rate Plans | 4 | BAR, AAA Discount (-15%), Corporate (-20%), Weekend Package |
| Guests | 20 | Mix of VIP levels (standard through diamond), loyalty tiers |
| Reservations | 30 | Spread across all statuses: confirmed, checked-in, checked-out, cancelled |
| Folios | 15 | With charges: room revenue, F&B, minibar, parking |
| Housekeeping Tasks | 12 | Checkout cleans, stayovers, deep cleans with checklists |

Use this data to explore the API and dashboard immediately after setup.

---

## Project Structure

```
haip/
├── apps/
│   ├── api/                        # NestJS API application
│   │   ├── src/
│   │   │   ├── database/           # Drizzle connection + module
│   │   │   └── modules/
│   │   │       ├── channel/        # Channel manager (ARI, rate parity, OTA sync)
│   │   │       ├── connect/        # OTAIP agent API layer
│   │   │       ├── events/         # WebSocket gateway
│   │   │       ├── folio/          # Folios, charges, routing, city ledger
│   │   │       ├── guest/          # Guest profiles, VIP, preferences
│   │   │       ├── health/         # Health check
│   │   │       ├── housekeeping/   # Tasks, checklists, inspection, dashboard
│   │   │       ├── night-audit/    # Automated night audit + day close
│   │   │       ├── payment/        # Tokenized payments (Stripe/Adyen)
│   │   │       ├── property/       # Multi-property configuration
│   │   │       ├── rate-plan/      # Rates, derivation, restrictions
│   │   │       ├── reports/        # Revenue, occupancy, financial reports
│   │   │       ├── reservation/    # Booking lifecycle + availability
│   │   │       ├── room/           # Room types, inventory, status machine
│   │   │       └── webhook/        # Event dispatch engine
│   │   ├── Dockerfile              # Multi-stage build (API + Dashboard)
│   │   └── tsconfig.json
│   └── dashboard/                  # React admin dashboard
│       ├── src/
│       │   ├── components/         # Layout, UI primitives, modals
│       │   ├── hooks/              # useApi, useSocket, data hooks
│       │   ├── pages/              # 12 page components
│       │   └── lib/                # API client, utilities
│       ├── tailwind.config.ts
│       └── vite.config.ts
├── packages/
│   ├── database/                   # Drizzle ORM schema + migrations
│   │   └── src/schema/             # 10 table files (property, room, guest, etc.)
│   └── shared/                     # Shared types, enums, constants
├── kb/                             # Domain knowledge base (hotel operations truth)
├── briefs/                         # Build briefs (implementation specs)
├── docker-compose.yml              # PostgreSQL + Redis + API
├── CLAUDE.md                       # AI agent constitution
└── .env.example                    # Environment template
```

---

## API Reference

All endpoints are prefixed with `/api/v1/` and documented via OpenAPI 3.0. Run the API and visit `http://localhost:3000/docs` for the interactive Swagger UI.

### Core Endpoints (~90 total)

<details>
<summary><strong>Reservations</strong> — 13 endpoints</summary>

```
POST   /api/v1/reservations/search-availability   # Real-time availability check
POST   /api/v1/reservations/group-check-in         # Batch check-in
POST   /api/v1/reservations                        # Create reservation
GET    /api/v1/reservations                        # List (filtered, paginated)
GET    /api/v1/reservations/:id                    # Get with guest/room/rate
PATCH  /api/v1/reservations/:id                    # Modify dates/room/rate
PATCH  /api/v1/reservations/:id/confirm            # Confirm
PATCH  /api/v1/reservations/:id/assign-room        # Assign room
PATCH  /api/v1/reservations/:id/check-in           # Check in
PATCH  /api/v1/reservations/:id/check-out          # Check out
POST   /api/v1/reservations/:id/express-checkout   # Express checkout
PATCH  /api/v1/reservations/:id/cancel             # Cancel
PATCH  /api/v1/reservations/:id/no-show            # Mark no-show
```
</details>

<details>
<summary><strong>Folios & Billing</strong> — 12 endpoints</summary>

```
POST   /api/v1/folios                              # Create folio
GET    /api/v1/folios                              # List with filters
GET    /api/v1/folios/:id                          # Get folio
PATCH  /api/v1/folios/:id                          # Update folio
PATCH  /api/v1/folios/:id/settle                   # Settle folio
PATCH  /api/v1/folios/:id/close                    # Close folio
POST   /api/v1/folios/:id/charges                  # Post charge
GET    /api/v1/folios/:id/charges                  # List charges
POST   /api/v1/folios/:id/charges/:chargeId/reverse # Reverse charge
POST   /api/v1/folios/:id/charges/lock             # Lock charges
POST   /api/v1/folios/:id/transfer-charge          # Transfer charge
POST   /api/v1/folios/:id/transfer-to-city-ledger  # Transfer to city ledger
```
</details>

<details>
<summary><strong>Housekeeping</strong> — 15 endpoints</summary>

```
GET    /api/v1/housekeeping/dashboard              # Room + task + staff summary
GET    /api/v1/housekeeping/analytics              # Turn times, pass rates, trends
POST   /api/v1/housekeeping/generate-stayover-tasks # Generate daily stayover tasks
POST   /api/v1/housekeeping/auto-assign            # Round-robin task assignment
POST   /api/v1/housekeeping/tasks                  # Create task
GET    /api/v1/housekeeping/tasks                  # List tasks (filtered)
GET    /api/v1/housekeeping/tasks/:id              # Get task
PATCH  /api/v1/housekeeping/tasks/:id              # Update task
DELETE /api/v1/housekeeping/tasks/:id              # Delete task
PATCH  /api/v1/housekeeping/tasks/:id/assign       # Assign to housekeeper
PATCH  /api/v1/housekeeping/tasks/:id/start        # Start task
PATCH  /api/v1/housekeeping/tasks/:id/unassign     # Unassign task
PATCH  /api/v1/housekeeping/tasks/:id/complete     # Complete with checklist
PATCH  /api/v1/housekeeping/tasks/:id/inspect      # Inspect (pass/fail)
PATCH  /api/v1/housekeeping/tasks/:id/skip         # Skip task
```
</details>

<details>
<summary><strong>Channel Manager</strong> — 17 endpoints</summary>

```
POST   /api/v1/channels/connections                # Create channel connection
GET    /api/v1/channels/connections                # List connections
GET    /api/v1/channels/connections/:id            # Get connection
PATCH  /api/v1/channels/connections/:id            # Update connection
DELETE /api/v1/channels/connections/:id            # Deactivate connection
POST   /api/v1/channels/connections/:id/test       # Test connection
POST   /api/v1/channels/push/availability          # Push availability to OTAs
POST   /api/v1/channels/push/rates                 # Push rates/restrictions
POST   /api/v1/channels/push/full                  # Push full ARI
POST   /api/v1/channels/push/stop-sell             # Push stop-sell
GET    /api/v1/channels/sync-logs/:connectionId    # Get sync logs
POST   /api/v1/channels/inbound/reservation        # Process OTA reservation
POST   /api/v1/channels/inbound/pull               # Pull reservations
GET    /api/v1/channels/rate-parity                # Check rate parity
GET    /api/v1/channels/rate-parity/effective-rate  # Get effective rate
POST   /api/v1/channels/rate-parity/override       # Set rate override
DELETE /api/v1/channels/rate-parity/override       # Remove override
```
</details>

<details>
<summary><strong>Guests, Rooms, Rate Plans, Payments, Reports, Night Audit, Properties</strong></summary>

```
# Guests — 5 endpoints
POST   /api/v1/guests                              # Create guest
GET    /api/v1/guests                              # Search guests
GET    /api/v1/guests/:id                          # Get guest
PATCH  /api/v1/guests/:id                          # Update guest
DELETE /api/v1/guests/:id                          # Delete guest

# Rooms — 10 endpoints
POST   /api/v1/rooms/types                         # Create room type
GET    /api/v1/rooms/types                         # List room types
GET    /api/v1/rooms/types/:id                     # Get room type
GET    /api/v1/rooms/status-summary                # Status summary counts
GET    /api/v1/rooms/by-status                     # Rooms filtered by status
POST   /api/v1/rooms                               # Create room
GET    /api/v1/rooms                               # List rooms
GET    /api/v1/rooms/:id                           # Get room
PATCH  /api/v1/rooms/:id                           # Update room
PATCH  /api/v1/rooms/:id/status                    # Transition room status

# Rate Plans — 9 endpoints
POST   /api/v1/rate-plans                          # Create rate plan
GET    /api/v1/rate-plans                          # List rate plans
GET    /api/v1/rate-plans/:id                      # Get rate plan
GET    /api/v1/rate-plans/:id/effective-rate        # Calculate effective rate
PATCH  /api/v1/rate-plans/:id                      # Update rate plan
GET    /api/v1/rate-plans/:id/restrictions          # Get restrictions
POST   /api/v1/rate-plans/:id/restrictions          # Create restriction
PATCH  /api/v1/rate-plans/:id/restrictions/:rid     # Update restriction
DELETE /api/v1/rate-plans/:id/restrictions/:rid     # Delete restriction

# Payments — 7 endpoints
POST   /api/v1/payments                            # Record payment
POST   /api/v1/payments/authorize                  # Authorize card
GET    /api/v1/payments                            # List payments
GET    /api/v1/payments/:id                        # Get payment
POST   /api/v1/payments/:id/capture                # Capture authorized
POST   /api/v1/payments/:id/void                   # Void payment
POST   /api/v1/payments/:id/refund                 # Refund payment

# Reports — 4 endpoints
GET    /api/v1/reports/daily-revenue               # Daily revenue report
GET    /api/v1/reports/occupancy                   # Occupancy report
GET    /api/v1/reports/financial-summary            # Financial summary
GET    /api/v1/reports/occupancy-trend              # Occupancy trend

# Night Audit — 3 endpoints
POST   /api/v1/night-audit/run                     # Execute night audit
GET    /api/v1/night-audit/runs                    # List audit runs
GET    /api/v1/night-audit/runs/:id                # Get audit run

# Properties — 4 endpoints
POST   /api/v1/properties                          # Create property
GET    /api/v1/properties                          # List properties
GET    /api/v1/properties/:id                      # Get property
PATCH  /api/v1/properties/:id                      # Update property
```
</details>

---

## OTAIP Integration — Connect API

The Connect API (`/api/v1/connect/`) is purpose-built for [OTAIP](https://github.com/telivity-otaip/otaip) AI agents. It provides higher-level abstractions over the core PMS endpoints, designed for agent workflows.

### Agent Endpoints

```
# Property Search (Agent 4.1 — Hotel Search)
POST   /api/v1/connect/search                      # Search properties by criteria
GET    /api/v1/connect/properties                  # List all properties
GET    /api/v1/connect/properties/:id              # Full property detail

# Booking (Agent 4.5 — Booking)
POST   /api/v1/connect/book                        # Book a room
GET    /api/v1/connect/bookings/:confirmationNumber/verify  # Verify booking
PATCH  /api/v1/connect/bookings/:confirmationNumber # Modify booking
DELETE /api/v1/connect/bookings/:confirmationNumber # Cancel booking

# Event Subscriptions
POST   /api/v1/connect/subscriptions               # Subscribe to events
GET    /api/v1/connect/subscriptions               # List subscriptions
DELETE /api/v1/connect/subscriptions/:id           # Unsubscribe
POST   /api/v1/connect/subscriptions/:id/test      # Test subscription
GET    /api/v1/connect/events                      # Poll for events

# AI Insights
GET    /api/v1/connect/insights/revenue            # Revenue optimization hints
GET    /api/v1/connect/insights/guest-triggers     # Guest communication triggers
GET    /api/v1/connect/insights/housekeeping       # Housekeeping optimization
```

### How OTAIP Connects

OTAIP's `packages/connect` will have a HAIP adapter (like `AmadeusAdapter`, `DuffelAdapter`). Lodging agents (Domain 4) connect to HAIP via this adapter. Both projects share TypeScript, pnpm, Vitest, and strict TS config.

```
OTAIP Agent → ConnectAdapter (HAIP) → Connect API → HAIP PMS → PostgreSQL
```

The PMS is the product. OTAIP agents are the intelligence on top.

---

## WebSocket — Real-time Events

HAIP uses Socket.IO for real-time event broadcasting to the dashboard and other connected clients.

### Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// Join a property room to receive its events
socket.emit('joinProperty', { propertyId: 'uuid-here' });

// Listen for events
socket.on('reservation.created', (data) => { /* ... */ });
socket.on('room.status_changed', (data) => { /* ... */ });
socket.on('housekeeping.task_completed', (data) => { /* ... */ });
```

### Broadcast Events

All webhook events are simultaneously broadcast via WebSocket to clients subscribed to the relevant property. Events follow the `entity.action` naming convention:

- `reservation.created`, `reservation.checked_in`, `reservation.checked_out`
- `room.status_changed`
- `housekeeping.task_assigned`, `housekeeping.task_completed`
- `folio.charge_posted`
- `channel.sync_completed`

---

## Compliance (Built In, Not Bolted On)

| Requirement | How HAIP Handles It |
|-------------|-------------------|
| **PCI DSS** | Never stores raw card data. Stripe/Adyen tokenization only. Payments table stores token + last four + brand. |
| **GDPR** | Audit trail on every data modification, consent tracking fields, data retention and deletion APIs. |
| **Guest Registration** | Configurable per jurisdiction. ID verification fields. EU police reporting interface planned. |
| **Tax Calculation** | Tax jurisdiction per property. Inclusive/exclusive handling per rate plan. Tourist/occupancy tax support. |

---

## Contributing

HAIP is built in public and contributions are welcome.

### The One Rule

**DO NOT INVENT HOTEL DOMAIN LOGIC.** All hotel domain knowledge comes from the knowledge base (`kb/HAIP_KNOWLEDGE_BASE.md`). If something is ambiguous or missing, open an issue. Don't guess — hotels are weirder than you think.

### How to contribute

1. Check the [open issues](https://github.com/telivity-otaip/haip/issues)
2. Read `CLAUDE.md` for code standards and conventions
3. Read the relevant KB section before writing business logic
4. Fork, branch, PR — tests required for all business logic
5. One module at a time. Don't boil the ocean.

### Development commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all workspace packages
pnpm dev              # Start API in dev mode (hot reload)
pnpm test             # Run all tests
pnpm typecheck        # TypeScript strict check
pnpm lint             # ESLint
```

---

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

Copyright 2026 Telivity. You may use, modify, and distribute this software under the terms of the Apache 2.0 license. See the [LICENSE](LICENSE) file for the full text.

---

<p align="center">
  <sub>Built by <a href="https://github.com/telivity-otaip">Telivity</a> — open-source travel infrastructure for the AI era.</sub>
</p>
