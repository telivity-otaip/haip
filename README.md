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
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
  <img src="https://img.shields.io/badge/Status-Phase%201-orange" alt="Phase 1" />
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#why-haip">Why HAIP</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#roadmap">Roadmap</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Why HAIP

The hotel industry runs on closed-source, legacy PMS platforms that charge per-room fees, lock data behind proprietary APIs, and treat integrations as an afterthought. Hotels pay $5-15/room/month just for the privilege of managing their own operations.

HAIP changes that.

HAIP is a **complete, production-grade hotel Property Management System** — reservation lifecycle, folio management, rate plans, housekeeping, night audit, channel distribution — built from scratch with modern architecture and released under MIT.

But what makes HAIP different isn't just that it's open source. It's that **AI agents are built into the architecture from day one**. HAIP is the sister project to [OTAIP](https://github.com/telivity-otaip/otaip) (Open Travel AI Platform), and together they form **Telivity's open-source travel infrastructure**. OTAIP agents connect to HAIP via the same APIs any third party would use — the PMS works without AI, but the AI makes it extraordinary.

### What HAIP is NOT

HAIP is not a wrapper around another PMS. It's not a booking widget. It's not a SaaS dashboard with "AI" slapped on the marketing page. It's a real PMS with real hotel operations logic — the kind of system that runs night audits, manages folios, pushes rates to OTAs, and handles guest registration compliance across jurisdictions.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    OTAIP Agents                          │
│  Hotel Search · Rate Compare · Booking · Revenue · HK   │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API (OpenAPI 3.0)
┌──────────────────────▼──────────────────────────────────┐
│                    HAIP PMS                               │
│                                                          │
│  ┌─────────┐ ┌──────────┐ ┌───────┐ ┌──────────────┐   │
│  │ Reserv- │ │  Folio & │ │ Rate  │ │ Housekeeping │   │
│  │ ations  │ │ Billing  │ │ Plans │ │              │   │
│  └────┬────┘ └────┬─────┘ └───┬───┘ └──────┬───────┘   │
│       │           │           │             │            │
│  ┌────▼───────────▼───────────▼─────────────▼────────┐  │
│  │              PostgreSQL (multi-tenant)              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────┐ ┌──────────────┐ ┌───────────────────┐   │
│  │  Redis   │ │   BullMQ     │ │ Channel Adapters  │   │
│  │  Cache   │ │  Job Queue   │ │ SiteMinder · OTAs │   │
│  └──────────┘ └──────────────┘ └───────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Option B Architecture** — The PMS is a standalone system. It works without OTAIP. OTAIP agents sit on top via APIs, using the same endpoints any third-party integration would use. This is the [Apaleo](https://apaleo.com) model, done open source.

### Key Design Decisions

- **Multi-tenant from day one** — `property_id` on every table, designed for portfolio operators
- **ChannelAdapter pattern** — Same abstraction as OTAIP's ConnectAdapter. SiteMinder/DerbySoft adapters for instant 450+ OTA reach, direct OTA adapters over time
- **Compliance as infrastructure** — PCI tokenization (Stripe/Adyen), GDPR audit trails, guest registration per jurisdiction, tax calculation by locale. Not bolted on — built in.
- **Event-driven** — Webhook events on every state change (`reservation.created`, `folio.charge_posted`, `room.status_changed`). Build anything on top.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode) |
| Runtime | Node.js ≥20 |
| Framework | NestJS |
| Database | PostgreSQL 16 (multi-tenant) |
| ORM | Drizzle ORM |
| Cache & Queue | Redis + BullMQ |
| API | REST, OpenAPI 3.0 (auto-generated) |
| Auth | OAuth 2.0 / OpenID Connect |
| Package Manager | pnpm |
| Testing | Vitest |
| Build | tsup |
| Containers | Docker + docker-compose |
| CI | GitHub Actions |

---

## Quick Start

### Prerequisites

- Node.js ≥20
- pnpm ≥9
- Docker & Docker Compose

### Run locally

