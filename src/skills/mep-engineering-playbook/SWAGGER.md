# Swagger — Setup & Configuration

Mandatory guide for configuring Swagger (OpenAPI) in MEP NestJS CQRS microservices.
**Follow this document whenever you add or update swagger documentation in any HTTP module.**

> **Response model.** Controllers return **plain objects**; the global `ResponseInterceptor`
> wraps them in the success envelope and `@Serialize(Dto)` shapes the payload. Swagger documents
> that envelope through **`@ApiSuccessResponse(Dto)`** — never via manual `@Res()` / `OK()` /
> `CREATED()`. See [API-DESIGN.md](./API-DESIGN.md) for the full response + error model.

## Table of contents

1. [Installation](#1-installation)
2. [Bootstrap setup (`main.ts`)](#2-bootstrap-setup-maints)
3. [Controller-level decorators](#3-controller-level-decorators)
4. [Method-level decorators](#4-method-level-decorators)
5. [Input DTO decorators](#5-input-dto-decorators)
6. [Response DTOs](#6-response-dtos)
7. [Pagination endpoints](#7-pagination-endpoints)
8. [Enums](#8-enums)
9. [Auth — Bearer token](#9-auth--bearer-token)
10. [Public routes](#10-public-routes)
11. [Environment-based toggling](#11-environment-based-toggling)
12. [Checklist](#12-checklist)

---

## 1. Installation

`@nestjs/swagger` ships as a dependency of every MEP service (it backs `@prowerbdigital/common`'s
`setupSwagger` + `@ApiSuccessResponse`). If a fresh project is missing it:

```bash
pnpm add @nestjs/swagger
```

---

## 2. Bootstrap setup (`main.ts`)

Use **`setupSwagger` from `@prowerbdigital/common`** — never call `DocumentBuilder` /
`SwaggerModule` directly. The helper builds the OpenAPI document, registers a Bearer scheme, and
mounts the UI, so every service documents consistently. Add it **after** global pipes/interceptors/
filters and only outside production.

```typescript
// main.ts
import { NodeEnv, setupSwagger } from '@prowerbdigital/common';

// ...after app.useGlobalPipes / interceptors / filters...

if (nodeEnv !== NodeEnv.Prod) {
  setupSwagger(app, {
    title: 'MEP <Service> API',
    description: 'MEP <Service> API documentation',
    path: 'api/docs',
    bearerAuthName: 'SWAGGER_BEARER_TOKEN',
  });
}
```

> Access the UI at `http://localhost:<PORT>/api/docs` (respecting the global prefix, e.g.
> `.../api/docs`). `bearerAuthName` names the Bearer security scheme — reuse that exact string in
> any `@ApiBearerAuth(...)` decorator (see §9).

---

## 3. Controller-level decorators

Apply `@ApiTags('ModuleName')` to **every** HTTP controller class to group its endpoints in the UI.

```typescript
// modules/article/controllers/article.controller.ts
import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller({ version: '1', path: 'articles' })
@ApiTags('Articles')
export class ArticleController { ... }
```

Routes are auth-protected by default (a global guard). To show the lock icon / attach the Bearer
requirement in the UI, add `@ApiBearerAuth('SWAGGER_BEARER_TOKEN')` — the string must match the
`bearerAuthName` passed to `setupSwagger` (see §9). Public routes opt out per method (see §10).

---

## 4. Method-level decorators

Every method carries `@ApiOperation` + `@ApiSuccessResponse(<ResponseDto>)`. Document path/query
params with `@ApiParam` / `@ApiQuery`.

### 4.1 Core decorators

| Decorator                                   | Purpose                                                              |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `@ApiOperation({ summary })`                | One-line description shown in the endpoint header                   |
| `@ApiSuccessResponse(<ResponseDto>)`        | Documents the success envelope wrapping `<ResponseDto>` (from `@prowerbdigital/common`) |
| `@ApiParam({ name, description, required })` | Documents a path parameter (`:id`)                                  |
| `@ApiQuery({ name, ... })`                  | Documents a query param (usually auto-derived from the `@Query()` DTO) |
| `@ApiResponse({ status, description })`     | Optionally documents a notable error status (e.g. `404`)            |

`@ApiSuccessResponse(Dto)` documents the response; **pair it with `@Serialize(Dto)`**, which shapes
the actual payload the handler returns. Errors are thrown as NestJS HTTP exceptions carrying a
module error-key constant — see [API-DESIGN.md §8](./API-DESIGN.md#8-error-handling); document the
important ones with `@ApiResponse` when it aids the consumer.

### 4.2 Example — RESTful CRUD

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, Serialize } from '@prowerbdigital/common';

import { CreateArticleCommand, DeleteArticleCommand, UpdateArticleCommand } from '../commands';
import { CreateArticleDto, GetArticlesDto, UpdateArticleDto } from '../dtos';
import { GetArticleQuery, GetArticlesQuery } from '../queries';
import { ArticleListResponse, ArticleResponse, MutateArticleResponse } from '../responses';

@Controller({ version: '1', path: 'articles' })
@ApiTags('Articles')
export class ArticleController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an article' })
  @ApiSuccessResponse(MutateArticleResponse)
  @Serialize(MutateArticleResponse)
  async createArticle(@Body() body: CreateArticleDto) {
    const id = await this.commandBus.execute(new CreateArticleCommand(body));
    return { id };
  }

  @Get()
  @ApiOperation({ summary: 'List articles — page paginated' })
  @ApiSuccessResponse(ArticleListResponse)
  @Serialize(ArticleListResponse)
  async getArticles(@Query() query: GetArticlesDto) {
    const { data, pagination } = await this.queryBus.execute(new GetArticlesQuery(query));
    return { items: data, pagination };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an article by id' })
  @ApiParam({ name: 'id', required: true, description: 'Article UUID' })
  @ApiSuccessResponse(ArticleResponse)
  @Serialize(ArticleResponse)
  async getArticle(@Param('id') id: string) {
    return this.queryBus.execute(new GetArticleQuery(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an article' })
  @ApiParam({ name: 'id', required: true, description: 'Article UUID' })
  @ApiSuccessResponse(MutateArticleResponse)
  @Serialize(MutateArticleResponse)
  async updateArticle(@Param('id') id: string, @Body() body: UpdateArticleDto) {
    const updatedId = await this.commandBus.execute(new UpdateArticleCommand({ id, ...body }));
    return { id: updatedId };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an article' })
  @ApiParam({ name: 'id', required: true, description: 'Article UUID' })
  async deleteArticle(@Param('id') id: string) {
    await this.commandBus.execute(new DeleteArticleCommand({ id }));
    return { success: true };
  }
}
```

> **REST paths:** list the collection at the root (`@Get()`), never `@Get('list')` /
> `@Get('detail/:id')`. **Return plain objects** — never `@Res()`, `res.json(...)`, `OK()`, or
> `CREATED()`. **Value-import DTOs** (`import { GetArticlesDto }`, not `import type`) so Swagger and
> `ValidationPipe` see the reflection metadata — see [API-DESIGN.md §9](./API-DESIGN.md#9-input-dtos).

---

## 5. Input DTO decorators

Every property in an input DTO **must** have `@ApiProperty` or `@ApiPropertyOptional`.

### 5.1 Required property

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateArticleDto {
  @ApiProperty({ description: 'Title of the article', example: 'My first article' })
  @IsString()
  @MinLength(3)
  readonly title!: string;

  @ApiProperty({ description: 'Article body in markdown', example: '# Hello world' })
  @IsString()
  readonly content!: string;
}
```

### 5.2 Optional property

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateArticleDto {
  @ApiPropertyOptional({ description: 'New title', example: 'Updated title' })
  @IsOptional()
  @IsString()
  readonly title?: string;
}
```

### 5.3 Nested DTO

```typescript
@ApiProperty({ type: () => AddressDto, description: 'Shipping address' })
readonly address!: AddressDto;
```

Use a lazy function (`() => AddressDto`) to avoid circular-reference issues.

---

## 6. Response DTOs

The success payload is described by a **class-transformer response DTO** passed to both
`@ApiSuccessResponse(Dto)` (docs) and `@Serialize(Dto)` (runtime shaping). Whitelist fields with
`@Exclude()` on the class + `@Expose()` per property, and document each with `@ApiProperty`. Keep
these in `responses/` alongside the module.

```typescript
// modules/article/responses/article.response.ts
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ArticleResponse {
  @ApiProperty({ example: 'b3d2e1f9-...' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'My first article' })
  @Expose()
  title!: string;

  @ApiProperty()
  @Expose()
  createdAt!: Date;
}
```

Commands return only the affected `id` (never a full object), so create/update endpoints use a
small mutate response:

```typescript
@Exclude()
export class MutateArticleResponse {
  @ApiProperty({ example: 'b3d2e1f9-...' })
  @Expose()
  id!: string | null;
}
```

> Response DTOs are **not** domain entities and are never instantiated by hand. Name them
> `<Entity>Response`; expose only the fields the client should see.

---

## 7. Pagination endpoints

A paginated list response exposes the array as **`items`** (never `data`) alongside
**`pagination`** — an `OffsetPaginationResponseDto` from `@prowerbdigital/common`. The repository /
query returns an `OffsetResult<T>` = `{ data, pagination }`; the controller remaps `data` → `items`.

```typescript
// responses/article-list.response.ts
import { ApiProperty } from '@nestjs/swagger';
import { OffsetPaginationResponseDto } from '@prowerbdigital/common';
import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class ArticleListItemResponse {
  @ApiProperty({ example: 'b3d2e1f9-...' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'My first article' })
  @Expose()
  title!: string;
}

@Exclude()
export class ArticleListResponse {
  @ApiProperty({ type: [ArticleListItemResponse] })
  @Expose()
  @Type(() => ArticleListItemResponse)
  items!: ArticleListItemResponse[];

  @ApiProperty({ type: OffsetPaginationResponseDto })
  @Expose()
  @Type(() => OffsetPaginationResponseDto)
  pagination!: OffsetPaginationResponseDto;
}
```

```typescript
// controller — page/limit/search are documented automatically from GetArticlesDto
@Get()
@ApiOperation({ summary: 'List articles — page paginated' })
@ApiSuccessResponse(ArticleListResponse)
@Serialize(ArticleListResponse)
async getArticles(@Query() query: GetArticlesDto) {
  const { data, pagination } = await this.queryBus.execute(new GetArticlesQuery(query));
  return { items: data, pagination };
}
```

> `GetArticlesDto extends OffsetPaginationDto`, whose `page` / `limit` / `search` fields already
> carry `@ApiPropertyOptional` — so `@Query()` documents them automatically. Add extra `@ApiQuery`
> only for module-specific filters not covered by the DTO.

---

## 8. Enums

```typescript
// Define the enum in the module constants or a shared enums file
export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

// DTO usage
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class CreateArticleDto {
  @ApiProperty({ enum: ArticleStatus, description: 'Publication status', example: ArticleStatus.DRAFT })
  @IsEnum(ArticleStatus)
  readonly status!: ArticleStatus;
}
```

---

## 9. Auth — Bearer token

`setupSwagger({ bearerAuthName: 'SWAGGER_BEARER_TOKEN' })` registers the Bearer security scheme —
no `DocumentBuilder` wiring needed. To attach that requirement to a controller's routes (lock icon
in the UI), add `@ApiBearerAuth('SWAGGER_BEARER_TOKEN')` — the name must match `bearerAuthName`.

```typescript
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller({ version: '1', path: 'articles' })
@ApiTags('Articles')
@ApiBearerAuth('SWAGGER_BEARER_TOKEN')
export class ArticleController { ... }
```

### How to authenticate in the UI

1. Click **Authorize** in the top-right of the Swagger UI.
2. Enter the JWT access token (without the `Bearer ` prefix) in the **Value** field.
3. Click **Authorize**, then **Close** — subsequent requests include `Authorization: Bearer <token>`.

---

## 10. Public routes

When a route is `@Public()` it needs no auth. Reflect that in Swagger by overriding the
class-level Bearer requirement with an empty security array at the method level:

```typescript
import { ApiSecurity } from '@nestjs/swagger';

@Public()
@Post('sign-up')
@ApiOperation({ summary: 'Register a new user' })
@ApiSecurity([]) // override the class-level @ApiBearerAuth — no auth required
@ApiSuccessResponse(SignUpResponse)
@Serialize(SignUpResponse)
async signUp(@Body() body: SignUpDto) { ... }
```

---

## 11. Environment-based toggling

Swagger must **never** be exposed in production. The `setupSwagger` call is already guarded by
`nodeEnv !== NodeEnv.Prod` (§2) — keep it that way. For finer control, gate it on a dedicated env
var instead:

```typescript
// venv/.env.<env>
SWAGGER_ENABLED=true

// main.ts
if (process.env.SWAGGER_ENABLED === 'true') {
  setupSwagger(app, { title: '...', description: '...', path: 'api/docs', bearerAuthName: 'SWAGGER_BEARER_TOKEN' });
}
```

Bind `SWAGGER_ENABLED=false` in all production deployment configs (Docker, Kubernetes, CI/CD).

---

## 12. Checklist

Before submitting a PR for any HTTP module, verify:

- [ ] `main.ts` calls `setupSwagger(app, { title, description, path, bearerAuthName })` from `@prowerbdigital/common`
- [ ] Swagger setup is guarded by `nodeEnv !== NodeEnv.Prod` (or `SWAGGER_ENABLED`)
- [ ] Every HTTP controller has `@ApiTags` (and `@ApiBearerAuth('<bearerAuthName>')` for protected controllers)
- [ ] Every method has `@ApiOperation` + `@ApiSuccessResponse(<ResponseDto>)` + `@Serialize(<ResponseDto>)`
- [ ] Collections listed at the root (`@Get()`), items at `@Get(':id')` — no `list` / `detail` path segments
- [ ] Handlers return plain objects — no `@Res()`, `res.json(...)`, `OK()`, or `CREATED()`
- [ ] Path params (`:id`) documented with `@ApiParam`; DTOs value-imported (never `import type`)
- [ ] Every input DTO property has `@ApiProperty` / `@ApiPropertyOptional` with `description` + `example`
- [ ] Enum properties use `{ enum: MyEnum }` in `@ApiProperty`
- [ ] Response DTOs (`<Entity>Response`) use `@Exclude()` + `@Expose()` and live in `responses/`
- [ ] Paginated endpoints expose `items` + `pagination` (`OffsetPaginationResponseDto`), never `data`
- [ ] Public routes (`@Public()`) add `@ApiSecurity([])` to drop the lock icon
