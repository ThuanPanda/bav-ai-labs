# Repositories

> **CURRENT STANDARD — read this first.** Repositories live in the centralized
> **`libs/layer-data`** library, **not** inside feature modules. See
> [§0 Data layer (`libs/layer-data`)](#0-data-layer-libslayer-data) below. The per-module
> layout described in §§1–8 is **legacy** and kept only for reference while older modules are
> migrated.

## Table of contents

0. [Data layer (`libs/layer-data`) — current standard](#0-data-layer-libslayer-data)
1. [BaseRepository interface](#1-baserepository-interface)
2. [Repository interface (per module)](#2-repository-interface-per-module)
3. [Provider file](#3-provider-file)
4. [Repository implementation — Drizzle (BaseDrizzleRepository)](#4-repository-implementation--drizzle-basedrizzlerepository)
5. [Pagination with relations](#5-pagination-with-relations)
6. [Filtering on join tables (subquery pattern)](#6-filtering-on-join-tables-subquery-pattern)
7. [Overriding base methods](#7-overriding-base-methods)
8. [Transaction methods](#8-transaction-methods)
9. [Rules](#9-rules)

---

## 0. Data layer (`libs/layer-data`)

All repositories live in the standalone Nest library **`libs/layer-data`** (registered in
`nest-cli.json` and `tsconfig.json` as `@app/layer-data`). Feature modules **never** declare
repositories, interfaces, or providers locally — they import a per-domain `*DataModule` and
inject the repository token.

### Per-domain folder shape

```
libs/layer-data/src/<domain>/            ← e.g. events, contacts, quote-items
├── <entity>.interface.ts                ← I<Entity>Repository extends BaseRepositoryV2
├── <entity>.repository.ts               ← @Injectable() implements I<Entity>Repository
├── <entity>.provider.ts                 ← Symbol token + { provide, useExisting }
├── <domain>-data.module.ts              ← @Module providers:[Repo, Provider] exports:[TOKEN]
├── index.ts                             ← barrel (interface type, module, provider, types)
└── types/index.ts                       ← T* params/results types (may be empty)
```

A `shared/` folder provides the global `SharedDataModule` + `DrizzleTransactionService`
(`run(fn)` wraps `drizzle.transaction`) and exports the `DrizzleTx` type. The root
`libs/layer-data/src/index.ts` re-exports every domain.

### Interface — extends `BaseRepositoryV2`

```typescript
import type { EventInsert, EventModify, EventSelect } from '@app/database/types';
import type { BaseRepositoryV2 } from '@prowerbdigital/common';
import type { DrizzleTx } from '../shared';

export interface IEventRepository
  extends BaseRepositoryV2<EventSelect, EventInsert, EventModify, DrizzleTx> {
  // domain-specific methods only; base CRUD comes from BaseRepositoryV2.
  // Reads must NOT be transactional — override to drop the `tx` param:
  findById(id: string, options?: { select?: (keyof EventSelect)[] }): Promise<EventSelect | null>;
}
```

`BaseRepositoryV2<TSelect, TInsert, TWhereInput, TTx>` declares `create`, `createMany`,
`findById`, `findOne`, `findMany`, `update`, `updateById`, `delete`, `deleteById`, each with an
optional `tx?: TTx`. **Writes** pass the transaction via that `tx` argument (`create(data, tx)`).
**Reads never run in a transaction** — override `findById`/read methods to drop `tx`.

### Repository — `implements` the interface, no base class

```typescript
import * as schema from '@app/database/schemas';
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_PROVIDER } from '@prowerbdigital/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { IEventRepository } from './event.interface';

@Injectable()
export class EventRepository implements IEventRepository {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly drizzle: NodePgDatabase<typeof schema>,
  ) {}

  async create(entity: EventInsert, tx?: DrizzleTx): Promise<EventSelect | null> {
    const db = tx ?? this.drizzle;
    const [row] = await db.insert(schema.events).values(entity).returning();
    return row ?? null;
  }

  // Implement the methods the app actually uses; stub the rest of the
  // BaseRepositoryV2 surface so the class satisfies the interface:
  createMany(): Promise<EventSelect[] | null> {
    throw new Error('Method not implemented.');
  }
  // ...findOne, findMany, update, delete, deleteById → same stub
}
```

### Provider — `useExisting`

```typescript
export const EVENTS_REPOSITORY = Symbol('EVENTS_REPOSITORY');
export const EventRepositoryProvider: Provider = {
  provide: EVENTS_REPOSITORY,
  useExisting: EventRepository,
};
```

### Data module

```typescript
@Module({
  providers: [EventRepository, EventRepositoryProvider],
  exports: [EVENTS_REPOSITORY],
})
export class EventsDataModule {}
```

### Consuming from a feature module

```typescript
// <feature>.module.ts — import the data module(s); never declare repos locally.
@Module({ imports: [EventsDataModule, SharedDataModule], /* ... */ })
export class EventsModule {}

// handler / service — inject the token, type with the interface (both from @app/layer-data)
import { EVENTS_REPOSITORY, type IEventRepository } from '@app/layer-data';

constructor(
  @Inject(EVENTS_REPOSITORY) private readonly eventRepo: IEventRepository,
) {}
```

### Rules

1. Repositories, interfaces, providers, and data modules live **only** in `libs/layer-data` —
   never inside a feature module.
2. Repositories `implements I<Entity>Repository` and inject `DRIZZLE_PROVIDER` directly. **No base
   class** — implement used methods, stub the rest of the `BaseRepositoryV2` surface.
3. Providers bind with **`useExisting`** (the repository class is also a provider in the same
   `*DataModule`).
4. Writes receive the transaction through the inherited `tx?` parameter; **reads are never
   transactional** (override read methods to drop `tx`).
5. **No method name carries a `Tx` suffix.** The transaction is an optional parameter
   (`tx?: DrizzleTx`), not part of the method's identity — so it never belongs in the name.
   - **Writes** accept `tx?: DrizzleTx` as the last parameter and fall back to the default
     connection: `const db = tx ?? this.drizzle`. Pass a transaction when the caller is inside
     `txService.run(...)`; omit it otherwise. Name them `create` / `updateById` / `upsertPublished`
     — never `createTx` / `updateByIdTx` / `upsertPublishedTx`.
   - **Reads** (`findById`, `findActiveById`, `findByName`, `findOne`, `findMany`, …) take no
     `tx` at all and query `this.drizzle` directly.

   ```typescript
   // ✗ WRONG — transaction encoded in the name
   createTx(data: LocationInsert, tx: NodePgDatabase<typeof schema>): Promise<LocationSelect>;
   findByIdTx(id: string, tx: NodePgDatabase<typeof schema>): Promise<LocationSelect | null>;
   // ✓ RIGHT — write takes optional tx; read takes none
   create(data: LocationInsert, tx?: DrizzleTx): Promise<LocationSelect | null>;
   findById(id: string): Promise<LocationSelect | null>;
   ```
6. Feature modules import the per-domain `*DataModule`; handlers/services import the token +
   interface from `@app/layer-data`.

## 1. BaseRepository interface

Every module repository interface extends `BaseRepository` from `@prowerbdigital/common`:

```typescript
export interface BaseRepository<TSelect, TInsert, TModify> {
  create(entity: TInsert): Promise<TSelect | null>;
  findById(id: string): Promise<TSelect | null>;
  findAll(): Promise<TSelect[] | null>;
  update(entity: TModify): Promise<TSelect | null>;
  softDelete(entity: TModify): Promise<boolean | null>;
  hardDelete(id: string): Promise<boolean | null>;
}
```

---

## 2. Repository interface (per module)

Stored in `<module>/interfaces/<entity>.interface.ts`.
Add only domain-specific methods. Base CRUD comes from `BaseRepository`.

```typescript
// modules/users/interfaces/user.interface.ts
import type { BaseRepository } from '@prowerbdigital/common';
import type { SQL } from 'drizzle-orm';

import type { UserInsert, UserSelect } from 'apps/internal/src/db/types';
import type { AccessUsersQueryOptions, AccessUsersRepositoryResult } from '../types';

export type UserWithSentInvitations = UserSelect & {
  sentInvitations: (UserInvitationSelect & {
    role: Pick<RoleSelect, 'name'>;
  })[];
};

export interface IUserRepository extends BaseRepository<UserSelect, UserInsert, SQL<unknown>> {
  findByEmail(email: string): Promise<UserSelect | null>;
  findByIdWithSentInvitations(id: string): Promise<UserWithSentInvitations | null>;
  findAccessUsers(props: AccessUsersQueryOptions): Promise<AccessUsersRepositoryResult>;
}
```

---

## 3. Provider file

Stored in `<module>/providers/<entity>.provider.ts`.

```typescript
// modules/users/providers/user.provider.ts
import { Provider } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';

export const USER_REPOSITORY = 'USER_REPOSITORY';

export const UserRepositoryProvider: Provider = {
  provide: USER_REPOSITORY,
  useClass: UserRepository,
};
```

Token names follow the pattern `<ENTITY>_REPOSITORY` in SCREAMING_SNAKE_CASE.

---

## 4. Repository implementation — Drizzle (BaseDrizzleRepository)

All Drizzle repositories **extend `BaseDrizzleRepository`** instead of implementing the interface directly. `BaseDrizzleRepository` provides `create`, `findById`, `findOne`, `findMany`, `findPagination`, `update`, `delete` out of the box.

**Generic parameters:**
- `TTable` — Drizzle `PgTableWithColumns` for this entity (e.g. `typeof schema.users`)
- `TSelect` — row type returned by SELECT (`InferSelectModel`)
- `TInsert` — row type used for INSERT (`InferInsertModel`)
- `TWith` — strongly-typed `with` clause, derived via `RelationalWith`

**Constructor:** pass `db`, the table reference, and the schema key string (e.g. `'users'`). The schema key enables the relational API (`include` option).

```typescript
// modules/users/repositories/user.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from 'apps/internal/src/db/schemas';
import type { UserInsert, UserSelect } from 'apps/internal/src/db/types';
import { DRIZZLE_PROVIDER } from 'apps/internal/src/modules/drizzle';
import { BaseDrizzleRepository, RelationalWith } from 'apps/internal/src/modules/drizzle/drizzle.repository';

import type { IUserRepository, UserWithSentInvitations } from '../interfaces';

type UsersWith = RelationalWith<NodePgDatabase<typeof schema>, 'users'>;

@Injectable()
export class UserRepository
  extends BaseDrizzleRepository<typeof schema.users, UserSelect, UserInsert, UsersWith>
  implements IUserRepository
{
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    db: NodePgDatabase<typeof schema>,
  ) {
    super(db, schema.users, 'users');
  }

  async findByEmail(email: string): Promise<UserSelect | null> {
    return this.findOne({ where: eq(schema.users.email, email) });
  }

  async findByIdWithSentInvitations(id: string): Promise<UserWithSentInvitations | null> {
    return this.findById(id, {
      include: {
        sentInvitations: {
          with: { role: { columns: { name: true } } },
        },
      },
    }) as Promise<UserWithSentInvitations | null>;
  }
}
```

**Available base methods (no need to re-implement):**

| Method | Signature |
|--------|-----------|
| `create` | `(data: TInsert) => Promise<TSelect>` |
| `createMany` | `(data: TInsert[]) => Promise<TSelect[]>` |
| `findById` | `(id, options?) => Promise<TSelect \| null>` |
| `findOne` | `(options) => Promise<TSelect \| null>` |
| `findMany` | `(options?) => Promise<TSelect[]>` |
| `findPagination` | `(props, options?) => Promise<OffsetResult<TSelect>>` |
| `update` | `(data, where) => Promise<TSelect \| null>` |
| `delete` | `(where) => Promise<boolean>` |

---

## 5. Pagination with relations

Use `findPagination` with the `include` option to load related data. The `include` option uses Drizzle's relational API — type-safe via `RelationalWith`.

The `where` clause applies to **both** the data query and the count query, so pagination totals are always correct.

```typescript
const result = await this.findPagination(
  { page, limit },
  {
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: desc(schema.users.createdAt),
    include: {
      roles: {
        with: { role: { columns: { id: true, name: true } } },
      },
    },
  },
);

return { data: result.data as unknown as UserWithRoles[], pagination: result.pagination };
```

`result.pagination` shape:
```typescript
{
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
```

---

## 6. Filtering on join tables (subquery pattern)

**Do not** filter on join-table columns using in-memory filtering after `findPagination` — this breaks the count and produces incorrect pagination totals.

Instead, build a **subquery** and add it as an `inArray` condition in `where`:

```typescript
// Filter users by roleId via the rel_u2r join table
if (props.roleId) {
  const subquery = this.db
    .select({ userId: schema.u2r.userId })
    .from(schema.u2r)
    .where(eq(schema.u2r.roleId, props.roleId));
  conditions.push(inArray(schema.users.id, subquery));
}
```

This ensures the count query also scopes to only users with that role.

---

## 7. Overriding base methods

Override a base method when the entity needs extra logic on top of the default behaviour (e.g. auto-setting `updatedAt`):

```typescript
override async update(
  data: Partial<UserInsert>,
  where: SQL<unknown>,
): Promise<UserSelect | null> {
  return super.update({ ...data, updatedAt: new Date() }, where);
}
```

Always call `super.<method>()` — do not re-implement the DB logic.

---

## 8. Transactional writes

When a Service needs to run multiple writes atomically, the write methods accept an **optional
`tx` parameter** — never a separate `*Tx` method. The transaction is a parameter, not part of the
method name (see [§0 rule 5](#0-data-layer-libslayer-data)). Each write falls back to the default
connection with `const db = tx ?? this.drizzle`, so the same method works inside or outside a
transaction.

```typescript
// In IUserRepository — base CRUD already declares `create(entity, tx?)`; only redeclare a method
// here when it needs a custom signature. Custom writes follow the same `tx?` shape:
import type { DrizzleTx } from '../shared';

upsertByEmail(entity: UserInsert, tx?: DrizzleTx): Promise<UserSelect | null>;
```

```typescript
// In UserRepository
async create(entity: UserInsert, tx?: DrizzleTx): Promise<UserSelect | null> {
  const db = tx ?? this.drizzle;
  const [row] = await db.insert(schema.users).values(entity).returning();
  return row ?? null;
}
```

Usage in a Service:
```typescript
await this.txService.run(async (tx) => {
  await this.userRepo.create(userData, tx);
  await this.roleRepo.create(roleData, tx);
});
```

---

## 9. Rules

1. Repositories communicate **only** with the database. No HTTP calls, no queue publishes, no business logic.
2. All Drizzle repositories extend `BaseDrizzleRepository` — never implement `IEntityRepository` directly without extending the base class.
3. Inject the DB client via `@Inject(DRIZZLE_PROVIDER)`, pass it to `super()` — never store it as `private readonly` in the subclass.
4. Never inject a Repository class directly into a handler or service — always use the provider token string: `@Inject(USER_REPOSITORY)`.
5. Never filter on joined relation data in-memory after `findPagination` — use the subquery pattern so the count is correct.
6. Unimplemented base interface methods must throw `new Error('Method not implemented.')`.
7. **Every `find*` call (`findOne`, `findById`, `findMany`, `findPagination`) MUST pass a `select` array** listing only the columns the caller actually needs. Omitting `select` (which would fetch all columns) is forbidden — it wastes bandwidth and leaks sensitive fields.
