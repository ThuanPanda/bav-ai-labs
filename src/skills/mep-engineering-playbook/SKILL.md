---
name: mep-engineering-playbook
version: 1.2.0
description: >
  Mandatory engineering playbook for all NestJS CQRS microservice projects at MEP. Every
  agent MUST read and strictly follow the conventions in this playbook before writing any
  line of code — including commands, queries, repositories, entry points, providers,
  services, DTOs, module registration, and file naming. This playbook is the single source
  of truth for code structure, patterns, and style across all MEP projects. Entry points
  may be HTTP controllers, message pattern handlers, gRPC methods, or WebSocket gateways
  depending on the project transport. Controllers return plain objects shaped by a response DTO via
  `@Serialize` + `@ApiSuccessResponse`; a global `ResponseInterceptor` builds the envelope. Errors
  MUST be thrown with a NestJS HTTP exception carrying a module
  error-key constant (`<MODULE>_ERRORS.KEY`) — never a raw string, and never raw Error or
  HttpException.
---

# MEP Engineering Playbook

Mandatory conventions guide for all NestJS CQRS microservice projects.
**Read every relevant section before writing any code.**

> **This repo (`mep-etr`) is a pnpm-workspace monorepo.** Feature code lives under
> `apps/<app>/src/modules/<module>` for three apps — `internal`, `external`, `worker`. Shared code
> lives in libraries aliased in `tsconfig.json`: `@app/database` (Drizzle schema + types),
> `@app/layer-data` (**all** repositories), `@app/common` (config/validators), `@app/third-party`.
> The framework package **`@prowerbdigital/common`** supplies `BaseRepositoryV2`, `DRIZZLE_PROVIDER`,
> pagination DTOs, `@Serialize`, `@ApiSuccessResponse`, the response interceptors and auth
> decorators. Wherever a path below shows `src/modules/...`, read it as `apps/<app>/src/modules/...`.

## Reference files

| Topic                                    | File                                 |
| ---------------------------------------- | ------------------------------------ |
| CQRS — Commands & Queries                | [CQRS.md](./CQRS.md)                 |
| Repository pattern + `libs/layer-data`   | [REPOSITORIES.md](./REPOSITORIES.md) |
| Drizzle schema — tables, FKs, relations  | [SCHEMA.md](./SCHEMA.md)             |
| Entry points, responses & error handling | [API-DESIGN.md](./API-DESIGN.md)     |
| Scaffolding a new module (step-by-step)  | [SCAFFOLDING.md](./SCAFFOLDING.md)   |
| Naming, file structure, JSDoc            | [CONVENTIONS.md](./CONVENTIONS.md)   |
| Swagger setup & OpenAPI documentation    | [SWAGGER.md](./SWAGGER.md)           |

---

## Architecture overview

Every feature module follows the **CQRS + Repository** pattern regardless of transport:

```
Incoming request (HTTP / Message / gRPC / WebSocket)
    └─► Entry point        (dispatch only — no business logic)
            ├─► CommandBus ─► CommandHandler ─┬─► Repository / Repositories (owns its own logic)
            │                                  └─► Service ──► (only logic SHARED across handlers)
            └─► QueryBus   ─► QueryHandler   ─┬─► Repository / Repositories (owns its own logic)
                                               └─► Service ──► (only logic SHARED across handlers)
```

**Non-negotiable rules — violating any of these is a bug:**

1. Entry points dispatch to `CommandBus` / `QueryBus` only. Never inject Services or
   Repositories into entry points.
2. **A handler owns its own business logic.** It may inject Repositories (via `@Inject(TOKEN)`),
   the DB provider, and Services directly — including handlers with transactions, multiple
   repositories, or external calls. Logic specific to a single handler lives **in that handler**,
   not in a Service.
3. **Services hold only logic SHARED across multiple handlers.** Extract a method into a Service
   solely when two or more handlers need it (e.g. geocoding, address normalization, a common
   "find-or-throw"). A Service is a library of reusable building blocks, not a mandatory layer a
   handler must route through. Do not move handler-specific logic into a Service just because it
   is long or touches several repositories.
4. When **shared** logic spans multiple repositories, place the Service method in the Service whose
   **domain matches the action** — not the service that owns the "primary" repository.
   Example: `getPermissionsByUserId` → `PermissionService`, not `UserService`.
5. Repositories only communicate with the database. No business logic inside repositories.
6. Commands typically return `null`. They may return a simple scalar (e.g. `id`) when the
   caller needs it, but must never return full data objects.
7. Repository injection always uses **provider token strings**, never direct class injection.
8. **Do not add comments that restate the code.** Names and signatures already describe what a
   class, method, DTO, interface, type, or field _is_ — never add a `@description`/JSDoc block or an
   inline comment just to paraphrase them. Add a comment **only** to explain complex, non-obvious
   business logic (a rule, an edge case, a "why"). See [CONVENTIONS.md](./CONVENTIONS.md).
9. Controllers **return a plain object**; a global `ResponseInterceptor` wraps it in the envelope.
   Shape and document the output with a response DTO in `responses/` (`@Exclude` + `@Expose`) applied
   via `@Serialize(Dto)` + `@ApiSuccessResponse(Dto)` (both from `@prowerbdigital/common`). **Never**
   inject `@Res()` or call `res.json(...)` — the sole exception is binary/file streaming (e.g. an
   Excel export). This project does **not** use `i18n.t(...)` or `OK()`/`CREATED()` helpers in
   controllers. See [API-DESIGN.md](./API-DESIGN.md) §7.
10. Errors MUST be thrown with a NestJS HTTP exception (`NotFoundException`,
    `BadRequestException`, …) carrying a **module error-key constant**
    (`<MODULE>_ERRORS.KEY` = `'<MODULE>.<REASON>'`) — never a human-readable string, and never
    `new Error()` / `new HttpException()`. Keys live in
    `<module>/constants/<module>-error.constants.ts`. See [API-DESIGN.md](./API-DESIGN.md) §8.

---

## Module directory layout

```
apps/<app>/src/modules/<module>/
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
├── controllers/                       ← HTTP controllers (or gateways / message handlers)
│   ├── <module>.controller.ts
│   └── index.ts
├── dtos/                              ← class-validator input DTOs
├── responses/                         ← class-transformer response DTOs (@Exclude/@Expose)
├── services/                          ← logic SHARED across multiple handlers only
└── constants/                         ← error-key constants, enums
```

> **Repositories do NOT live in the feature module.** Interfaces, repositories, and providers
> belong to the centralized **`libs/layer-data`** library (`@app/layer-data`). The feature module
> imports a per-domain `*DataModule` and injects the repository token. See
> [REPOSITORIES.md §0](./REPOSITORIES.md#0-data-layer-libslayer-data).

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
| Deciding what goes in a handler vs a Service        | [CQRS.md](./CQRS.md) — "When to use a Service"        |
| Writing a repository or its interface              | [REPOSITORIES.md](./REPOSITORIES.md)                  |
| Writing an entry point (any transport)             | [API-DESIGN.md](./API-DESIGN.md)                      |
| Shaping a success response (response DTO + `@Serialize`) | [API-DESIGN.md](./API-DESIGN.md) — "Response DTOs & serialization" |
| Throwing an error                                  | [API-DESIGN.md](./API-DESIGN.md) — "Error handling"   |
| Creating a new module from scratch                 | [SCAFFOLDING.md](./SCAFFOLDING.md)                    |
| Naming a file, class, variable, or adding a comment | [CONVENTIONS.md](./CONVENTIONS.md)                   |
| Defining a Drizzle table or FK column               | [SCHEMA.md](./SCHEMA.md)                              |
