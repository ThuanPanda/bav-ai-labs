---
name: mep-engineering-playbook
version: 1.0.0
description: >
  Mandatory engineering playbook for all NestJS CQRS microservice projects at MEP. Every
  agent MUST read and strictly follow the conventions in this playbook before writing any
  line of code — including commands, queries, repositories, entry points, providers,
  services, DTOs, module registration, and file naming. This playbook is the single source
  of truth for code structure, patterns, and style across all MEP projects. Entry points
  may be HTTP controllers, message pattern handlers, gRPC methods, or WebSocket gateways
  depending on the project transport. Success responses MUST use the project-defined
  response helpers. Errors MUST be thrown using the project-defined error classes — never
  throw raw Error or HttpException.
---

# MEP Engineering Playbook

Mandatory conventions guide for all NestJS CQRS microservice projects.
**Read every relevant section before writing any code.**

## Reference files

| Topic                                    | File                                 |
| ---------------------------------------- | ------------------------------------ |
| CQRS — Commands & Queries                | [CQRS.md](./CQRS.md)                 |
| Repository pattern (Drizzle / Prisma)    | [REPOSITORIES.md](./REPOSITORIES.md) |
| Entry points, responses & error handling | [API-DESIGN.md](./API-DESIGN.md)     |
| Scaffolding a new module (step-by-step)  | [SCAFFOLDING.md](./SCAFFOLDING.md)   |
| Naming, file structure, JSDoc            | [CONVENTIONS.md](./CONVENTIONS.md)   |

---

## Architecture overview

Every feature module follows the **CQRS + Repository** pattern regardless of transport:

```
Incoming request (HTTP / Message / gRPC / WebSocket)
    └─► Entry point        (dispatch only — no business logic)
            ├─► CommandBus ─► CommandHandler ─┬─► Repository  (simple: single repo, no complex logic)
            │                                  └─► Service ──► Repository / Repositories
            └─► QueryBus   ─► QueryHandler   ─┬─► Repository  (simple: single repo, no complex logic)
                                               └─► Service ──► Repository / Repositories
```

**Non-negotiable rules — violating any of these is a bug:**

1. Entry points dispatch to `CommandBus` / `QueryBus` only. Never inject Services or
   Repositories into entry points.
2. **Simple handlers** (single repository, no external calls, no transactions) may inject
   and call a Repository directly via `@Inject(TOKEN)`.
3. **Complex handlers** (multiple repositories, transactions, external calls, cross-domain
   logic) must delegate to a **Service**.
4. When logic spans multiple repositories, place the Service method in the Service whose
   **domain matches the action** — not the service that owns the "primary" repository.
   Example: `getPermissionsByUserId` → `PermissionService`, not `UserService`.
5. Repositories only communicate with the database. No business logic inside repositories.
6. Commands typically return `null`. They may return a simple scalar (e.g. `id`) when the
   caller needs it, but must never return full data objects.
7. Repository injection always uses **provider token strings**, never direct class injection.
8. Every class and public method must have a **JSDoc comment** — see [CONVENTIONS.md](./CONVENTIONS.md).
9. Success responses MUST use the project-defined response helpers — never write raw
   transport responses directly.
10. Errors MUST be thrown using the project-defined error classes — never throw `new Error()`,
    `new HttpException()`, or any other raw exception class directly.

---

## Module directory layout

```
src/modules/<module>/
├── <module>.module.ts
├── commands/
│   ├── <verb>-<noun>/
│   │   ├── <verb>-<noun>.command.ts   ← @CommandHandler class (the executor)
│   │   ├── <verb>-<noun>.handler.ts   ← ICommand class + Props interface (the message)
│   │   └── index.ts
│   └── index.ts
├── queries/
│   ├── <verb>-<noun>/
│   │   ├── <verb>-<noun>.query.ts     ← IQuery class
│   │   ├── <verb>-<noun>.handler.ts   ← @QueryHandler class
│   │   └── index.ts
│   └── index.ts
├── entry/                             ← HTTP controllers / message handlers / gRPC / WS gateways
│   ├── <module>.controller.ts         ← naming matches transport (controller / gateway / etc.)
│   └── index.ts
├── dtos/                              ← class-validator input DTOs
├── interfaces/                        ← Repository interfaces (extends BaseRepository)
├── providers/                         ← Token constants + Provider objects
├── repositories/                      ← Repository implementations
├── services/                          ← Complex business logic only
└── constants/                         ← i18n keys, enums
```

> **Naming quirk** (established convention — do not change):
> `*.command.ts` holds the `@CommandHandler` class; `*.handler.ts` holds the `ICommand`
> class and its Props interface. This is inverted from what the names suggest but is the
> project standard — follow it exactly.

---

## Quick decision guide

| Situation                                          | Go to                                                 |
| -------------------------------------------------- | ----------------------------------------------------- |
| Writing any command (create / update / delete)     | [CQRS.md](./CQRS.md)                                  |
| Writing any query (read / list / get)              | [CQRS.md](./CQRS.md)                                  |
| Deciding Service vs Repository in a handler        | [CQRS.md](./CQRS.md) — "When to use a Service"        |
| Writing a repository or its interface              | [REPOSITORIES.md](./REPOSITORIES.md)                  |
| Writing an entry point (any transport)             | [API-DESIGN.md](./API-DESIGN.md)                      |
| Sending a success response                         | [API-DESIGN.md](./API-DESIGN.md) — "Response helpers" |
| Throwing an error                                  | [API-DESIGN.md](./API-DESIGN.md) — "Error handling"   |
| Creating a new module from scratch                 | [SCAFFOLDING.md](./SCAFFOLDING.md)                    |
| Naming a file, class, variable, or writing a JSDoc | [CONVENTIONS.md](./CONVENTIONS.md)                    |
