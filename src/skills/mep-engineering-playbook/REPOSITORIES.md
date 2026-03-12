# Repositories

## Table of contents

1. [BaseRepository interface](#1-baserepository-interface)
2. [Repository interface (per module)](#2-repository-interface-per-module)
3. [Provider file](#3-provider-file)
4. [Repository implementation — Drizzle](#4-repository-implementation--drizzle)
5. [Repository implementation — Prisma](#5-repository-implementation--prisma)
6. [Pagination pattern](#6-pagination-pattern)
7. [Transaction methods](#7-transaction-methods)
8. [Rules](#8-rules)

---

## 1. BaseRepository interface

Every module repository interface extends `BaseRepository` from `common/`:

```typescript
// common/class/base-repository.ts
export interface BaseRepository<TSelect, TInsert, TModify> {
  create(entity: TInsert): Promise<TSelect | null>;
  findById(id: string): Promise<TSelect | null>;
  findAll(): Promise<TSelect[] | null>;
  update(entity: TModify): Promise<TSelect | null>;
  softDelete(entity: TModify): Promise<boolean | null>;
  hardDelete(id: string): Promise<boolean | null>;
}
```

`TSelect` — the full DB row type (output).
`TInsert` — the insert type (input for `create`).
`TModify` — the update type (input for `update` / soft-delete); always includes `id`.

---

## 2. Repository interface (per module)

Stored in `<module>/interfaces/<entity>.interface.ts`.

```typescript
// modules/article/interfaces/article.interface.ts
import { BaseRepository, OffsetPagination, OffsetResult } from '../../../common';
import { ArticleInsert, ArticleModify, ArticleSelect } from '../../../db';

/**
 * @description Repository contract for the Article entity.
 * @type {Repository}
 */
export interface IArticleRepository extends BaseRepository<
  ArticleSelect,
  ArticleInsert,
  ArticleModify
> {
  findBySlug(slug: string): Promise<ArticleSelect | null>;
  findWithOffset(props: OffsetPagination): Promise<OffsetResult<ArticleSelect>>;
}
```

Add **only** domain-specific methods here. The six base methods come from `BaseRepository`.

---

## 3. Provider file

Stored in `<module>/providers/<entity>.provider.ts`.

```typescript
// modules/article/providers/article.provider.ts
import { Provider } from '@nestjs/common';

import { ArticleRepository } from '../repositories/article.repository';

/** Injection token for the article repository. */
export const ARTICLE_REPOSITORY = 'ARTICLE_REPOSITORY';

/** NestJS provider object that binds the token to the implementation class. */
export const ArticleRepositoryProvider: Provider = {
  provide: ARTICLE_REPOSITORY,
  useClass: ArticleRepository,
};
```

Token names follow the pattern `<ENTITY>_REPOSITORY` in SCREAMING_SNAKE_CASE.

---

## 4. Repository implementation — Drizzle

```typescript
// modules/article/repositories/article.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { OffsetPagination, OffsetResult, queryBuilder } from '../../../common';
import { DRIZZLE_PROVIDER } from '../../../core';
import { ArticleField, ArticleInsert, ArticleModify, ArticleSelect } from '../../../db';
import * as schema from '../../../db/schemas';
import { IArticleRepository } from '../interfaces/article.interface';

/**
 * @description Drizzle ORM implementation of IArticleRepository.
 * @type {Repository}
 */
@Injectable()
export class ArticleRepository implements IArticleRepository {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly drizzle: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * @description Creates a new article record.
   * @param {ArticleInsert} entity - Data to insert.
   * @returns {Promise<ArticleSelect>} The created record.
   */
  async create(entity: ArticleInsert): Promise<ArticleSelect> {
    const [row] = await this.drizzle.insert(schema.articles).values(entity).returning();
    return row;
  }

  /**
   * @description Finds an article by its primary key.
   * @param {string} id
   * @returns {Promise<ArticleSelect | null>}
   */
  async findById(id: string): Promise<ArticleSelect | null> {
    return (
      (await this.drizzle.query.articles.findFirst({
        where: eq(schema.articles.id, id),
      })) ?? null
    );
  }

  /**
   * @description Finds an article by its slug.
   * @param {string} slug
   * @returns {Promise<ArticleSelect | null>}
   */
  async findBySlug(slug: string): Promise<ArticleSelect | null> {
    return (
      (await this.drizzle.query.articles.findFirst({
        where: eq(schema.articles.slug, slug),
      })) ?? null
    );
  }

  /**
   * @description Returns all articles. Implement when needed.
   * @returns {Promise<ArticleSelect[]>}
   */
  findAll(): Promise<ArticleSelect[] | null> {
    throw new Error('Method not implemented.');
  }

  /**
   * @description Updates an article record.
   * @param {ArticleModify} entity - Must include `id`.
   * @returns {Promise<ArticleSelect | null>}
   */
  async update(entity: ArticleModify): Promise<ArticleSelect | null> {
    const [row] = await this.drizzle
      .update(schema.articles)
      .set({ ...entity })
      .where(eq(schema.articles.id, entity.id))
      .returning();
    return row ?? null;
  }

  /**
   * @description Soft-deletes an article. Implement when needed.
   */
  softDelete(entity: ArticleModify): Promise<boolean | null> {
    throw new Error('Method not implemented.');
  }

  /**
   * @description Permanently deletes an article by ID.
   * @param {string} id
   * @returns {Promise<boolean>} `true` if a row was deleted.
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await this.drizzle.delete(schema.articles).where(eq(schema.articles.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * @description Retrieves a paginated list of articles.
   * @param {OffsetPagination} props - Pagination, sort, filter, search parameters.
   * @returns {Promise<OffsetResult<ArticleSelect>>}
   */
  async findWithOffset(props: OffsetPagination): Promise<OffsetResult<ArticleSelect>> {
    const { where, orderBy } = queryBuilder(props, schema.articles, {
      sortableFields: ['createdAt', 'title'] satisfies ArticleField[],
      filterableFields: ['status'] satisfies ArticleField[],
      searchableFields: ['title', 'body'] satisfies ArticleField[],
    });

    const page = props.page ?? 1;
    const limit = props.limit ?? 10;
    const offset = (page - 1) * limit;

    const [data, [countResult]] = await Promise.all([
      this.drizzle
        .select()
        .from(schema.articles)
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      this.drizzle
        .select({ count: sql<number>`count(*)` })
        .from(schema.articles)
        .where(where),
    ]);

    const total = Number(countResult?.count ?? 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
```

---

## 5. Repository implementation — Prisma

The interface and provider files are identical. Only the implementation differs.

```typescript
// modules/article/repositories/article.repository.ts  (Prisma variant)
import { Inject, Injectable } from '@nestjs/common';

import { OffsetPagination, OffsetResult } from '../../../common';
import { PRISMA_PROVIDER } from '../../../core';
import { ArticleInsert, ArticleModify, ArticleSelect } from '../../../db';
import { PrismaService } from '../../../core/database/prisma.service';
import { IArticleRepository } from '../interfaces/article.interface';

/**
 * @description Prisma implementation of IArticleRepository.
 * @type {Repository}
 */
@Injectable()
export class ArticleRepository implements IArticleRepository {
  constructor(
    @Inject(PRISMA_PROVIDER)
    private readonly prisma: PrismaService,
  ) {}

  async create(entity: ArticleInsert): Promise<ArticleSelect> {
    return this.prisma.article.create({ data: entity });
  }

  async findById(id: string): Promise<ArticleSelect | null> {
    return this.prisma.article.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<ArticleSelect | null> {
    return this.prisma.article.findUnique({ where: { slug } });
  }

  findAll(): Promise<ArticleSelect[] | null> {
    throw new Error('Method not implemented.');
  }

  async update(entity: ArticleModify): Promise<ArticleSelect | null> {
    return this.prisma.article.update({
      where: { id: entity.id },
      data: entity,
    });
  }

  softDelete(entity: ArticleModify): Promise<boolean | null> {
    throw new Error('Method not implemented.');
  }

  async hardDelete(id: string): Promise<boolean> {
    await this.prisma.article.delete({ where: { id } });
    return true;
  }

  async findWithOffset(props: OffsetPagination): Promise<OffsetResult<ArticleSelect>> {
    const page = props.page ?? 1;
    const limit = props.limit ?? 10;
    const skip = (page - 1) * limit;

    // Build where / orderBy from props as needed for the project's Prisma helpers
    const [data, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({ skip, take: limit }),
      this.prisma.article.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
```

---

## 6. Pagination pattern

### Interfaces (from `common/`)

```typescript
export interface OffsetPagination {
  page?: number;
  limit?: number;
  sort?: string;
  filter?: string;
  search?: string;
}

export interface OffsetResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
```

### `queryBuilder` helper (Drizzle only)

```typescript
const { where, orderBy } = queryBuilder(paginationProps, schema.tableName, {
  sortableFields: ['createdAt', 'name'] satisfies EntityField[],
  filterableFields: ['status'] satisfies EntityField[],
  searchableFields: ['name', 'description'] satisfies EntityField[],
});
```

`satisfies EntityField[]` enforces that only valid column names are listed.
Pass the resulting `where` and `orderBy` to the Drizzle query.

---

## 7. Transaction methods

When a Service needs to run multiple writes atomically it passes a `tx` (transaction client)
into the repository. Add `createTx` / `updateTx` methods to the interface and implementation
only when transactions are actually needed by that entity.

```typescript
// In IArticleRepository
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../db/schemas';

createTx(
  entity: ArticleInsert,
  tx: NodePgDatabase<typeof schema>,
): Promise<ArticleSelect | null>;
```

```typescript
// In ArticleRepository
async createTx(
  entity: ArticleInsert,
  tx: NodePgDatabase<typeof schema>,
): Promise<ArticleSelect | null> {
  const [row] = await tx
    .insert(schema.articles)
    .values(entity)
    .returning();
  return row ?? null;
}
```

Usage in a Service:

```typescript
await this.drizzle.transaction(async (tx) => {
  await this.articleRepo.createTx(articleData, tx);
  await this.tagRepo.createTx(tagData, tx);
});
```

---

## 8. Rules

1. Repositories communicate **only** with the database. No HTTP calls, no queue publishes,
   no business logic.
2. Inject the ORM client via `@Inject(DRIZZLE_PROVIDER)` (or `PRISMA_PROVIDER`), never
   instantiate it directly.
3. Never inject a Repository class directly into a handler or service — always use the
   provider token string: `@Inject(ARTICLE_REPOSITORY)`.
4. Unimplemented base methods must throw `new Error('Method not implemented.')` — not
   silently return `null`.
5. Pagination meta must always include all six fields: `page`, `limit`, `total`,
   `totalPages`, `hasNextPage`, `hasPrevPage`.
