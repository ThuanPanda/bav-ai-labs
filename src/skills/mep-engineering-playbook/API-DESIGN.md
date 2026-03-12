# API Design — Entry Points, Responses & Error Handling

## Table of contents

1. [Entry point types](#1-entry-point-types)
2. [HTTP controller](#2-http-controller)
   - 2.1 [Controller skeleton](#21-controller-skeleton)
   - 2.2 [Auth decorators](#22-auth-decorators)
   - 2.3 [Pagination endpoint](#23-pagination-endpoint)
3. [Message pattern handler (microservice transport)](#3-message-pattern-handler-microservice-transport)
4. [Event pattern handler](#4-event-pattern-handler)
5. [WebSocket gateway](#5-websocket-gateway)
6. [gRPC service](#6-grpc-service)
7. [Response helpers](#7-response-helpers)
8. [Error handling](#8-error-handling)
9. [Input DTOs](#9-input-dtos)
10. [i18n](#10-i18n)

---

## 1. Entry point types

An entry point receives an incoming request, dispatches to `CommandBus` or `QueryBus`, and
returns a response. It must contain **zero business logic**.

| Transport              | NestJS construct          |
| ---------------------- | ------------------------- |
| HTTP REST              | `@Controller` class       |
| TCP / Redis / NATS etc | `@MessagePattern` method  |
| Async events           | `@EventPattern` method    |
| WebSocket              | `@WebSocketGateway` class |
| gRPC                   | `@GrpcMethod` method      |

Never inject Services or Repositories into entry points. Only inject `CommandBus`, `QueryBus`,
and transport-specific infrastructure (e.g. i18n, response helpers).

---

## 2. HTTP controller

### 2.1 Controller skeleton

```typescript
// modules/article/entry/article.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { I18n, I18nContext } from 'nestjs-i18n';

import { ARTICLE_I18N_KEYS } from '../constants';
import { CreateArticleCommand, UpdateArticleCommand, DeleteArticleCommand } from '../commands';
import { GetArticleQuery, GetArticlesQuery } from '../queries';
import { CreateArticleDto, UpdateArticleDto, OffsetPaginationDto } from '../dtos';
import { OK, CREATED } from '../../../core';
import { CurrentUserId, Public } from '../../../decorators';
import { I18nTranslations } from '../../../i18n/i18n.generated';

/**
 * @description HTTP controller for the Article module. Dispatches only — no business logic.
 * @type {Controller}
 */
@Controller({ version: '1', path: 'article' })
@ApiTags('Article')
export class ArticleController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  /**
   * @description Creates a new article.
   * @type {Controller}
   * ---
   * @param {string} userId - Authenticated user ID.
   * @param {CreateArticleDto} body - Article data.
   * @param {I18nContext} i18n - Translations context.
   * ---
   * @returns {Promise<void>} Sends 201 Created response.
   */
  @Post()
  async createArticle(
    @CurrentUserId() userId: string,
    @Body() body: CreateArticleDto,
    @I18n() i18n: I18nContext<I18nTranslations>,
    @Res() res: Response,
  ) {
    const result = await this.commandBus.execute(
      new CreateArticleCommand({ ...body, authorId: userId }),
    );
    CREATED(res, await i18n.t(ARTICLE_I18N_KEYS.SUCCESS.CREATED), result);
  }

  /**
   * @description Retrieves a single article by ID.
   * @type {Controller}
   */
  @Get('detail/:id')
  @ApiParam({ name: 'id', required: true, description: 'Article ID' })
  async getArticle(
    @Param('id') id: string,
    @I18n() i18n: I18nContext<I18nTranslations>,
    @Res() res: Response,
  ) {
    const result = await this.queryBus.execute(new GetArticleQuery(id));
    OK(res, await i18n.t(ARTICLE_I18N_KEYS.SUCCESS.DETAIL), result);
  }

  /**
   * @description Updates an article.
   * @type {Controller}
   */
  @Put(':id')
  @ApiParam({ name: 'id', required: true })
  async updateArticle(
    @Param('id') id: string,
    @Body() body: UpdateArticleDto,
    @I18n() i18n: I18nContext<I18nTranslations>,
    @Res() res: Response,
  ) {
    const result = await this.commandBus.execute(new UpdateArticleCommand({ id, ...body }));
    OK(res, await i18n.t(ARTICLE_I18N_KEYS.SUCCESS.UPDATED), result);
  }

  /**
   * @description Hard-deletes an article.
   * @type {Controller}
   */
  @Delete(':id')
  @ApiParam({ name: 'id', required: true })
  async deleteArticle(
    @Param('id') id: string,
    @I18n() i18n: I18nContext<I18nTranslations>,
    @Res() res: Response,
  ) {
    await this.commandBus.execute(new DeleteArticleCommand(id));
    OK(res, await i18n.t(ARTICLE_I18N_KEYS.SUCCESS.DELETED), null);
  }
}
```

### 2.2 Auth decorators

| Decorator          | Purpose                                               |
| ------------------ | ----------------------------------------------------- |
| _(no decorator)_   | Route is protected — auth required by default         |
| `@Public()`        | Route is public — no authentication required          |
| `@CurrentUserId()` | Extracts the authenticated user's ID from the request |

```typescript
// Protected route (default)
@Get('me')
async getMe(@CurrentUserId() userId: string, ...) { ... }

// Public route
@Public()
@Post('sign-up')
async signUp(@Body() body: SignUpDto, ...) { ... }
```

### 2.3 Pagination endpoint

For paginated list endpoints, destructure `{ data, meta }` from the query result and pass
`meta` as the fourth argument to `OK`.

```typescript
@Get('list')
async getArticles(
  @Query() query: OffsetPaginationDto,
  @I18n() i18n: I18nContext<I18nTranslations>,
  @Res() res: Response,
) {
  const { data, meta } = await this.queryBus.execute(new GetArticlesQuery(query));
  OK(res, await i18n.t(ARTICLE_I18N_KEYS.SUCCESS.LIST), data, meta);
}
```

---

## 3. Message pattern handler (microservice transport)

Used for synchronous microservice communication (TCP, Redis, NATS, etc.).

```typescript
// modules/article/entry/article.message.controller.ts
import { Controller } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { GetArticleQuery } from '../queries';

/**
 * @description Message pattern controller for Article. Dispatches only — no business logic.
 * @type {Controller}
 */
@Controller()
export class ArticleMessageController {
  constructor(private readonly queryBus: QueryBus) {}

  /**
   * @description Handles the 'get_article' message pattern.
   * @param {{ id: string }} data - Payload containing article ID.
   * @returns {Promise<ArticleSelect | null>}
   */
  @MessagePattern('get_article')
  async getArticle(@Payload() data: { id: string }) {
    return this.queryBus.execute(new GetArticleQuery(data.id));
  }
}
```

---

## 4. Event pattern handler

Used for fire-and-forget async events.

```typescript
// modules/article/entry/article.event.controller.ts
import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { EventPattern, Payload } from '@nestjs/microservices';

import { IndexArticleCommand } from '../commands';

/**
 * @description Handles async events for Article indexing.
 * @type {Controller}
 */
@Controller()
export class ArticleEventController {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * @description Handles the 'article.created' event. Triggers search indexing.
   * @param {{ id: string }} data - Event payload.
   */
  @EventPattern('article.created')
  async onArticleCreated(@Payload() data: { id: string }) {
    await this.commandBus.execute(new IndexArticleCommand(data.id));
  }
}
```

---

## 5. WebSocket gateway

```typescript
// modules/article/entry/article.gateway.ts
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { QueryBus } from '@nestjs/cqrs';
import type { Socket } from 'socket.io';

import { GetArticleQuery } from '../queries';

/**
 * @description WebSocket gateway for real-time Article events. Dispatches only.
 * @type {Controller}
 */
@WebSocketGateway({ namespace: '/articles' })
export class ArticleGateway {
  constructor(private readonly queryBus: QueryBus) {}

  /**
   * @description Handles the 'getArticle' WebSocket message.
   * @param {{ id: string }} data
   * @param {Socket} client
   */
  @SubscribeMessage('getArticle')
  async handleGetArticle(@MessageBody() data: { id: string }, @ConnectedSocket() client: Socket) {
    const result = await this.queryBus.execute(new GetArticleQuery(data.id));
    client.emit('article', result);
  }
}
```

---

## 6. gRPC service

```typescript
// modules/article/entry/article.grpc.controller.ts
import { Controller } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GrpcMethod } from '@nestjs/microservices';

import { GetArticleQuery } from '../queries';

/**
 * @description gRPC service controller for Article. Dispatches only — no business logic.
 * @type {Controller}
 */
@Controller()
export class ArticleGrpcController {
  constructor(private readonly queryBus: QueryBus) {}

  /**
   * @description Handles the GetArticle gRPC call.
   * @param {{ id: string }} data
   * @returns {Promise<ArticleSelect | null>}
   */
  @GrpcMethod('ArticleService', 'GetArticle')
  async getArticle(data: { id: string }) {
    return this.queryBus.execute(new GetArticleQuery(data.id));
  }
}
```

---

## 7. Response helpers

**Never** write `res.json(...)`, `res.status(...).json(...)`, or any raw transport response
directly. Always use the project-defined helpers.

### HTTP

```typescript
import { OK, CREATED } from '../../../core';

// 200 OK — single record or action result
OK(res, message, data);

// 200 OK — paginated list (pass meta as fourth argument)
OK(res, message, data, meta);

// 201 Created
CREATED(res, message, data);
```

The helpers accept:

- `res` — Express `Response` object
- `message` — already-translated string (call `await i18n.t(...)` before passing)
- `data` — the payload (`null` for void operations)
- `meta` _(optional)_ — pagination meta object

### Other transports (message / gRPC / WebSocket)

Return the value directly from the handler method; NestJS serialises it automatically.

---

## 8. Error handling

**Never** throw `new Error(...)`, `new HttpException(...)`, or any generic exception class.
Always use the project-defined error classes from `core/`.

```typescript
// Examples — use the class names defined in your project's core/errors/
throw new Api400HttpError('Validation failed');
throw new Api404HttpError('Article not found');
throw new Api403HttpError('Forbidden');
throw new Api409HttpError('Slug already exists');
throw new Api500HttpError('Unexpected server error');
```

Throw these from Service methods or Repository methods when invariants are violated.
Command/Query handlers may also throw them directly if there is no Service layer.

---

## 9. Input DTOs

DTOs live in `<module>/dtos/`. Use `class-validator` decorators for validation.

```typescript
// modules/article/dtos/create-article.dto.ts
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * @description Input DTO for creating an article.
 */
export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  readonly title: string;

  @IsString()
  @IsNotEmpty()
  readonly body: string;

  @IsString()
  @IsOptional()
  readonly coverImageUrl?: string;
}
```

### Pagination DTO

Extend `OffsetPaginationDto` from `common/` for all paginated list endpoints:

```typescript
import { OffsetPaginationDto } from '../../../common';

export class GetArticlesDto extends OffsetPaginationDto {
  // add module-specific filters here if needed
}
```

`OffsetPaginationDto` already includes:

- `page` (default 1, min 1)
- `limit` (default 10, min 1, max 100)
- `sort`, `filter`, `search` (from `BaseQueryDto`)

---

## 10. i18n

All user-facing messages come from i18n. Never hardcode strings in response calls.

```typescript
// 1. Define keys in constants/
// modules/article/constants/article-i18n.constants.ts
export const ARTICLE_I18N_KEYS = {
  SUCCESS: {
    CREATED: 'article.success.created',
    DETAIL: 'article.success.detail',
    LIST: 'article.success.list',
    UPDATED: 'article.success.updated',
    DELETED: 'article.success.deleted',
  },
} as const;

// 2. Use in controller
OK(res, await i18n.t(ARTICLE_I18N_KEYS.SUCCESS.DETAIL), result);
```

The `i18n` parameter comes from `@I18n() i18n: I18nContext<I18nTranslations>` on the method.
Always `await` the `i18n.t(...)` call.
