# Scaffolding a New Module

Step-by-step checklist for creating a feature module from scratch. Follow in order; each step links
the relevant playbook file. Data-layer artifacts (repository, interface, provider) go in
**`libs/layer-data`**, everything else in **`apps/<app>/src/modules/<module>`**.

## Table of contents

1. [Before you start](#1-before-you-start)
2. [Data layer — `libs/layer-data`](#2-data-layer--libslayer-data)
3. [Create the feature-module structure](#3-create-the-feature-module-structure)
4. [Error-key constants](#4-error-key-constants)
5. [Input DTOs](#5-input-dtos)
6. [Response DTOs](#6-response-dtos)
7. [Commands](#7-commands)
8. [Queries](#8-queries)
9. [Services (only if shared)](#9-services-only-if-shared)
10. [Controller](#10-controller)
11. [Register the module](#11-register-the-module)
12. [Register the module in the app](#12-register-the-module-in-the-app)
13. [Final checklist](#13-final-checklist)

---

## 1. Before you start

- Read [CQRS.md](./CQRS.md), [REPOSITORIES.md](./REPOSITORIES.md), [API-DESIGN.md](./API-DESIGN.md),
  and [CONVENTIONS.md](./CONVENTIONS.md).
- Decide which **app** the module belongs to (`internal` / `external` / `worker`).
- List every command and query the module needs before writing a file.
- For each handler decide: does the logic belong **in the handler** (default) or in a **Service**
  (only if shared by 2+ handlers)? See [CQRS.md §4](./CQRS.md#4-when-to-use-a-service-vs-keep-logic-in-the-handler).
- Check whether the domain's repository already exists in `@app/layer-data` — reuse it if so.

---

## 2. Data layer — `libs/layer-data`

If the domain has no repository yet, add one under `libs/layer-data/src/<domain>/`:

1. **DB types** already exist in `@app/database/types` (derived from the Drizzle schema — see
   [SCHEMA.md](./SCHEMA.md)). Add the table/types there first if the entity is new.
2. `<entity>.interface.ts` — `I<Entity>Repository extends BaseRepositoryV2<Select, Insert, Modify, DrizzleTx>`.
3. `<entity>.repository.ts` — `@Injectable() implements I<Entity>Repository`, injects `DRIZZLE_PROVIDER`,
   implements used methods, stubs the rest.
4. `<entity>.provider.ts` — `Symbol` token + `{ provide, useExisting }` provider.
5. `<domain>-data.module.ts` — `providers: [Repo, Provider], exports: [TOKEN]`.
6. `index.ts` — barrel (interface type, module, provider, types). Re-export the domain from
   `libs/layer-data/src/index.ts`.

See [REPOSITORIES.md](./REPOSITORIES.md) for full templates.

---

## 3. Create the feature-module structure

```
apps/<app>/src/modules/<module>/
├── commands/
│   └── <verb>-<noun>/
├── queries/
│   └── <verb>-<noun>/
├── controllers/
├── dtos/
├── responses/
├── services/            (only if a handler's logic is shared)
└── constants/
```

See [CONVENTIONS.md §1](./CONVENTIONS.md#1-module-directory-layout).

---

## 4. Error-key constants

File: `<module>/constants/<module>-error.constants.ts`

```typescript
export const EVENT_TASKS_ERRORS = {
  EVENT_NOT_FOUND: 'EVENT_TASKS.EVENT_NOT_FOUND',
  TASK_CREATE_FAILED: 'EVENT_TASKS.TASK_CREATE_FAILED',
} as const;
```

Export from `constants/index.ts`. See [API-DESIGN.md §6](./API-DESIGN.md#6-error-handling).

---

## 5. Input DTOs

File per DTO: `<module>/dtos/<verb>-<noun>.dto.ts`. Use `class-validator` + `@ApiProperty`.
Extend `OffsetPaginationDto` from `@prowerbdigital/common` for list DTOs. Export from `dtos/index.ts`.
See [API-DESIGN.md §8](./API-DESIGN.md#8-input-dtos).

---

## 6. Response DTOs

File: `<module>/responses/<name>.response.ts`. `@Exclude()` class with `@Expose()` fields and
`@ApiProperty` docs; nested types via `@Type(() => Child)`. Export from `responses/index.ts`.
See [API-DESIGN.md §3](./API-DESIGN.md#3-response-dtos--serialization).

---

## 7. Commands

For each command, `commands/<verb>-<noun>/` with three files:

- **`<verb>-<noun>.handler.ts`** — `Props` interface + `<Verb><Noun>Command implements ICommand`.
- **`<verb>-<noun>.command.ts`** — `@CommandHandler` executor; inject repo tokens from `@app/layer-data`.
- **`index.ts`** — barrel re-export of both.

Add the executor class to `commands/index.ts`. See [CQRS.md §2](./CQRS.md#2-commands).

---

## 8. Queries

For each query, `queries/<verb>-<noun>/` with three files:

- **`<verb>-<noun>.query.ts`** — `<Verb><Noun>Query implements IQuery`.
- **`<verb>-<noun>.handler.ts`** — `@QueryHandler` executor.
- **`index.ts`** — barrel re-export.

Add the handler class to `queries/index.ts`. See [CQRS.md §3](./CQRS.md#3-queries).

---

## 9. Services (only if shared)

Create a Service **only** when 2+ handlers reuse the logic. File:
`<module>/services/<domain>.service.ts`, `@Injectable()`, injects repo tokens. Export from
`services/index.ts`. See [CQRS.md §4](./CQRS.md#4-when-to-use-a-service-vs-keep-logic-in-the-handler).

---

## 10. Controller

File: `<module>/controllers/<module>.controller.ts`. Inject only `CommandBus` / `QueryBus`.
Each method dispatches, then **returns a plain object** shaped by a response DTO via
`@Serialize(Dto)` + `@ApiSuccessResponse(Dto)`. No `@Res()`, no `i18n.t(...)`, no `OK()`/`CREATED()`.
Use `@Public()` for public routes; `@CurrentUserId()` / `@CurrentUserRoleKey()` for auth context.
Export from `controllers/index.ts`. See [API-DESIGN.md §2](./API-DESIGN.md#2-http-controller).

---

## 11. Register the module

File: `<module>/<module>.module.ts`

```typescript
import { EventTasksDataModule, EventsDataModule } from '@app/layer-data';
import { Module } from '@nestjs/common';

import { CreateTaskHandler, DeleteTaskHandler } from './commands';
import { EventTasksController } from './controllers';
import { GetTasksHandler } from './queries';
import { EventTaskService } from './services';

const CommandHandlers = [CreateTaskHandler, DeleteTaskHandler];
const QueryHandlers = [GetTasksHandler];
const Services = [EventTaskService];

@Module({
  imports: [EventTasksDataModule, EventsDataModule],
  controllers: [EventTasksController],
  providers: [...CommandHandlers, ...QueryHandlers, ...Services],
})
export class EventTasksModule {}
```

Rules:

- Import the per-domain `*DataModule`(s) from `@app/layer-data` — never declare repos here.
- Keep `CommandHandlers` / `QueryHandlers` / `Services` as named arrays, spread into `providers`.
- Register controllers in `controllers`.

---

## 12. Register the module in the app

Add `<Module>` to the app's root module imports (`apps/<app>/src/<app>.module.ts`, e.g.
`InternalModule`).

---

## 13. Final checklist

Before committing:

- [ ] Repository/interface/provider live in `libs/layer-data`, **not** the feature module.
- [ ] Repos injected via token (`@Inject(EVENT_TASKS_REPOSITORY)`), typed with the interface.
- [ ] No `new Error()` / `new HttpException()`; exceptions carry a `<MODULE>_ERRORS.KEY` constant,
      never a raw string.
- [ ] Controller returns a plain object with `@Serialize(Dto)` + `@ApiSuccessResponse(Dto)`; no
      `@Res()` (except file streaming), no `i18n.t(...)`, no `OK()`/`CREATED()`.
- [ ] Response DTO uses `@Exclude`/`@Expose`; list DTO exposes `items` + `pagination`.
- [ ] DTOs value-imported in the controller (never `import type`).
- [ ] Handler owns its own logic; a Service exists only for logic shared by 2+ handlers.
- [ ] No comments that restate names/signatures — only "why" comments for non-obvious logic
      ([CONVENTIONS.md §6](./CONVENTIONS.md#6-comments)).
- [ ] Entry point contains zero business logic.
- [ ] All barrel `index.ts` files export what consumers need.
- [ ] File naming: `*.handler.ts` = command message / `*.command.ts` = command executor.
