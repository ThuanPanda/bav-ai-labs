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
src/modules/<module>/
├── <module>.module.ts
├── commands/
│   ├── index.ts
│   └── <verb>-<noun>/
│       ├── <verb>-<noun>.command.ts   ← @CommandHandler class (the executor)
│       ├── <verb>-<noun>.handler.ts   ← ICommand class + Props interface (the message)
│       └── index.ts
├── queries/
│   ├── index.ts
│   └── <verb>-<noun>/
│       ├── <verb>-<noun>.query.ts     ← IQuery class
│       ├── <verb>-<noun>.handler.ts   ← @QueryHandler class
│       └── index.ts
├── entry/                             ← controllers / gateways / message handlers
│   ├── <module>.controller.ts         (or .gateway.ts / .message.controller.ts)
│   └── index.ts
├── dtos/
│   ├── index.ts
│   └── <verb>-<noun>.dto.ts
├── interfaces/
│   ├── index.ts
│   └── <entity>.interface.ts
├── providers/
│   ├── index.ts
│   └── <entity>.provider.ts
├── repositories/
│   ├── index.ts
│   └── <entity>.repository.ts
├── services/
│   ├── index.ts
│   └── <domain>.service.ts
└── constants/
    ├── index.ts
    └── <module>-i18n.constants.ts
```

> Some modules place the controller directly at the module root (e.g. `<module>.controller.ts`)
> instead of inside an `entry/` subfolder. Both are acceptable; be consistent within a module.

---

## 2. File naming

All file names use **kebab-case**.

### Commands

| File                       | Contains                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `<verb>-<noun>.handler.ts` | `interface <Verb><Noun>CommandProps` + `class <Verb><Noun>Command implements ICommand`      |
| `<verb>-<noun>.command.ts` | `@CommandHandler(<Verb><Noun>Command) class <Verb><Noun>Handler implements ICommandHandler` |

> **Naming quirk (do not change):** `.handler.ts` holds the _message_; `.command.ts` holds the _executor_.

### Queries

| File                       | Contains                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `<verb>-<noun>.query.ts`   | `class <Verb><Noun>Query implements IQuery`                                           |
| `<verb>-<noun>.handler.ts` | `@QueryHandler(<Verb><Noun>Query) class <Verb><Noun>Handler implements IQueryHandler` |

### Other files

| Pattern                          | Contains                   |
| -------------------------------- | -------------------------- |
| `<entity>.interface.ts`          | Repository interface       |
| `<entity>.provider.ts`           | Token constant + Provider  |
| `<entity>.repository.ts`         | Repository implementation  |
| `<domain>.service.ts`            | Service class              |
| `<verb>-<noun>.dto.ts`           | Input DTO                  |
| `<module>-i18n.constants.ts`     | i18n key constants         |
| `<module>.module.ts`             | NestJS module              |
| `<module>.controller.ts`         | HTTP controller            |
| `<module>.gateway.ts`            | WebSocket gateway          |
| `<module>.message.controller.ts` | Message pattern controller |
| `<module>.grpc.controller.ts`    | gRPC controller            |

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
// Token constants
export const ARTICLE_REPOSITORY = 'ARTICLE_REPOSITORY';

// Private properties
private readonly articleRepo: ArticleRepository
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

Group imports in this order, separated by a blank line:

1. Node built-ins (`node:crypto`, `node:path`, etc.)
2. Third-party packages (`@nestjs/...`, `drizzle-orm`, `class-validator`, etc.)
3. Absolute project imports (`../../../common`, `../../../core`, `../../../db`)
4. Relative imports within the module (`../../services`, `./create-article.handler`)

```typescript
import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { DRIZZLE_PROVIDER } from '../../../core';
import { ArticleInsert } from '../../../db';

import { ARTICLE_REPOSITORY } from '../../providers';
import { ArticleRepository } from '../../repositories';
import { CreateArticleCommand } from './create-article.handler';
```
