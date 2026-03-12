# Scaffolding a New Module

Step-by-step checklist for creating a new feature module from scratch.
Follow steps in order. Each step references the relevant playbook file for details.

## Table of contents

1. [Before you start](#1-before-you-start)
2. [Create the directory structure](#2-create-the-directory-structure)
3. [Define DB types](#3-define-db-types)
4. [Write the repository interface](#4-write-the-repository-interface)
5. [Write the provider file](#5-write-the-provider-file)
6. [Write the repository implementation](#6-write-the-repository-implementation)
7. [Write constants](#7-write-constants)
8. [Write input DTOs](#8-write-input-dtos)
9. [Write commands](#9-write-commands)
10. [Write queries](#10-write-queries)
11. [Write services (if needed)](#11-write-services-if-needed)
12. [Write the entry point](#12-write-the-entry-point)
13. [Register the module](#13-register-the-module)
14. [Register the module in the app](#14-register-the-module-in-the-app)
15. [Final checklist](#15-final-checklist)

---

## 1. Before you start

- Read [CQRS.md](./CQRS.md), [REPOSITORIES.md](./REPOSITORIES.md), [API-DESIGN.md](./API-DESIGN.md), and [CONVENTIONS.md](./CONVENTIONS.md) first.
- Decide which transport(s) this module uses (HTTP / message / gRPC / WebSocket).
- List every command and query the module needs before writing any file.
- Decide for each handler: simple (→ Repository) or complex (→ Service)?
  See [CQRS.md §4](./CQRS.md#4-when-to-use-a-service-vs-repository-directly).

---

## 2. Create the directory structure

```
src/modules/<module>/
├── commands/
│   └── <verb>-<noun>/
├── queries/
│   └── <verb>-<noun>/
├── entry/                   (or root of module for HTTP controller naming)
├── dtos/
├── interfaces/
├── providers/
├── repositories/
├── services/                (only if complex handlers are needed)
└── constants/
```

See [CONVENTIONS.md](./CONVENTIONS.md) for full directory layout and naming rules.

---

## 3. Define DB types

In `src/db/` (or the project's DB layer), define:

```typescript
// src/db/types/article.types.ts  (example)
export type ArticleSelect = typeof schema.articles.$inferSelect;
export type ArticleInsert = typeof schema.articles.$inferInsert;
export type ArticleModify = Partial<ArticleInsert> & { id: string };
```

For Prisma projects the generated types serve as `Select` / `Insert` / `Modify`.

---

## 4. Write the repository interface

File: `<module>/interfaces/<entity>.interface.ts`

```typescript
import { BaseRepository, OffsetPagination, OffsetResult } from '../../../common';
import { ArticleInsert, ArticleModify, ArticleSelect } from '../../../db';

export interface IArticleRepository extends BaseRepository<
  ArticleSelect,
  ArticleInsert,
  ArticleModify
> {
  // add module-specific methods here
  findWithOffset(props: OffsetPagination): Promise<OffsetResult<ArticleSelect>>;
}
```

Export it from `interfaces/index.ts`.

See [REPOSITORIES.md §2](./REPOSITORIES.md#2-repository-interface-per-module).

---

## 5. Write the provider file

File: `<module>/providers/<entity>.provider.ts`

```typescript
import { Provider } from '@nestjs/common';
import { ArticleRepository } from '../repositories/article.repository';

export const ARTICLE_REPOSITORY = 'ARTICLE_REPOSITORY';

export const ArticleRepositoryProvider: Provider = {
  provide: ARTICLE_REPOSITORY,
  useClass: ArticleRepository,
};
```

Export both the token constant and provider from `providers/index.ts`.

See [REPOSITORIES.md §3](./REPOSITORIES.md#3-provider-file).

---

## 6. Write the repository implementation

File: `<module>/repositories/<entity>.repository.ts`

Implement `IArticleRepository`. Use `@Inject(DRIZZLE_PROVIDER)` or `@Inject(PRISMA_PROVIDER)`.
Every public method needs a JSDoc comment.

See [REPOSITORIES.md §4](./REPOSITORIES.md#4-repository-implementation--drizzle) (Drizzle)
or [REPOSITORIES.md §5](./REPOSITORIES.md#5-repository-implementation--prisma) (Prisma).

Export from `repositories/index.ts`.

---

## 7. Write constants

File: `<module>/constants/<module>-i18n.constants.ts`

```typescript
export const ARTICLE_I18N_KEYS = {
  SUCCESS: {
    CREATED: 'article.success.created',
    DETAIL: 'article.success.detail',
    LIST: 'article.success.list',
    UPDATED: 'article.success.updated',
    DELETED: 'article.success.deleted',
  },
} as const;
```

Export from `constants/index.ts`.

---

## 8. Write input DTOs

File per DTO: `<module>/dtos/<verb>-<noun>.dto.ts`

Use `class-validator` decorators. Extend `OffsetPaginationDto` from `common/` for list DTOs.

Export all DTOs from `dtos/index.ts`.

See [API-DESIGN.md §9](./API-DESIGN.md#9-input-dtos).

---

## 9. Write commands

For each command, create a directory: `commands/<verb>-<noun>/`

Each directory contains three files:

**a. `<verb>-<noun>.handler.ts`** — the command message:

```typescript
// ICommand class + Props interface
```

**b. `<verb>-<noun>.command.ts`** — the handler executor:

```typescript
// @CommandHandler class
```

**c. `index.ts`** — barrel re-export of both.

Add the handler executor class to the parent `commands/index.ts`.

See [CQRS.md §2](./CQRS.md#2-commands) for full examples.

---

## 10. Write queries

For each query, create a directory: `queries/<verb>-<noun>/`

Each directory contains three files:

**a. `<verb>-<noun>.query.ts`** — the query message (`IQuery` class).

**b. `<verb>-<noun>.handler.ts`** — the `@QueryHandler` executor.

**c. `index.ts`** — barrel re-export.

Add the handler class to the parent `queries/index.ts`.

See [CQRS.md §3](./CQRS.md#3-queries) for full examples.

---

## 11. Write services (if needed)

Only create a Service if one or more handlers require it (multi-repo, transactions, external
calls). See [CQRS.md §4](./CQRS.md#4-when-to-use-a-service-vs-repository-directly).

File: `<module>/services/<domain>.service.ts`

```typescript
@Injectable()
export class ArticleService {
  constructor(@Inject(ARTICLE_REPOSITORY) private readonly articleRepo: ArticleRepository) {
    // ... other deps
  }

  // Complex multi-step method
  async publish(props: PublishArticleCommandProps): Promise<void> {
    // ...
  }
}
```

Export from `services/index.ts`.

---

## 12. Write the entry point

Create the appropriate file based on transport:

- HTTP: `entry/<module>.controller.ts` (or `<module>.controller.ts` at module root)
- Message: `entry/<module>.message.controller.ts`
- Event: `entry/<module>.event.controller.ts`
- WebSocket: `entry/<module>.gateway.ts`
- gRPC: `entry/<module>.grpc.controller.ts`

Rules:

- Inject only `CommandBus`, `QueryBus`, and transport infrastructure.
- Every method must have a JSDoc comment.
- Use response helpers — never write raw responses.
- Use `@Public()` for public routes; omit it for protected routes.
- Use `@CurrentUserId()` to extract the authenticated user ID.

See [API-DESIGN.md](./API-DESIGN.md) for transport-specific examples.

---

## 13. Register the module

File: `<module>/<module>.module.ts`

```typescript
import { Module } from '@nestjs/common';

import { CreateArticleHandler, UpdateArticleHandler, DeleteArticleHandler } from './commands';
import { GetArticleHandler, GetArticlesHandler } from './queries';
import { ArticleRepositoryProvider, ARTICLE_REPOSITORY } from './providers';
import { ArticleService } from './services';
import { ArticleController } from './entry/article.controller';

const QueryHandlers = [GetArticleHandler, GetArticlesHandler];
const CommandHandlers = [CreateArticleHandler, UpdateArticleHandler, DeleteArticleHandler];
const Services = [ArticleService];
const Providers = [ArticleRepositoryProvider];

@Module({
  controllers: [ArticleController],
  providers: [...Providers, ...QueryHandlers, ...CommandHandlers, ...Services],
  exports: [ARTICLE_REPOSITORY], // export only what other modules need
})
export class ArticleModule {}
```

Rules:

- Keep `QueryHandlers`, `CommandHandlers`, `Services`, `Providers` as named arrays.
- Spread them all into `providers:`.
- Export only tokens / services that other modules consume.

---

## 14. Register the module in the app

Add `ArticleModule` to `AppModule` (or the relevant root module) imports array.

---

## 15. Final checklist

Before committing:

- [ ] Every class has a JSDoc `@description` and `@type` comment.
- [ ] Every public method has a JSDoc comment with `@param`, `@returns`, and `@throws` where applicable.
- [ ] No repository is injected directly (always via token: `@Inject(ARTICLE_REPOSITORY)`).
- [ ] No `new Error()` or `new HttpException()` — only project-defined error classes.
- [ ] No raw transport responses — only `OK(...)` / `CREATED(...)` or equivalent helpers.
- [ ] All i18n messages use `await i18n.t(CONSTANT_KEY)` — no hardcoded strings.
- [ ] Entry point contains zero business logic.
- [ ] All barrel `index.ts` files export everything they should.
- [ ] Module file registers all handlers, services, providers, and controllers.
- [ ] File naming convention followed: `*.handler.ts` = command message / `*.command.ts` = command executor.
