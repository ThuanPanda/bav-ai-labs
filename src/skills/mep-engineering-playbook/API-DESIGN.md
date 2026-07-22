# API Design — Entry Points, Responses & Error Handling

## Table of contents

1. [Entry point types](#1-entry-point-types)
2. [HTTP controller](#2-http-controller)
   - 2.1 [Controller skeleton](#21-controller-skeleton)
   - 2.2 [Auth & user decorators](#22-auth--user-decorators)
   - 2.3 [Pagination endpoint](#23-pagination-endpoint)
   - 2.4 [Binary / file responses (the only `@Res()` exception)](#24-binary--file-responses)
3. [Response DTOs & serialization](#3-response-dtos--serialization)
4. [Message / event consumers (worker)](#4-message--event-consumers-worker)
5. [Other transports (gRPC / WebSocket)](#5-other-transports-grpc--websocket)
6. [Error handling](#6-error-handling)
7. [Response envelope — how it is built](#7-response-envelope--how-it-is-built)
8. [Input DTOs](#8-input-dtos)

---

## 1. Entry point types

An entry point receives an incoming request, dispatches to `CommandBus` or `QueryBus`, and
returns a value. It must contain **zero business logic**.

| Transport              | NestJS construct          | Used in this repo         |
| ---------------------- | ------------------------- | ------------------------- |
| HTTP REST              | `@Controller` class       | ✅ `internal`, `external` |
| RabbitMQ / events      | `@RabbitSubscribe` / `@EventPattern` | ✅ `worker`     |
| gRPC                   | `@GrpcMethod` method      | contract exists, generic  |
| WebSocket              | `@WebSocketGateway` class | generic                   |

Never inject Services or Repositories into an entry point. Inject only `CommandBus`, `QueryBus`,
and transport infrastructure.

---

## 2. HTTP controller

### 2.1 Controller skeleton

HTTP controllers live in `<module>/controllers/<module>.controller.ts`. They **return a plain
object** — a global `ResponseInterceptor` wraps it into the response envelope (see §7). Do **not**
inject `@Res()`, call `res.json(...)`, or translate messages with `i18n.t(...)`. Shape the payload
with a response DTO applied through `@Serialize(Dto)`, and advertise it in Swagger with
`@ApiSuccessResponse(Dto)`.

```typescript
// modules/event-tasks/controllers/event-tasks.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiSuccessResponse,
  CurrentUserId,
  CurrentUserRoleKey,
  RoleKey,
  Serialize,
} from '@prowerbdigital/common';

import { CreateTaskCommand, DeleteTaskCommand } from '../commands';
import { CreateTaskDto, GetTasksDto } from '../dtos';
import { GetTasksQuery } from '../queries';
import { CreateTaskResponse, EventTaskListResponse } from '../responses';

@Controller({ version: '1', path: 'event-tasks' })
@ApiTags('Event Tasks')
export class EventTasksController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an event task' })
  @ApiSuccessResponse(CreateTaskResponse)
  @Serialize(CreateTaskResponse)
  async createTask(@CurrentUserId() userId: string, @Body() body: CreateTaskDto) {
    const id = await this.commandBus.execute(
      new CreateTaskCommand({ eventId: body.eventId, createdBy: userId, service: body.service }),
    );
    return { id };
  }

  @Get()
  @ApiSuccessResponse(EventTaskListResponse)
  @Serialize(EventTaskListResponse)
  async getTasks(
    @CurrentUserId() currentUserId: string,
    @CurrentUserRoleKey() roleKey: RoleKey,
    @Query() query: GetTasksDto,
  ) {
    const { data, pagination } = await this.queryBus.execute(
      new GetTasksQuery({ ...query, currentUserId, roleKey }),
    );
    return { items: data, pagination };
  }

  @Delete(':id')
  async deleteTask(@Param('id') id: string, @CurrentUserId() currentUserId: string) {
    await this.commandBus.execute(new DeleteTaskCommand({ id, currentUserId }));
    return { success: true };
  }
}
```

Notes:

- `@Controller({ version: '1', path: '...' })` — URI versioning is enabled globally.
- A command's scalar return (an `id`) is remapped into the response object the DTO expects.
- An action with no payload returns `{ success: true }`.

### 2.2 Auth & user decorators

Auth is enforced by a global guard; routes are protected **by default**.

| Decorator                 | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| _(none)_                  | Protected route — authentication required                   |
| `@Public()`               | Opt out — public route                                      |
| `@CurrentUserId()`        | Injects the authenticated user's id (`string`)              |
| `@CurrentUserRoleKey()`   | Injects the caller's role key (`RoleKey`) for authorization |

All from `@prowerbdigital/common`.

### 2.3 Pagination endpoint

The query returns an `OffsetResult<T>` whose array key is **`data`** and whose meta key is
**`pagination`** (library type — do not rename). Remap `data` → **`items`** in the controller,
because the response DTO exposes `items` + `pagination`:

```typescript
@Get()
@Serialize(ArticleListResponse)
async list(@Query() query: GetArticlesDto) {
  const { data, pagination } = await this.queryBus.execute(new GetArticlesQuery({ ...query }));
  return { items: data, pagination };
}
```

The list DTO exposes both keys, typing `pagination` with the shared `OffsetPaginationResponseDto`:

```typescript
@Exclude()
export class ArticleListResponse {
  @ApiProperty({ type: [ArticleListItemResponse] })
  @Expose() @Type(() => ArticleListItemResponse) items: ArticleListItemResponse[];

  @ApiProperty({ type: OffsetPaginationResponseDto })
  @Expose() @Type(() => OffsetPaginationResponseDto) pagination: OffsetPaginationResponseDto;
}
```

### 2.4 Binary / file responses

Streaming a file (e.g. an Excel export) is the **only** case where `@Res()` is allowed. Set the
headers and pipe the stream directly; no response DTO, no interceptor envelope.

```typescript
@Get('export')
async export(@Res() res: Response, @Query() query: ExportEventsDto) {
  const stream = await this.queryBus.execute(new ExportEventsQuery(query));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="events.xlsx"`);
  stream.pipe(res);
  stream.on('error', () => res.destroy());
}
```

---

## 3. Response DTOs & serialization

Every non-trivial HTTP payload is described by a response DTO in `<module>/responses/`,
`<name>.response.ts`. Rules:

- Annotate the class with `@Exclude()` and each exposed field with `@Expose()`. Only `@Expose()`d
  fields are serialized — everything else is dropped, which is how sensitive columns are kept out.
- Nested objects/arrays use `@Type(() => ChildResponse)`; the child is its own `@Exclude()` class.
- Rename a field for the wire with `@Expose({ name: 'snake_case_key' })`.
- Document every field with `@ApiProperty` / `@ApiPropertyOptional` (Swagger; no CLI plugin, so the
  decorators are the only source of truth).
- Apply the DTO on the controller method with `@Serialize(Dto)` **and** `@ApiSuccessResponse(Dto)`.

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CreateTaskResponse {
  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxxx' })
  @Expose()
  id: string;
}
```

Export every response DTO from `responses/index.ts`.

---

## 4. Message / event consumers (worker)

The `worker` app consumes RabbitMQ messages/events (via `@prowerbdigital/common`'s
`RmqGolevelupModule`) and drives scheduled jobs (`@nestjs/schedule`). A consumer is still an entry
point: it dispatches to the bus and holds no business logic. Return the value directly — there is
no HTTP envelope for these transports.

```typescript
@RabbitSubscribe({ exchange: NOTIFICATION_EXCHANGE, routingKey: 'user.updated', queue: 'etr.user-snapshot' })
async onUserUpdated(payload: UserUpdatedPayload) {
  await this.commandBus.execute(new UpsertUserSnapshotCommand(payload));
}
```

---

## 5. Other transports (gRPC / WebSocket)

Generic patterns — dispatch only, return the value directly (NestJS serializes it):

```typescript
@GrpcMethod('ArticleService', 'GetArticle')
async getArticle(data: { id: string }) {
  return this.queryBus.execute(new GetArticleQuery(data.id));
}

@SubscribeMessage('getArticle')
async handleGetArticle(@MessageBody() data: { id: string }, @ConnectedSocket() client: Socket) {
  client.emit('article', await this.queryBus.execute(new GetArticleQuery(data.id)));
}
```

---

## 6. Error handling

**Never** throw `new Error(...)`, `new HttpException(...)`, or any generic exception. Throw a
NestJS HTTP exception (`NotFoundException`, `BadRequestException`, `ForbiddenException`,
`ConflictException`, …) and **pass a module error-key constant — never a human-readable string.**
The client receives the key and resolves display text (i18n) on its side.

### Error-key constants

Each module owns its keys in `<module>/constants/<module>-error.constants.ts`, exported as
`<MODULE>_ERRORS`. The value is a namespaced key `'<MODULE>.<REASON>'` — never a sentence.

```typescript
// modules/event-tasks/constants/event-tasks-error.constants.ts
export const EVENT_TASKS_ERRORS = {
  EVENT_NOT_FOUND: 'EVENT_TASKS.EVENT_NOT_FOUND',
  TASK_CREATE_FAILED: 'EVENT_TASKS.TASK_CREATE_FAILED',
  TASK_NOT_FOUND: 'EVENT_TASKS.TASK_NOT_FOUND',
  TASK_DELETE_FORBIDDEN: 'EVENT_TASKS.TASK_DELETE_FORBIDDEN',
} as const;
```

Re-export it from `constants/index.ts`.

### Throwing

```typescript
import { EVENT_TASKS_ERRORS } from '../../constants';

// ✅ pass the key constant
if (!event) throw new NotFoundException(EVENT_TASKS_ERRORS.EVENT_NOT_FOUND);

// ❌ never a raw / interpolated string
throw new NotFoundException('Event not found');
throw new NotFoundException(`Event ${id} not found`);
```

> Because the key is static, dynamic values (an id, a count) are **not** carried in the message.
> Encode the reason in a distinct key instead of interpolating.

Handlers throw these directly (they own their logic); shared Services may throw them too. The
`throw new Error('Method not implemented.')` stubs on the unused `BaseRepositoryV2` surface are
internal placeholders, not API errors — leave them.

---

## 7. Response envelope — how it is built

You never build the envelope by hand. In each app's `main.ts`, global interceptors from
`@prowerbdigital/common` are registered:

```typescript
app.useGlobalInterceptors(
  new ResponseInterceptor(),          // wraps the returned value into the success envelope
  new SerializerInterceptor(reflector),   // applies the @Serialize(Dto) class-transformer step
  new ClassSerializerInterceptor(reflector),
);
app.useGlobalFilters(new SystemExceptionFilter(logger));   // formats thrown HTTP exceptions
```

So the contract for a controller method is simply: **return the data object** (or `{ success: true }`
for void actions); `@Serialize(Dto)` shapes it and `ResponseInterceptor` wraps it. Errors thrown as
HTTP exceptions with an error-key constant are formatted by `SystemExceptionFilter`.

---

## 8. Input DTOs

DTOs live in `<module>/dtos/`, one per file (`<verb>-<noun>.dto.ts`). Use `class-validator`
decorators and `@ApiProperty` / `@ApiPropertyOptional` for Swagger.

> **Always value-import DTOs in controllers — never `import type`.**
> A DTO bound with `@Body()`, `@Query()`, or `@Param()` must be a **runtime value import**:
>
> ```typescript
> import { GetTasksDto } from '../dtos';        // ✅ correct
> import type { GetTasksDto } from '../dtos';   // ❌ breaks Swagger + validation
> ```
>
> `import type` is erased at compile time, so the `design:type` reflection metadata NestJS relies on
> disappears — Swagger shows no params and `ValidationPipe` silently skips validation. There is no
> `@nestjs/swagger` CLI plugin here, so this metadata is the only source of truth.

### Pagination DTO

Extend `OffsetPaginationDto` from `@prowerbdigital/common` for paginated list endpoints; add
module-specific filters:

```typescript
import { OffsetPaginationDto } from '@prowerbdigital/common';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetTasksDto extends OffsetPaginationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly eventId: string;

  @ApiPropertyOptional({ enum: EventTaskServiceEnum.enumValues })
  @IsIn(EventTaskServiceEnum.enumValues)
  @IsOptional()
  readonly service?: EventTaskService;
}
```

`OffsetPaginationDto` already provides `page` (default 1) and `limit` (default 10).
