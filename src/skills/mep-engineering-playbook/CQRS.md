# CQRS — Commands & Queries

## Table of contents

1. [File naming](#1-file-naming)
2. [Commands](#2-commands)
   - 2.1 [Command message file (`*.command.ts`)](#21-command-message-file-commandts)
   - 2.2 [Command executor file (`*.handler.ts`)](#22-command-executor-file-handlerts)
   - 2.3 [Command that returns a scalar](#23-command-that-returns-a-scalar)
   - 2.4 [Command with a single primitive prop](#24-command-with-a-single-primitive-prop)
3. [Queries](#3-queries)
   - 3.1 [Query message file (`*.query.ts`)](#31-query-message-file-queryts)
   - 3.2 [Query handler file (`*.handler.ts`)](#32-query-handler-file-handlerts)
   - 3.3 [Pagination query](#33-pagination-query)
4. [When to use a Service vs Repository directly](#4-when-to-use-a-service-vs-repository-directly)
5. [Handler barrel exports](#5-handler-barrel-exports)
6. [Keep `execute()` thin](#6-keep-execute-thin)

---

## 1. File naming

Each file's name matches what it holds — `*.command.ts` holds the Command, `*.handler.ts` holds the
handler.

| File                     | What it contains                                                   |
| ------------------------ | ------------------------------------------------------------------ |
| `*.command.ts`           | the `Command` message class (`extends Command<TResult>`) + `Props` |
| `*.handler.ts`           | the `@CommandHandler` class — the executor                         |
| `*.query.ts`             | the `Query` message class (`extends Query<TResult>`)               |
| `*.handler.ts` (queries) | the `@QueryHandler` class — the executor                           |

### Message base classes — `Command<TResult>` / `Query<TResult>`

Message classes **extend** `Command<TResult>` / `Query<TResult>` (from `@nestjs/cqrs`, ≥ v10.2) —
**not** the old `implements ICommand` / `implements IQuery` markers. The generic `TResult` is the
type the handler's `execute()` resolves to, so the bus infers it end-to-end:

```typescript
const id = await this.commandBus.execute(new CreateArticleCommand(props)); // id: string | null ✅
```

With the old `implements ICommand` marker the result was `any` unless you passed generics manually.
Because these are base **classes**, any declared constructor must call `super()`.

---

## 2. Commands

### 2.1 Command message file (`*.command.ts`)

`*.command.ts` exports the Props interface and the `Command` class. The `Command<TResult>` generic
declares what the handler returns (commands usually resolve to `null` or a scalar `id` — never a
full object).

```typescript
// commands/create-article/create-article.command.ts
import { Command } from '@nestjs/cqrs';

export interface CreateArticleCommandProps {
  title: string;
  body: string;
  authorId: string;
}

export class CreateArticleCommand extends Command<string | null> {
  constructor(public readonly props: CreateArticleCommandProps) {
    super();
  }
}
```

> No JSDoc that restates the name. Add a comment only for non-obvious business logic
> (see [CONVENTIONS.md §6](./CONVENTIONS.md#6-comments)).

### 2.2 Command executor file (`*.handler.ts`)

`*.handler.ts` is decorated with `@CommandHandler` and contains the execution logic. Its
`execute()` return type must match the command's `Command<TResult>` generic.

**Simple handler** — delegates to a Repository directly (single repo, no transactions):

```typescript
// commands/create-article/create-article.handler.ts
import { ARTICLE_REPOSITORY, type IArticleRepository } from '@app/layer-data';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { CreateArticleCommand } from './create-article.command';

@CommandHandler(CreateArticleCommand)
export class CreateArticleHandler implements ICommandHandler<CreateArticleCommand> {
  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepo: IArticleRepository,
  ) {}

  async execute(command: CreateArticleCommand): Promise<string | null> {
    const article = await this.articleRepo.create(command.props);
    return article?.id ?? null;
  }
}
```

> The repository **token** (`ARTICLE_REPOSITORY`) and its **interface** (`IArticleRepository`) both
> come from `@app/layer-data` — never a local `../../providers` / `../../repositories` path (those
> folders do not exist in a feature module; see [REPOSITORIES.md](./REPOSITORIES.md)).

**Handler reusing a shared Service helper** — delegate to a Service *only* when the logic is
shared across multiple handlers (otherwise keep the logic in the handler itself):

```typescript
// commands/publish-article/publish-article.handler.ts
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { ArticleService } from '../../services';
import { PublishArticleCommand } from './publish-article.command';

@CommandHandler(PublishArticleCommand)
export class PublishArticleHandler implements ICommandHandler<PublishArticleCommand> {
  constructor(private readonly articleSvc: ArticleService) {}

  async execute(command: PublishArticleCommand): Promise<null> {
    await this.articleSvc.publish(command.props);
    return null;
  }
}
```

### 2.3 Command that returns a scalar

Commands may resolve to a simple scalar (e.g. the created record's `id`). Declare it in the
`Command<TResult>` generic and return it from `execute()`. They must **never** return full objects.

```typescript
// commands/create-article/create-article.command.ts
export class CreateArticleCommand extends Command<string> {
  constructor(public readonly props: CreateArticleCommandProps) {
    super();
  }
}
```

```typescript
// commands/create-article/create-article.handler.ts
@CommandHandler(CreateArticleCommand)
export class CreateArticleHandler implements ICommandHandler<CreateArticleCommand> {
  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepo: IArticleRepository,
  ) {}

  async execute(command: CreateArticleCommand): Promise<string> {
    const article = await this.articleRepo.create(command.props);
    if (!article) throw new NotFoundException(ARTICLE_ERRORS.CREATE_FAILED);
    return article.id;
  }
}
```

### 2.4 Command with a single primitive prop

When a command carries only one scalar value (e.g. `articleId`), skip the Props interface and use a
plain property directly.

```typescript
// commands/delete-article/delete-article.command.ts
import { Command } from '@nestjs/cqrs';

export class DeleteArticleCommand extends Command<null> {
  constructor(public readonly articleId: string) {
    super();
  }
}
```

```typescript
// commands/delete-article/delete-article.handler.ts
@CommandHandler(DeleteArticleCommand)
export class DeleteArticleHandler implements ICommandHandler<DeleteArticleCommand> {
  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepo: IArticleRepository,
  ) {}

  async execute(command: DeleteArticleCommand): Promise<null> {
    // Single-prop commands: read the property directly from command, not from props
    const { articleId } = command;
    await this.articleRepo.deleteById(articleId);
    return null;
  }
}
```

---

## 3. Queries

### 3.1 Query message file (`*.query.ts`)

Queries extend `Query<TResult>`, where `TResult` is the data the handler returns.

```typescript
// queries/get-article/get-article.query.ts
import type { ArticleSelect } from '@app/database/types';
import { Query } from '@nestjs/cqrs';

export class GetArticleQuery extends Query<ArticleSelect | null> {
  constructor(public readonly id: string) {
    super();
  }
}
```

### 3.2 Query handler file (`*.handler.ts`)

**Simple handler** — queries with a single repository, no complex logic:

```typescript
// queries/get-article/get-article.handler.ts
import { ARTICLE_REPOSITORY, type IArticleRepository } from '@app/layer-data';
import type { ArticleSelect } from '@app/database/types';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetArticleQuery } from './get-article.query';

@QueryHandler(GetArticleQuery)
export class GetArticleHandler implements IQueryHandler<GetArticleQuery> {
  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepo: IArticleRepository,
  ) {}

  async execute(query: GetArticleQuery): Promise<ArticleSelect | null> {
    return this.articleRepo.findById(query.id);
  }
}
```

### 3.3 Pagination query

The query carries a `props` object (the DTO fields spread in, plus any auth context the handler
needs); the repository's `findPaginated(params)` returns an `OffsetResult<T>` = `{ data, pagination }`,
which is also the query's `TResult`. The handler may map each row before returning, but keeps the
`{ data, pagination }` shape — the controller remaps `data` → `items` (see
[API-DESIGN.md §2.3](./API-DESIGN.md#23-pagination-endpoint)).

```typescript
// queries/get-articles/get-articles.query.ts
import type { ArticleSelect } from '@app/database/types';
import { Query } from '@nestjs/cqrs';
import type { OffsetResult, RoleKey } from '@prowerbdigital/common';

import type { GetArticlesDto } from '../../dtos';

export interface GetArticlesQueryProps extends GetArticlesDto {
  currentUserId: string;
  roleKey: RoleKey;
}

export class GetArticlesQuery extends Query<OffsetResult<ArticleSelect>> {
  constructor(public readonly props: GetArticlesQueryProps) {
    super();
  }
}
```

```typescript
// queries/get-articles/get-articles.handler.ts
import { ARTICLE_REPOSITORY, type IArticleRepository } from '@app/layer-data';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetArticlesQuery } from './get-articles.query';

@QueryHandler(GetArticlesQuery)
export class GetArticlesHandler implements IQueryHandler<GetArticlesQuery> {
  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepo: IArticleRepository,
  ) {}

  async execute(query: GetArticlesQuery) {
    const { currentUserId, roleKey, ...params } = query.props;
    const { data, pagination } = await this.articleRepo.findPaginated(params);
    return { data, pagination };
  }
}
```

---

## 4. When to use a Service vs keep logic in the handler

**The deciding question is "is this logic shared across handlers?" — not "is this logic complex?"**

A handler owns its own business logic. It may inject repositories (via `@Inject(TOKEN)`), the DB
provider, and Services directly — including handlers that open transactions, touch multiple
repositories, or call external APIs. Do **not** push handler-specific logic into a Service just
because it is long or multi-step.

Move a method into a Service **only** when two or more handlers genuinely reuse it.

| Scenario                                                          | Use                          |
| ---------------------------------------------------------------- | ---------------------------- |
| Logic used by exactly one handler (even if it spans repos / tx / external calls) | Keep it in that handler      |
| A helper genuinely reused by two or more handlers                | Extract to a Service         |
| A private "find-or-throw" / utility used by a single handler     | Private method on the handler |
| The same private "find-or-throw" / utility used by many handlers | Public method on a Service   |

> A handler may still inject a Service to call its **shared** helpers (e.g.
> `this.eventService.resolveCoordinates(...)`) while keeping the rest of the step's logic local.

**Service placement rule:** when shared logic spans multiple repositories, place the method in the
Service whose **domain matches the action**, not the service that owns the "primary" repository.

```
// WRONG — getPermissionsByUserId does NOT belong in UserService just because
// the query starts with a userId
UserService.getPermissionsByUserId(userId)

// CORRECT — the action is about permissions; it belongs in PermissionService
PermissionService.getPermissionsByUserId(userId)
```

---

## 5. Handler barrel exports

Every command/query directory has an `index.ts` re-export, and the parent `commands/` and
`queries/` directories have their own `index.ts` that re-exports all children.

```typescript
// commands/create-article/index.ts
export * from './create-article.command';
export * from './create-article.handler';
```

```typescript
// commands/index.ts
export * from './create-article';
export * from './publish-article';
export * from './delete-article';
// ...
```

The module file imports handler _classes_ (not the command classes) into its handler arrays:

```typescript
// In *.module.ts
import { CreateArticleHandler, PublishArticleHandler } from './commands';

const CommandHandlers = [CreateArticleHandler, PublishArticleHandler];
```

---

## 6. Keep `execute()` thin

`execute()` is the orchestration entry point — it should read as a short, top-level outline of the
step. Extract each distinct piece of logic into its own small, well-named private method (still on
the handler — this is not a reason to reach for a Service, see §4) and have `execute()` call them.
Someone reading `execute()` should understand the flow from the method names alone, without wading
through the details.

Extract when a block does one nameable thing: building/shaping a response slice, resolving or
validating an input, mapping rows, applying a business rule. Inline only trivial one-liners.

```typescript
// ✗ WRONG — one long execute() the reader must parse line by line
async execute(query: GetEventDetailQuery) {
  // ...fetch...
  return {
    ...(wantOverview && { overview: { ...event, images: this.resolveUrls(event.images) } }),
    ...(wantLogistics && {
      logistics: logistics && {
        ...logistics,
        venueLayouts: this.resolveUrls(logistics.venueLayouts),
        eventDocuments: this.resolveUrls(logistics.eventDocuments),
        // ...more inline shaping...
      },
    }),
  };
}

// ✓ RIGHT — execute() reads as an outline; each step is a named method
async execute(query: GetEventDetailQuery) {
  // ...fetch...
  return {
    ...(wantOverview && { overview: this.buildOverview(event) }),
    ...(wantLogistics && { logistics: this.buildLogistics(logistics) }),
    ...(wantHelping && { helpingHands: this.buildHelpingHands(helpingHands) }),
  };
}

private buildOverview(event: EventSelect) {
  return { ...event, images: this.resolveUrls(event.images) };
}
// buildLogistics(...), buildHelpingHands(...), resolveUrls(...) alongside.
```
