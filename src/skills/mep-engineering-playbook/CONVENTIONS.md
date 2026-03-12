# Conventions — Naming, File Structure & JSDoc

## Table of contents

1. [Module directory layout](#1-module-directory-layout)
2. [File naming](#2-file-naming)
3. [Class naming](#3-class-naming)
4. [Variable and property naming](#4-variable-and-property-naming)
5. [Barrel exports (`index.ts`)](#5-barrel-exports-indexts)
6. [JSDoc format](#6-jsdoc-format)
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

## 6. JSDoc format

Every **class** and every **public method** must have a JSDoc block.

### Class JSDoc

```typescript
/**
 * @description Short description of what this class does.
 * @type {Repository|Service|Controller|CommandHandler|QueryHandler|Command|Query}
 */
```

### Method JSDoc

Full format (use sections that apply; omit sections that don't):

```typescript
/**
 * @description What this method does and when to use it.
 * @type {Repository|Service|Controller|CommandHandler|QueryHandler}
 * ---
 * @param {Type} paramName - What this parameter represents.
 * @param {Type} paramName2 - What this parameter represents.
 * ---
 * @returns {Promise<Type>} What the return value represents.
 * ---
 * @throws {ProjectDefinedErrorClass} When this error is thrown.
 */
```

Rules:

- Use `---` as a separator between the `@param`, `@returns`, and `@throws` sections.
- The `@type` tag describes the architectural layer: `Repository`, `Service`, `Controller`,
  `CommandHandler`, `QueryHandler`, `Command`, or `Query`.
- Always `await` `i18n.t(...)` calls — document the i18n key in the method if relevant.
- For `@throws`, only list project-defined error classes (never `Error` or `HttpException`).

### Examples

**Repository method:**

```typescript
/**
 * @description Finds an article by its primary key.
 * @type {Repository}
 * ---
 * @param {string} id - The article's UUID.
 * ---
 * @returns {Promise<ArticleSelect | null>} The article record, or `null` if not found.
 */
async findById(id: string): Promise<ArticleSelect | null> { ... }
```

**Service method:**

```typescript
/**
 * @description
 * Publishes an article and notifies subscribers.
 * Flow:
 *  1. Validates the article exists and belongs to the user.
 *  2. Updates status to 'published'.
 *  3. Emits 'article.published' event.
 * @type {Service}
 * ---
 * @param {PublishArticleCommandProps} props - Publish parameters.
 * ---
 * @returns {Promise<void>}
 * ---
 * @throws {Api404HttpError} If the article is not found.
 * @throws {Api403HttpError} If the user does not own the article.
 */
async publish(props: PublishArticleCommandProps): Promise<void> { ... }
```

**Controller method:**

```typescript
/**
 * @description
 * Endpoint to publish an article.
 * Delegates logic to {@link PublishArticleHandler}.
 * @type {Controller}
 * ---
 * @param {string} id - Article ID from the URL param.
 * @param {string} userId - Authenticated user ID.
 * @param {I18nContext} i18n - Translations context.
 * ---
 * @returns {Promise<void>} Sends 200 OK response.
 * ---
 * @see PublishArticleHandler.execute
 */
async publishArticle(...) { ... }
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
