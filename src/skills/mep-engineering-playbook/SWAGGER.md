# Swagger — Setup & Configuration

Mandatory guide for configuring Swagger (OpenAPI) in MEP NestJS CQRS microservices.
**Follow this document whenever you add or update swagger documentation in any HTTP module.**

## Table of contents

1. [Installation](#1-installation)
2. [Bootstrap setup (`main.ts`)](#2-bootstrap-setup-maints)
3. [Controller-level decorators](#3-controller-level-decorators)
4. [Method-level decorators](#4-method-level-decorators)
5. [DTO decorators](#5-dto-decorators)
6. [Response schema with MEP helpers](#6-response-schema-with-mep-helpers)
7. [Pagination endpoints](#7-pagination-endpoints)
8. [Enums](#8-enums)
9. [Auth — Bearer token](#9-auth--bearer-token)
10. [Public routes](#10-public-routes)
11. [Environment-based toggling](#11-environment-based-toggling)
12. [Checklist](#12-checklist)

---

## 1. Installation

```bash
pnpm add @nestjs/swagger
```

No additional peer dependencies are required — `@nestjs/swagger` uses the existing
`@nestjs/common` and `@nestjs/core` packages already present in every MEP project.

---

## 2. Bootstrap setup (`main.ts`)

Add Swagger setup **after** all global middleware, pipes, and guards but **before** `app.listen()`.

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- global middleware / pipes / guards here ---

  // Swagger — only enable outside production
  if (process.env['NODE_ENV'] !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('MEP Service')
      .setDescription('API documentation for this MEP microservice')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(process.env['PORT'] ?? 3000);
}

bootstrap();
```

> Access the UI at `http://localhost:<PORT>/api/docs`.
> `persistAuthorization: true` keeps the Bearer token after page refresh — always set this.

---

## 3. Controller-level decorators

Apply both decorators to **every** HTTP controller class.

| Decorator                        | Purpose                                          |
| -------------------------------- | ------------------------------------------------ |
| `@ApiTags('ModuleName')`         | Groups endpoints under a named section in the UI |
| `@ApiBearerAuth('access-token')` | Marks all routes as requiring Bearer JWT auth    |

The `'access-token'` string must match the name used in `addBearerAuth(...)` in `main.ts`.

```typescript
// modules/article/entry/article.controller.ts
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller({ version: '1', path: 'article' })
@ApiTags('Article')
@ApiBearerAuth('access-token')
export class ArticleController {
  ...
}
```

> If the controller has any **public** routes, keep `@ApiBearerAuth` on the class and add
> `@ApiSecurity([])` at the method level — see [§10 Public routes](#10-public-routes).

---

## 4. Method-level decorators

Apply to every controller method. Minimum required: `@ApiOperation` + at least one `@ApiResponse`.

### 4.1 Core decorators

| Decorator                                            | Purpose                                           |
| ---------------------------------------------------- | ------------------------------------------------- |
| `@ApiOperation({ summary: '...' })`                  | One-line description shown in the endpoint header |
| `@ApiResponse({ status, description, type })`        | Documents a possible response                     |
| `@ApiParam({ name, description, required? })`        | Documents a path parameter (`:id`)                |
| `@ApiQuery({ name, description, required?, type? })` | Documents a query string param                    |

### 4.2 Common response statuses

| Helper used    | HTTP status | `@ApiResponse` status to declare |
| -------------- | ----------- | -------------------------------- |
| `CREATED(res)` | 201         | `201`                            |
| `OK(res)`      | 200         | `200`                            |

### 4.3 Example — full method decoration

```typescript
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

// POST — create
@Post()
@ApiOperation({ summary: 'Create a new article' })
@ApiResponse({ status: 201, description: 'Article created successfully.' })
@ApiResponse({ status: 400, description: 'Validation failed.' })
@ApiResponse({ status: 401, description: 'Unauthorized.' })
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

// GET — single
@Get('detail/:id')
@ApiOperation({ summary: 'Get an article by ID' })
@ApiParam({ name: 'id', required: true, description: 'Article UUID' })
@ApiResponse({ status: 200, description: 'Article retrieved successfully.' })
@ApiResponse({ status: 404, description: 'Article not found.' })
async getArticle(...) { ... }

// GET — list with query params
@Get('list')
@ApiOperation({ summary: 'Get paginated list of articles' })
@ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
@ApiResponse({ status: 200, description: 'Article list retrieved.' })
async getArticles(...) { ... }

// PUT — update
@Put(':id')
@ApiOperation({ summary: 'Update an article' })
@ApiParam({ name: 'id', required: true, description: 'Article UUID' })
@ApiResponse({ status: 200, description: 'Article updated successfully.' })
@ApiResponse({ status: 404, description: 'Article not found.' })
async updateArticle(...) { ... }

// DELETE
@Delete(':id')
@ApiOperation({ summary: 'Delete an article' })
@ApiParam({ name: 'id', required: true, description: 'Article UUID' })
@ApiResponse({ status: 200, description: 'Article deleted successfully.' })
@ApiResponse({ status: 404, description: 'Article not found.' })
async deleteArticle(...) { ... }
```

---

## 5. DTO decorators

Every property in an input DTO **must** have either `@ApiProperty` or `@ApiPropertyOptional`.

### 5.1 Required property

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateArticleDto {
  @ApiProperty({ description: 'Title of the article', example: 'My first article' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({ description: 'Article body in markdown', example: '# Hello world' })
  @IsString()
  content: string;
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
  title?: string;

  @ApiPropertyOptional({ description: 'New content', example: '# Updated' })
  @IsOptional()
  @IsString()
  content?: string;
}
```

### 5.3 Nested DTO

```typescript
@ApiProperty({ type: () => AddressDto, description: 'Shipping address' })
address: AddressDto;
```

Use a lazy function (`() => AddressDto`) to avoid circular reference issues.

---

## 6. Response schema with MEP helpers

MEP uses `OK` / `CREATED` helpers which send custom JSON shapes via `@Res() res: Response`.
Because the response is sent manually, NestJS cannot auto-infer the response schema.
Document it explicitly:

```typescript
// Define a response schema class (place in dtos/ or a separate response-schemas/ folder)
import { ApiProperty } from '@nestjs/swagger';

class ArticleResponse {
  @ApiProperty({ example: 'b3d2e1f9-...' })
  id: string;

  @ApiProperty({ example: 'My first article' })
  title: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;
}

// Use in the controller method
@ApiResponse({ status: 200, description: 'Article retrieved.', type: ArticleResponse })
```

> Response schema classes are **not** domain entities and are never instantiated at runtime.
> Name them `<Entity>Response` and keep them in `dtos/` alongside input DTOs.

---

## 7. Pagination endpoints

Use `@ApiExtraModels` + `@ApiQuery` to document paginated list endpoints.

```typescript
import { ApiExtraModels, ApiQuery, ApiResponse, getSchemaPath } from '@nestjs/swagger';

class ArticleListResponse {
  @ApiProperty({ type: [ArticleResponse] })
  data: ArticleResponse[];

  @ApiProperty({ example: { page: 1, limit: 20, total: 100, totalPages: 5 } })
  meta: object;
}

@Get('list')
@ApiOperation({ summary: 'Get paginated list of articles' })
@ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
@ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
@ApiResponse({ status: 200, description: 'Article list retrieved.', type: ArticleListResponse })
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

## 8. Enums

```typescript
// Define enum in the module constants or a shared enums file
export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

// DTO usage
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class CreateArticleDto {
  @ApiProperty({
    enum: ArticleStatus,
    description: 'Publication status',
    example: ArticleStatus.DRAFT,
  })
  @IsEnum(ArticleStatus)
  status: ArticleStatus;
}
```

---

## 9. Auth — Bearer token

### Setup (already covered in §2)

`addBearerAuth` in `DocumentBuilder` + `@ApiBearerAuth('access-token')` on the controller class
is all that is required. The Swagger UI will then show an **Authorize** button.

### How to authenticate in the UI

1. Click **Authorize** in the top-right of the Swagger UI.
2. Enter the JWT access token (without the `Bearer ` prefix) in the **Value** field.
3. Click **Authorize**, then **Close**.
4. All subsequent requests will include the `Authorization: Bearer <token>` header.

---

## 10. Public routes

When a route has `@Public()`, it does not require auth. Reflect this in Swagger by overriding
the class-level `@ApiBearerAuth` with an empty security array at the method level:

```typescript
import { ApiSecurity } from '@nestjs/swagger';

@Public()
@Post('sign-up')
@ApiOperation({ summary: 'Register a new user' })
@ApiSecurity([])   // override class-level @ApiBearerAuth — no auth required
@ApiResponse({ status: 201, description: 'User registered.' })
async signUp(@Body() body: SignUpDto, ...) { ... }
```

---

## 11. Environment-based toggling

Swagger must **never** be exposed in production. The pattern shown in §2 (`NODE_ENV !== 'production'`)
is the minimum requirement. For more control use a dedicated env var:

```typescript
// .env
SWAGGER_ENABLED=true

// main.ts
if (process.env['SWAGGER_ENABLED'] === 'true') {
  const config = new DocumentBuilder()
    ...
    .build();
  SwaggerModule.setup('api/docs', app, document);
}
```

Bind `SWAGGER_ENABLED` to `false` in all production deployment configs (Docker Compose,
Kubernetes manifests, CI/CD pipelines).

---

## 12. Checklist

Before submitting a PR for any HTTP module, verify:

- [ ] `@nestjs/swagger` is in `dependencies` (not `devDependencies`)
- [ ] `DocumentBuilder` in `main.ts` sets title, description, version, and `addBearerAuth`
- [ ] Swagger setup is guarded by `NODE_ENV !== 'production'` (or `SWAGGER_ENABLED`)
- [ ] Every HTTP controller has `@ApiTags` and `@ApiBearerAuth('access-token')`
- [ ] Every controller method has `@ApiOperation` and at least one `@ApiResponse`
- [ ] Route parameters (`:id`) are documented with `@ApiParam`
- [ ] Query string parameters are documented with `@ApiQuery`
- [ ] Every DTO property has `@ApiProperty` or `@ApiPropertyOptional` with `description` and `example`
- [ ] Enum properties use `{ enum: MyEnum }` in `@ApiProperty`
- [ ] Public routes (`@Public()`) have `@ApiSecurity([])` to remove the lock icon
- [ ] Paginated endpoints document both the `data` array and `meta` object in `@ApiResponse`
- [ ] Response schema classes (`<Entity>Response`) exist for endpoints that return data
