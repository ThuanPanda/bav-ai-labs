# Conventions — Naming, File Structure & Comments

## Table of contents

1. [Module directory layout](#1-module-directory-layout)
2. [File naming](#2-file-naming)
3. [Class naming](#3-class-naming)
4. [Variable and property naming](#4-variable-and-property-naming)
5. [Barrel exports (`index.ts`)](#5-barrel-exports-indexts)
6. [Comments](#6-comments)
7. [Import order](#7-import-order)

---

## 1. Module directory layout

```
apps/<app>/src/modules/<module>/
├── <module>.module.ts
├── commands/
│   ├── index.ts
│   └── <verb>-<noun>/
│       ├── <verb>-<noun>.command.ts   ← Command message (extends Command<T>) + Props interface
│       ├── <verb>-<noun>.handler.ts   ← @CommandHandler class (the executor)
│       └── index.ts
├── queries/
│   ├── index.ts
│   └── <verb>-<noun>/
│       ├── <verb>-<noun>.query.ts     ← Query message (extends Query<T>)
│       ├── <verb>-<noun>.handler.ts   ← @QueryHandler class (the executor)
│       └── index.ts
├── controllers/
│   ├── index.ts
│   └── <module>.controller.ts         ← (or .gateway.ts / .message.controller.ts)
├── dtos/
│   ├── index.ts
│   └── <verb>-<noun>.dto.ts           ← class-validator input DTOs
├── responses/
│   ├── index.ts
│   └── <name>.response.ts             ← class-transformer response DTOs (@Exclude/@Expose)
├── services/                          ← only for logic SHARED across handlers
│   ├── index.ts
│   └── <domain>.service.ts
└── constants/
    ├── index.ts
    └── <module>-error.constants.ts    ← <MODULE>_ERRORS error-key map
```

> **Repositories, interfaces and providers are NOT in the feature module** — they live in
> `libs/layer-data` (`@app/layer-data`). See [REPOSITORIES.md](./REPOSITORIES.md).
> The controller usually lives in `controllers/`; a few small modules keep it at the module root.
> Be consistent within a module.

---

## 2. File naming

All file names use **kebab-case**.

### Commands

| File                       | Contains                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `<verb>-<noun>.command.ts` | `interface <Verb><Noun>CommandProps` + `class <Verb><Noun>Command extends Command<TResult>` |
| `<verb>-<noun>.handler.ts` | `@CommandHandler(<Verb><Noun>Command) class <Verb><Noun>Handler implements ICommandHandler` |

> **File naming:** each file matches its content — `.command.ts` holds the _message_
> (`extends Command<T>`); `.handler.ts` holds the _executor_ (`@CommandHandler`).

### Queries

| File                       | Contains                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `<verb>-<noun>.query.ts`   | `class <Verb><Noun>Query extends Query<TResult>`                                      |
| `<verb>-<noun>.handler.ts` | `@QueryHandler(<Verb><Noun>Query) class <Verb><Noun>Handler implements IQueryHandler` |

### Other files (feature module)

| Pattern                          | Contains                                   |
| -------------------------------- | ------------------------------------------ |
| `<verb>-<noun>.dto.ts`           | class-validator input DTO                  |
| `<name>.response.ts`             | class-transformer response DTO             |
| `<domain>.service.ts`            | Service (shared-across-handlers logic only)|
| `<module>-error.constants.ts`    | `<MODULE>_ERRORS` error-key constants       |
| `<module>.module.ts`             | NestJS module                              |
| `<module>.controller.ts`         | HTTP controller                            |
| `<module>.gateway.ts`            | WebSocket gateway                          |
| `<module>.message.controller.ts` | Message pattern controller                 |
| `<module>.grpc.controller.ts`    | gRPC controller                            |

### Data-layer files (`libs/layer-data`)

| Pattern                  | Contains                     |
| ------------------------ | ---------------------------- |
| `<entity>.interface.ts`  | `I<Entity>Repository`         |
| `<entity>.provider.ts`   | `Symbol` token + Provider     |
| `<entity>.repository.ts` | Repository implementation     |
| `<domain>-data.module.ts`| Per-domain `*DataModule`      |

---

## 3. Class naming

All class names use **PascalCase**.

| Construct            | Pattern                    | Example                     |
| -------------------- | -------------------------- | --------------------------- |
| Command message      | `<Verb><Noun>Command`      | `CreateArticleCommand`      |
| Command handler      | `<Verb><Noun>Handler`      | `CreateArticleHandler`      |
| Query message        | `<Verb><Noun>Query`        | `GetArticlesQuery`          |
| Query handler        | `<Verb><Noun>Handler`      | `GetArticlesHandler`        |
| Repository interface | `I<Entity>Repository`      | `IArticleRepository`        |
| Repository class     | `<Entity>Repository`       | `ArticleRepository`         |
| Service              | `<Domain>Service`          | `ArticleService`            |
| Controller           | `<Module>Controller`       | `ArticleController`         |
| Gateway              | `<Module>Gateway`          | `ArticleGateway`            |
| Module               | `<Module>Module`           | `ArticleModule`             |
| DTO                  | `<Verb><Noun>Dto`          | `CreateArticleDto`          |
| Props interface      | `<Verb><Noun>CommandProps` | `CreateArticleCommandProps` |

---

## 4. Variable and property naming

- **Variables and parameters**: `camelCase`
- **Constants (token strings)**: `SCREAMING_SNAKE_CASE`
- **Enum members**: `SCREAMING_SNAKE_CASE`
- **Private class properties**: `camelCase` with descriptive suffix:
  - Repository: `articleRepo`
  - Service: `articleSvc`
  - ORM client: `drizzle` / `prisma`
  - Bus: `queryBus` / `commandBus`

```typescript
// Repository token constants are Symbols (in libs/layer-data)
export const ARTICLE_REPOSITORY = Symbol('ARTICLE_REPOSITORY');

// Private properties
private readonly articleRepo: IArticleRepository
private readonly articleSvc: ArticleService
private readonly drizzle: NodePgDatabase<typeof schema>
private readonly queryBus: QueryBus
private readonly commandBus: CommandBus
```

---

## 5. Barrel exports (`index.ts`)

Every directory that contains module files must have an `index.ts` that re-exports everything
consumers need.

```typescript
// commands/create-article/index.ts
export * from './create-article.handler'; // Props interface + Command class
export * from './create-article.command'; // Handler class
```

```typescript
// commands/index.ts
export * from './create-article';
export * from './update-article';
export * from './delete-article';
```

```typescript
// providers/index.ts
export * from './article.provider';
```

The module file imports handler _classes_ (not command message classes) by name.

---

## 6. Comments

**Do not add comments that restate the code.** Names and type signatures already say what a class,
method, DTO, interface, type, or field _is_. Do **not** add `@description`/JSDoc blocks or inline
comments to classes, handlers, controllers, repositories, providers, modules, DTOs, interfaces,
types, or fields just to paraphrase their names.

Add a comment **only** to explain complex, non-obvious business logic — a rule, an edge case, or a
"why" that is not evident from the code itself. Keep it short and place it next to the logic it
explains.

```typescript
// ✗ WRONG — restates the code / names
/**
 * @description Handles the AddProductToEventCommand.
 * @type {CommandHandler}
 */
@CommandHandler(AddProductToEventCommand)
export class AddProductToEventHandler { ... }

/** Injection token for the event-draft-cart repository. */
export const EVENT_DRAFT_CARTS_REPOSITORY = Symbol('EVENT_DRAFT_CARTS_REPOSITORY');
```

```typescript
// ✓ RIGHT — explains a non-obvious business rule
// Line items span the full setup→teardown window by default. A virtual/rental product not booked
// for the entire rental period instead follows the event's own start/end dates.
const useEventPeriod =
  (item.productType === 'virtual' || item.productType === 'rental') && !item.isRentEntirePeriod;
```

---

## 7. Import order

Group imports in this order, separated by a blank line (Biome enforces ordering):

1. Node built-ins (`node:crypto`, `node:path`, etc.)
2. Workspace/framework packages first, then third-party (`@app/*`, `@prowerbdigital/*`, `@nestjs/*`,
   `drizzle-orm`, `class-validator`, …)
3. Relative imports within the module (`../../services`, `./create-article.handler`)

```typescript
import { randomUUID } from 'node:crypto';

import { ARTICLE_REPOSITORY, type IArticleRepository } from '@app/layer-data';
import type { ArticleInsert } from '@app/database/types';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { ARTICLE_ERRORS } from '../../constants';
import { CreateArticleCommand } from './create-article.handler';
```
