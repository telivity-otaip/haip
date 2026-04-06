---
name: haip-spec-writer
description: Use this skill whenever writing or revising a module specification for HAIP. Trigger on "write spec for", "spec out module", "define module", or whenever a phase from HAIP_BUILD_PLAN.md needs detailed specification before going to Claude Code. Every HAIP module must go through this template before build.
---

# HAIP Module Spec Writer

## When to Use
- Before any Phase goes to Claude Code
- When Dušan approves a new module or feature
- When domain research reveals a module needs redesign

## Spec Template

```yaml
module:
  name: [Module Name]
  phase: [Phase number from build plan]
  version: 0.1.0
  status: DRAFT | REVIEW | APPROVED

purpose: |
  [What this module does and why it exists]

domain_knowledge_source: |
  [Which KB sections this module draws from]

inputs:
  - name: [input name]
    type: [TypeScript type]
    required: true/false
    description: [what this is]

outputs:
  - name: [output name]
    type: [TypeScript type]
    description: [what this returns]

api_endpoints:
  - method: GET/POST/PUT/DELETE
    path: /api/v1/[resource]
    description: [what it does]
    auth: required/optional
    request_body: [schema reference]
    response: [schema reference]

database_tables:
  - name: [table name]
    columns:
      - name: [column]
        type: [pg type]
        nullable: true/false
        description: [what this stores]

events_emitted:
  - name: [event.name]
    payload: [TypeScript type]
    description: [when this fires]

dependencies:
  - [other HAIP modules this depends on]

compliance_requirements:
  - [PCI/GDPR/tax/registration requirements for this module]

acceptance_criteria:
  - [specific, testable criteria]

open_questions:
  - [anything the KB doesn't answer]
```

## Rules
1. Every field in the template must be filled or explicitly marked N/A
2. Domain knowledge MUST reference specific KB sections — no invented logic
3. Open questions must be researched before spec is marked APPROVED
4. Dušan reviews and approves before handoff to Claude Code