```bash
# Clone
git clone https://github.com/telivity-otaip/haip.git
cd haip

# Start Postgres + Redis
docker compose up -d postgres redis

# Install dependencies
pnpm install

# Copy env
cp .env.example .env

# Build packages
pnpm build

# Run the API
pnpm dev
```

The API starts at `http://localhost:3000` with Swagger docs at `http://localhost:3000/docs`.

### Run with Docker (full stack)

```bash
docker compose up
```

This starts PostgreSQL, Redis, and the HAIP API together.

### Run tests

```bash
pnpm test
```

---

## Project Structure

```
haip/
├── apps/
│   └── api/                    # NestJS API application
│       └── src/
│           └── modules/
│               ├── property/       # Property configuration
│               ├── room/           # Room types & inventory
│               ├── guest/          # Guest profiles & preferences
│               ├── reservation/    # Booking lifecycle & availability
│               ├── folio/          # Folios & charge posting
│               ├── rate-plan/      # Rates, restrictions, derivation
│               ├── payment/        # Payment processing (tokenized)
│               ├── housekeeping/   # Room status & task management
│               └── health/         # Health check endpoint
├── packages/
│   ├── database/               # Drizzle ORM schema & migrations
│   └── shared/                 # Shared types, constants, utilities
├── kb/                         # Domain knowledge base
├── briefs/                     # Claude Code build briefs
├── docker-compose.yml
└── CLAUDE.md                   # AI agent constitution
```

---

## Modules

| Module | Status | Description |
|--------|--------|-------------|
| **Property** | 🔲 Stub | Multi-property configuration, timezone, currency, GDS codes |
| **Room** | 🔲 Stub | Room types, inventory, status state machine, connecting rooms |
| **Guest** | 🏗️ Phase 1 | Profiles, preferences, stay history, GDPR consent, VIP, DNR |
| **Rate Plan** | 🏗️ Phase 1 | BAR/derived/negotiated rates, restrictions (MinLOS, CTA, CTD) |
| **Reservation** | 🏗️ Phase 1 | Full lifecycle state machine, availability engine, booking API |
| **Folio** | 🔲 Phase 2 | Guest/master/city ledger folios, charge posting, routing rules |
| **Payment** | 🔲 Phase 2 | Stripe/Adyen tokenization, pre-auth, settlement (PCI compliant) |
| **Housekeeping** | 🔲 Phase 4 | Task assignment, digital checklists, maintenance tracking |
| **Night Audit** | 🔲 Phase 5 | Automated via BullMQ — room posting, no-show processing, day close |
| **Channel Manager** | 🔲 Phase 6 | ARI push/pull, SiteMinder adapter, two-way inventory sync |
| **OTAIP Agents** | 🔲 Phase 7 | Hotel Search, Rate Compare, Booking, Revenue, Guest Comms |
| **Admin UI** | 🔲 Phase 8 | React dashboard, mobile-responsive front desk, real-time updates |

---

## Reservation State Machine

```
pending ──→ confirmed ──→ assigned ──→ checked_in ──→ stayover ──→ due_out ──→ checked_out
  │              │             │                                                    ↑
  │              │             │           checked_in ──→ checked_out ──────────────┘
  │              │             │
  ↓              ↓             ↓
cancelled    cancelled     cancelled
                ↓             ↓
             no_show       no_show
```

Every transition fires a webhook event. Every state change is audit-logged.

---

## API Design

All endpoints are prefixed with `/api/v1/` and documented via OpenAPI 3.0 (Swagger).

```
GET    /api/v1/health                          # Health check

POST   /api/v1/reservations/search-availability # Check room availability
POST   /api/v1/reservations                     # Create reservation
GET    /api/v1/reservations                     # List (filtered, paginated)
GET    /api/v1/reservations/:id                 # Get with guest/room/rate
PATCH  /api/v1/reservations/:id                 # Modify dates/room/rate
PATCH  /api/v1/reservations/:id/confirm         # Confirm
PATCH  /api/v1/reservations/:id/assign-room     # Assign room
PATCH  /api/v1/reservations/:id/check-in        # Check in
PATCH  /api/v1/reservations/:id/check-out       # Check out
PATCH  /api/v1/reservations/:id/cancel          # Cancel
PATCH  /api/v1/reservations/:id/no-show         # Mark no-show

POST   /api/v1/guests                           # Create guest profile
GET    /api/v1/guests                           # Search guests
GET    /api/v1/guests/:id                       # Get guest
PATCH  /api/v1/guests/:id                       # Update guest

POST   /api/v1/rate-plans                       # Create rate plan
GET    /api/v1/rate-plans                       # List rate plans
PATCH  /api/v1/rate-plans/:id                   # Update rate plan
POST   /api/v1/rate-plans/:id/restrictions      # Add restriction
```

