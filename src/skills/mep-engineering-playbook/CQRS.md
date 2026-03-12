# CQRS — Commands & Queries

## Table of contents

1. [File naming quirk](#1-file-naming-quirk)
2. [Commands](#2-commands)
   - 2.1 [Command message file (`*.handler.ts`)](#21-command-message-file-handlerts)
   - 2.2 [Command executor file (`*.command.ts`)](#22-command-executor-file-commandts)
   - 2.3 [Command that returns a scalar](#23-command-that-returns-a-scalar)
   - 2.4 [Command with a single primitive prop](#24-command-with-a-single-primitive-prop)
3. [Queries](#3-queries)
   - 3.1 [Query message file (`*.query.ts`)](#31-query-message-file-queryts)
   - 3.2 [Query handler file (`*.handler.ts`)](#32-query-handler-file-handlerts)
   - 3.3 [Pagination query](#33-pagination-query)
4. [When to use a Service vs Repository directly](#4-when-to-use-a-service-vs-repository-directly)
5. [Handler barrel exports](#5-handler-barrel-exports)

---

## 1. File naming quirk

> **This is an established convention. Never change it.**

| File                     | What it contains                                             |
| ------------------------ | ------------------------------------------------------------ |
| `*.handler.ts`           | `ICommand` class **and** its `Props` interface (the message) |
| `*.command.ts`           | `@CommandHandler` class — the executor                       |
| `*.query.ts`             | `IQuery` class (the message)                                 |
| `*.handler.ts` (queries) | `@QueryHandler` class — the executor                         |

The names are **inverted** from what they suggest for commands. This is intentional and project-wide.

---

## 2. Commands

### 2.1 Command message file (`*.handler.ts`)

`*.handler.ts` exports the Props interface and the `ICommand` class.

```typescript
// commands/create-article/create-article.handler.ts
import { ICommand } from '@nestjs/cqrs';

/** Props for the CreateArticleCommand. */
export interface CreateArticleCommandProps {
  title: string;
  body: string;
  authorId: string;
}

/**
 * @description Command message for creating a new article.
 * @type {Command}
 */
export class CreateArticleCommand implements ICommand {
  constructor(public readonly props: CreateArticleCommandProps) {}
}
```

### 2.2 Command executor file (`*.command.ts`)

`*.command.ts` is decorated with `@CommandHandler` and contains the execution logic.

**Simple handler** — delegates to a Repository directly (single repo, no transactions):

```typescript
// commands/create-article/create-article.command.ts
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { ARTICLE_REPOSITORY } from '../../providers';
import { ArticleRepository } from '../../repositories';
import { CreateArticleCommand } from './create-article.handler';

/**
 * @description Handles the CreateArticleCommand. Persists the new article.
 * @type {CommandHandler}
 */
@CommandHandler(CreateArticleCommand)
export class CreateArticleHandler implements ICommandHandler<CreateArticleCommand> {
  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepo: ArticleRepository,
  ) {}

  /**
   * @description Executes the command. Creates the article and returns null.
   * @param {CreateArticleCommand} command - The command instance.
   * @returns {Promise<null>}
   */
  async execute(command: CreateArticleCommand): Promise<null> {
    const { props } = command;
    await this.articleRepo.create(props);
    return null;
  }
}
```

**Complex handler** — delegates to a Service (multiple repos, transactions, or external calls):

```typescript
// commands/publish-article/publish-article.command.ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { ArticleService } from '../../services';
import { PublishArticleCommand } from './publish-article.handler';

/**
 * @description Handles the PublishArticleCommand. Delegates to ArticleService.
 * @type {CommandHandler}
 */
@CommandHandler(PublishArticleCommand)
export class PublishArticleHandler implements ICommandHandler<PublishArticleCommand> {
  constructor(private readonly articleSvc: ArticleService) {}

  /**
   * @description Executes the command.
   * @param {PublishArticleCommand} command
   * @returns {Promise<null>}
   */
  async execute(command: PublishArticleCommand): Promise<null> {
    const { props } = command;
    await this.articleSvc.publish(props);
    return null;
  }
}
```

### 2.3 Command that returns a scalar

Commands may return a simple scalar (e.g. the created record's `id`) when the caller needs it.
They must **never** return full data objects.

```typescript
// commands/create-article/create-article.command.ts
@CommandHandler(CreateArticleCommand)
export class CreateArticleHandler implements ICommandHandler<CreateArticleCommand> {
  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepo: ArticleRepository,
  ) {}

  /**
   * @description Creates the article and returns its ID.
   * @param {CreateArticleCommand} command
   * @returns {Promise<string>} The ID of the newly created article.
   */
  async execute(command: CreateArticleCommand): Promise<string> {
    const { props } = command;
    const article = await this.articleRepo.create(props);
    return article.id;
  }
}
```

### 2.4 Command with a single primitive prop

When a command carries only one scalar value (e.g. `userId`), skip the Props interface and use a
plain property directly.

```typescript
// commands/delete-article/delete-article.handler.ts
import { ICommand } from '@nestjs/cqrs';

/**
 * @description Command message to delete an article by ID.
 * @type {Command}
 */
export class DeleteArticleCommand implements ICommand {
  constructor(public readonly articleId: string) {}
}
```

```typescript
// commands/delete-article/delete-article.command.ts
@CommandHandler(DeleteArticleCommand)
export class DeleteArticleHandler implements ICommandHandler<DeleteArticleCommand> {
  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepo: ArticleRepository,
  ) {}

  async execute(command: DeleteArticleCommand): Promise<null> {
    // Single-prop commands: destructure directly from command, not from props
    const { articleId } = command;
    await this.articleRepo.hardDelete(articleId);
    return null;
  }
}
```

---

## 3. Queries

### 3.1 Query message file (`*.query.ts`)

```typescript
// queries/get-article/get-article.query.ts
import { IQuery } from '@nestjs/cqrs';

/**
 * @description Query message to retrieve a single article by ID.
 * @type {Query}
 */
export class GetArticleQuery implements IQuery {
  constructor(public readonly id: string) {}
}
```

### 3.2 Query handler file (`*.handler.ts`)

**Simple handler** — queries with a single repository, no complex logic:

```typescript
// queries/get-article/get-article.handler.ts
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { ARTICLE_REPOSITORY } from '../../providers';
import { ArticleRepository } from '../../repositories';
import { GetArticleQuery } from './get-article.query';

/**
 * @description Handles the GetArticleQuery. Fetches a single article by ID.
 * @type {QueryHandler}
 */
@QueryHandler(GetArticleQuery)
export class GetArticleHandler implements IQueryHandler<GetArticleQuery> {
  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepo: ArticleRepository,
  ) {}

  /**
   * @description Executes the query.
   * @param {GetArticleQuery} query
   * @returns {Promise<ArticleSelect | null>}
   */
  async execute(query: GetArticleQuery): Promise<ArticleSelect | null> {
    const { id } = query;
    return await this.articleRepo.findById(id);
  }
}
```

### 3.3 Pagination query

Use `OffsetPagination` as the query prop type and return `OffsetResult<T>`.

```typescript
// queries/get-articles/get-articles.query.ts
import { IQuery } from '@nestjs/cqrs';

import { OffsetPagination } from '../../../../common';

/**
 * @description Query message to retrieve a paginated list of articles.
 * @type {Query}
 */
export class GetArticlesQuery implements IQuery {
  constructor(public readonly props: OffsetPagination) {}
}
```

```typescript
// queries/get-articles/get-articles.handler.ts
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { OffsetResult } from '../../../../common';
import { ARTICLE_REPOSITORY } from '../../providers';
import { ArticleRepository } from '../../repositories';
import { GetArticlesQuery } from './get-articles.query';

/**
 * @description Handles the GetArticlesQuery. Returns paginated articles.
 * @type {QueryHandler}
 */
@QueryHandler(GetArticlesQuery)
export class GetArticlesHandler implements IQueryHandler<GetArticlesQuery> {
  constructor(
    @Inject(ARTICLE_REPOSITORY)
    private readonly articleRepo: ArticleRepository,
  ) {}

  /**
   * @description Executes the query.
   * @param {GetArticlesQuery} query
   * @returns {Promise<OffsetResult<ArticleSelect>>}
   */
  async execute(query: GetArticlesQuery): Promise<OffsetResult<ArticleSelect>> {
    const { props } = query;
    return await this.articleRepo.findWithOffset(props);
  }
}
```

---

## 4. When to use a Service vs Repository directly

| Scenario                                                     | Use                 |
| ------------------------------------------------------------ | ------------------- |
| Single repository call, no external I/O, no transactions     | Repository directly |
| Multiple repositories                                        | Service             |
| Requires a database transaction (`tx`)                       | Service             |
| Calls an external API / queue / event emitter                | Service             |
| Cross-domain logic (e.g. permission check + record creation) | Service             |

**Service placement rule:** place the method in the Service whose **domain matches the action**,
not the service that owns the "primary" repository.

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
export * from './create-article.handler';
export * from './create-article.command';
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
