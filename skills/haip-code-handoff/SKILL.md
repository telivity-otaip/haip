---
name: haip-code-handoff
description: Use this skill whenever handing off a build task to Claude Code for the HAIP project. Trigger on "hand off to Claude Code", "build this", "code this module", "Claude Code brief", or whenever an approved spec or phase needs to go to the builder. HAIP builds follow HAIP rules — PROJECT_INSTRUCTIONS.md as constitution, no invented domain logic, TypeScript/Node/pnpm/NestJS stack.
---

# HAIP Code Handoff Protocol

## Before Handing Off

1. Read `instructions/PROJECT_INSTRUCTIONS.md` — confirm tech stack and rules
2. Read `HAIP_BUILD_PLAN.md` — confirm which phase we're building
3. Read relevant KB sections for the module being built
4. Check if agent specs exist in `specs/` for the work being done

## Brief Template

Every Claude Code handoff MUST include:

```markdown
# HAIP BUILD BRIEF — [Module Name]

**Project:** HAIP (Hotel AI Platform)
**Repo:** [repo URL once created]
**Component:** [Phase X — Module Name]
**Priority:** [P0/P1/P2]

## Constitution
Read PROJECT_INSTRUCTIONS.md in the repo root. Core rule: DO NOT INVENT HOTEL DOMAIN LOGIC.

## What to Build
[Specific deliverables — endpoints, modules, schemas, tests]

## Tech Stack (match exactly)
- TypeScript strict, Node >=20, NestJS, PostgreSQL, Drizzle ORM
- Redis + BullMQ, OpenAPI 3.0, OAuth 2.0
- pnpm, Vitest, tsup, Docker

## Domain Knowledge
[Relevant KB sections — copy the specific domain facts needed]

## Existing Patterns to Follow
[Reference existing code patterns in the repo]

## Acceptance Criteria
[What "done" looks like — endpoints working, tests passing, types correct]

## What NOT to Do
- Do not invent hotel domain logic
- Do not add dependencies without justification
- Do not skip tests
- Do not commit research files
```

## After Handoff

1. Review the PR against the brief
2. Run quality gate skill before approving
3. Update HAIP_BUILD_PLAN.md with completion status
4. Log any new domain questions discovered during build