*Full API reference available at `/docs` when running locally.*

---

## Compliance (Built In, Not Bolted On)

| Requirement | How HAIP Handles It |
|-------------|-------------------|
| **PCI DSS** | Never stores raw card data. Stripe/Adyen tokenization only. Payments table stores token + last four + brand. |
| **GDPR** | Encrypted database, audit trail on every data modification, consent tracking fields, data retention/deletion APIs. |
| **Guest Registration** | Configurable forms per jurisdiction. ID verification fields. EU police reporting interface planned. |
| **Tax Calculation** | Tax jurisdiction per property. Inclusive/exclusive handling per rate plan. Tourist/occupancy tax support. |

---

## Roadmap

| Phase | What | When | Status |
|-------|------|------|--------|
| **0** | Scaffolding & Data Model | Week 1-2 | ✅ Complete |
| **1** | Reservation Lifecycle | Week 2-4 | 🏗️ In Progress |
| **2** | Folio & Billing | Week 4-6 | Planned |
| **3** | Check-In/Check-Out | Week 6-7 | Planned |
| **4** | Housekeeping | Week 7-8 | Planned |
| **5** | Night Audit & Reporting | Week 8-9 | Planned |
| **6** | Channel Manager | Week 9-11 | Planned |
| **7** | OTAIP Agent Layer | Week 11-13 | Planned |
| **8** | Admin UI | Week 13-16 | Planned |

**MVP (Phases 0-5):** A standalone PMS that works for a single property via API. ~9 weeks.

**Competitive (Phases 0-7):** PMS + channel manager + AI agents. A real product. ~13 weeks.

---

## Relationship to OTAIP

HAIP and [OTAIP](https://github.com/telivity-otaip/otaip) are sister projects under [Telivity](https://github.com/telivity-otaip).

- **HAIP** handles lodging — the PMS, the operations, the hotel
- **OTAIP** handles air — flights, GDS, NDC, airline distribution
- Together they form **open-source travel infrastructure**

OTAIP's `packages/connect` will have a HAIP adapter (like AmadeusAdapter, DuffelAdapter). OTAIP lodging agents (Domain 4) connect to HAIP via this adapter. Both projects share TypeScript, pnpm, Vitest, tsup, and strict TS config.

The PMS is the product. OTAIP agents are the magic on top.

---

## Contributing

HAIP is in active early development. We're building in public and contributions are welcome.

### The One Rule

**DO NOT INVENT HOTEL DOMAIN LOGIC.** All hotel domain knowledge comes from the knowledge base (`kb/HAIP_KNOWLEDGE_BASE.md`). If something is ambiguous or missing, open an issue. Don't guess. Don't assume you know how hotels work — they're weirder than you think.

### How to contribute

1. Check the [open issues](https://github.com/telivity-otaip/haip/issues) for things to work on
2. Read `CLAUDE.md` for code standards and conventions
3. Read the relevant KB section before writing business logic
4. Fork, branch, PR. Tests required for all business logic.
5. One module at a time. Don't boil the ocean.

### Development

```bash
pnpm install          # Install deps
pnpm build            # Build all packages
pnpm dev              # Start API in dev mode
pnpm test             # Run tests
pnpm typecheck        # TypeScript check
pnpm lint             # Lint
```

---

## License

MIT — do whatever you want with it. Fork it, sell it, run your hotel on it. Just don't blame us if your night audit fails at 3am.

---

<p align="center">
  <sub>Built by <a href="https://github.com/telivity-otaip">Telivity</a> — open-source travel infrastructure for the AI era.</sub>
</p>
