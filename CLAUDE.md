# HAIP — Claude Code Constitution

## The One Rule

**DO NOT INVENT HOTEL DOMAIN LOGIC.**

All hotel domain knowledge comes from `kb/HAIP_KNOWLEDGE_BASE.md`. If something is ambiguous or missing, STOP and surface the question. Do not guess. Do not hallucinate hotel operations.

## What Is HAIP

HAIP (Hotel AI Platform) is an open-source, TypeScript/Node.js, API-first hotel PMS. Sister project to OTAIP. HAIP handles lodging. OTAIP handles air.

Architecture: Option B — PMS is standalone, OTAIP agents connect via API (not embedded).

## Tech Stack (match exactly)

- TypeScript strict mode, Node.js >=20
- NestJS framework
- PostgreSQL (multi-tenant, property_id on every table)
- Drizzle ORM (TypeScript-native, no magic)
- Redis + BullMQ (cache, queue, pub/sub)
- REST API, OpenAPI 3.0 auto-generated from NestJS decorators
- OAuth 2.0 / OpenID Connect
- pnpm workspaces
- Vitest for testing
- tsup for building packages
- Docker + docker-compose

## Code Standards

- All API endpoints go through NestJS controllers with Swagger decorators
- Every table has `property_id` for multi-tenancy
- Never store raw card data (PCI DSS — use Stripe/Adyen tokenization)
- Audit log all data modifications (GDPR compliance)
- Use Drizzle ORM for all database queries — no raw SQL except migrations
- Tests required for all business logic
- Use the webhook event pattern: entity.action (e.g., reservation.created)

## Project Structure

```
haip-project/
├── apps/api/              # NestJS API application
├── packages/database/     # Drizzle ORM schema and migrations
├── packages/shared/       # Shared types and utilities
├── kb/                    # Knowledge base (domain truth)
├── instructions/          # Project rules
├── specs/                 # Agent specs (YAML)
├── briefs/                # Claude Code build briefs
└── docker-compose.yml     # Local dev environment
```

## Module Pattern

Each domain module in `apps/api/src/modules/` follows:
```
module-name/
├── module-name.module.ts     # NestJS module definition
├── module-name.controller.ts # REST endpoints with Swagger
├── module-name.service.ts    # Business logic
└── dto/                      # Request/response DTOs
```

## Don'ts

- Don't add dependencies without justification
- Don't skip tests
- Don't commit research files (kb/research/raw/)
- Don't commit .env files
- Don't invent hotel domain concepts not in the KB
- Don't use raw SQL outside of migration files
- Don't store sensitive data unencrypted
