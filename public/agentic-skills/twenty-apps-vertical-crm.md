---
name: twenty-apps-vertical-crm
description: Use when prototyping a vertical CRM or client Data OS on Twenty, especially with custom objects, relations, views, navigation, workflows, Docker/self-host setup, or app SDK feasibility decisions.
---

# Twenty Apps Vertical CRM

## Core principle

Use Twenty as a CRM platform through **Twenty Apps / SDK** first. Do not fork or rewrite the Twenty core unless the goal is to contribute to Twenty itself.

Best default for client Data OS experiments: create an independent Twenty App that defines the vertical data model, views, navigation, layouts, and later logic functions.

## Decision rule

- **CRM-like client need**: Twenty is a good sandbox/base.
- **Highly custom AI cockpit**: use Twenty for inspiration, not as the full base.
- **Fast POC**: Twenty App SDK + Docker/self-host instance.
- **Avoid**: Vercel-only deployment for full Twenty; the backend needs long-running services.

## Fast audit checklist

1. Inspect official app docs/examples before touching code:
   - `packages/twenty-codex-plugin/references/concepts/how-apps-work.md`
   - `packages/twenty-codex-plugin/references/develop-app/data-model.md`
   - `packages/twenty-apps/community/*`
2. Choose App SDK before metadata REST API unless you only need a one-off admin bootstrap.
3. Reuse native Twenty objects where possible:
   - `Person`, `Company`, `Task`, `Note`, `Timeline`, `Opportunity`.
4. Add only the vertical objects that are truly métier-specific.
5. Always create object + fields + views + navigation together; an object alone is not a usable CRM module.
6. Verify deployment path separately from module design.

## POC structure

```text
<vertical-crm-app>/
  package.json
  tsconfig.json
  src/application-config.ts
  src/modules/<vertical>/objects/*.object.ts
  src/modules/<vertical>/views/*.view.ts
  src/modules/<vertical>/navigation-menu-items/*.navigation-menu-item.ts
  docs/
  seed/
  scripts/validate-structure.mjs
```

## Deployment facts

Twenty full app needs:
- frontend
- NestJS backend
- PostgreSQL
- Redis
- BullMQ worker
- migrations/init

Recommended for POC: Docker Compose on local/VPS.

Not recommended for full app: Vercel-only. Vercel can host a separate frontend, but the backend/worker/DB/Redis still need another platform.

## Real estate vertical baseline

For an agency transaction CRM, start with:
- `Property`: real estate property
- `Mandate`: simple/exclusive mandate
- `BuyerRequest`: buyer criteria/search
- `Viewing`: scheduled visit + feedback
- `Offer`: amount/status/conditions

Reuse:
- `Person`: seller, buyer, owner, notary
- `Company`: agency, partner, promoter
- `Task/Note/Timeline`: operations
- `Opportunity`: commercial pipeline if native pipeline is enough

## Pitfalls

- Do not present a repo clone/audit as a functional POC. A POC must either run or contain an installable app artifact with exact blockers.
- Announce slow audits before launching them in Telegram: what will be checked, why, expected duration.
- Do not modify Twenty core for a vertical CRM POC; it creates migration/build/upgrade debt.
- Do not claim Convex/Vercel compatibility for Twenty core; that would require a backend rewrite.
- Treat AGPL as a commercial risk when reselling hosted, modified Twenty-based systems; validate legal scope before closed-source client delivery.

## Reference

Detailed session blueprint and commands: `references/real-estate-crm-poc.md`.
