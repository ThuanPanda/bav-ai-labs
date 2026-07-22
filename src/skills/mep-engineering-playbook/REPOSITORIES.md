# Repositories — `libs/layer-data`

> **Single standard.** All repositories live in the centralized **`libs/layer-data`** library
> (`@app/layer-data`), **never** inside a feature module. Repositories `implements` their interface
> and inject `DRIZZLE_PROVIDER` directly — there is **no** `BaseDrizzleRepository` base class in this
> project. (Interfaces extend the type-only `BaseRepositoryV2` from `@prowerbdigital/common`.)

## Table of contents

1. [Data layer (`libs/layer-data`)](#1-data-layer-libslayer-data)
2. [Interface — extends `BaseRepositoryV2`](#2-interface--extends-baserepositoryv2)
3. [Repository — `implements` the interface](#3-repository--implements-the-interface)
4. [Provider — `useExisting`](#4-provider--useexisting)
5. [Data module](#5-data-module)
6. [Consuming from a feature module](#6-consuming-from-a-feature-module)
7. [Pagination](#7-pagination)
8. [Filtering on join tables (subquery pattern)](#8-filtering-on-join-tables-subquery-pattern)
9. [Transactions](#9-transactions)
10. [Rules](#10-rules)

---

## 1. Data layer (`libs/layer-data`)

Registered in `nest-cli.json` and `tsconfig.json` as `@app/layer-data`. Feature modules **never**
declare repositories, interfaces, or providers locally — they import a per-domain `*DataModule` and
inject the repository token.

### Per-domain folder shape

```
libs/layer-data/src/<domain>/            ← e.g. events, contacts, quote-items, event-tasks
├── <entity>.interface.ts                ← I<Entity>Repository extends BaseRepositoryV2
├── <entity>.repository.ts               ← @Injectable() implements I<Entity>Repository
├── <entity>.provider.ts                 ← Symbol token + { provide, useExisting }
├── <domain>-data.module.ts              ← @Module providers:[Repo, Provider] exports:[TOKEN]
├── index.ts                             ← barrel (interface type, module, provider, types)
└── types/index.ts                       ← T* params/results types (may be empty)
```

A `shared/` folder provides the global `SharedDataModule` + `DrizzleTransactionService`
(`run(fn)` wraps `drizzle.transaction`) and exports the `DrizzleTx` type. The root
`libs/layer-data/src/index.ts` re-exports every domain, so consumers import everything from
`@app/layer-data`.

---

## 2. Interface — extends `BaseRepositoryV2`

`BaseRepositoryV2<TSelect, TInsert, TWhereInput, TTx>` (type-only, from `@prowerbdigital/common`)
declares `create`, `createMany`, `findById`, `findOne`, `findMany`, `update`, `updateById`,
`delete`, `deleteById`, each with an optional `tx?: TTx`. Add only domain-specific methods.

```typescript
import type { EventInsert, EventModify, EventSelect } from '@app/database/types';
import type { BaseRepositoryV2 } from '@prowerbdigital/common';
import type { DrizzleTx } from '../shared';

export interface IEventRepository
  extends BaseRepositoryV2<EventSelect, EventInsert, EventModify, DrizzleTx> {
  // Reads must NOT be transactional — override to drop the `tx` param:
  findById(id: string, options?: { select?: (keyof EventSelect)[] }): Promise<EventSelect | null>;
}
```

**Writes** pass the transaction via the optional `tx` argument (`create(data, tx)`).
**Reads never run in a transaction** — override read methods to drop `tx`.

---

## 3. Repository — `implements` the interface

Implement only the methods the app actually uses; stub the rest of the `BaseRepositoryV2` surface
so the class still satisfies the interface. Inject `DRIZZLE_PROVIDER` and store it as
`private readonly drizzle`.

```typescript
import * as schema from '@app/database/schemas';
import type { EventTaskInsert, EventTaskSelect } from '@app/database/types';
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_PROVIDER, type OffsetResult } from '@prowerbdigital/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type { DrizzleTx } from '../shared';
import type { IEventTaskRepository } from './event-task.interface';

@Injectable()
export class EventTaskRepository implements IEventTaskRepository {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly drizzle: NodePgDatabase<typeof schema>,
  ) {}

  async create(entity: EventTaskInsert, tx?: DrizzleTx): Promise<EventTaskSelect | null> {
    const db = tx ?? this.drizzle;
    const [row] = await db.insert(schema.eventTasks).values(entity).returning();
    return row ?? null;
  }

  async findById(id: string): Promise<EventTaskSelect | null> {
    const [row] = await this.drizzle
      .select()
      .from(schema.eventTasks)
      .where(eq(schema.eventTasks.id, id))
      .limit(1);
    return row ?? null;
  }

  // ── BaseRepositoryV2 surface not implemented yet — stub the rest ──
  createMany(): Promise<EventTaskSelect[] | null> {
    throw new Error('Method not implemented.');
  }
  findOne(): Promise<EventTaskSelect | null> {
    throw new Error('Method not implemented.');
  }
  // ...findMany, update, updateById, delete → same stub
}
```

---

## 4. Provider — `useExisting`

The token is a `Symbol`; the provider binds it to the repository class already registered in the
same `*DataModule` via **`useExisting`**.

```typescript
export const EVENT_TASKS_REPOSITORY = Symbol('EVENT_TASKS_REPOSITORY');
export const EventTaskRepositoryProvider: Provider = {
  provide: EVENT_TASKS_REPOSITORY,
  useExisting: EventTaskRepository,
};
```

---

## 5. Data module

```typescript
@Module({
  providers: [EventTaskRepository, EventTaskRepositoryProvider],
  exports: [EVENT_TASKS_REPOSITORY],
})
export class EventTasksDataModule {}
```

---

## 6. Consuming from a feature module

```typescript
// <feature>.module.ts — import the data module(s); never declare repos locally.
@Module({ imports: [EventTasksDataModule, EventsDataModule] /* ... */ })
export class EventTasksModule {}

// handler / service — inject the token, type with the interface (both from @app/layer-data)
import { EVENT_TASKS_REPOSITORY, type IEventTaskRepository } from '@app/layer-data';

constructor(
  @Inject(EVENT_TASKS_REPOSITORY) private readonly taskRepo: IEventTaskRepository,
) {}
```

---

## 7. Pagination

A paginated read is a domain-specific method (commonly `findPaginated`) that returns
`OffsetResult<T>` from `@prowerbdigital/common`:

```typescript
{
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
```

Run the data query and the `count(*)` query with the **same** `where` clause (in `Promise.all`) so
the total always matches the filtered rows. Compute `total` from `count(*)::int` and derive
`totalPages` / `hasNextPage` / `hasPrevPage`. The `where` is built by a private
`buildFilterConditions(params)` that returns `and(...conditions) | undefined`.

---

## 8. Filtering on join tables (subquery pattern)

**Do not** filter on join-table columns by post-filtering the paginated array — that breaks the
count and produces wrong totals. Build a subquery and add it as an `inArray` condition in `where`,
so the count query scopes correctly too:

```typescript
if (props.roleId) {
  const subquery = this.drizzle
    .select({ userId: schema.u2r.userId })
    .from(schema.u2r)
    .where(eq(schema.u2r.roleId, props.roleId));
  conditions.push(inArray(schema.users.id, subquery));
}
```

---

## 9. Transactions

Multi-write atomicity uses the shared `DrizzleTransactionService` (`SharedDataModule`). Its `run(fn)`
opens a `drizzle.transaction` and passes the `tx` down; each write falls back to the default
connection with `const db = tx ?? this.drizzle`, so the same method works inside or outside a
transaction. **No method name carries a `Tx` suffix** — the transaction is an optional parameter,
not part of the method's identity.

```typescript
await this.txService.run(async (tx) => {
  await this.userRepo.create(userData, tx);
  await this.roleRepo.create(roleData, tx);
});
```

```typescript
// ✗ WRONG — transaction encoded in the name
createTx(data: LocationInsert, tx: DrizzleTx): Promise<LocationSelect>;
// ✓ RIGHT — write takes optional tx; read takes none
create(data: LocationInsert, tx?: DrizzleTx): Promise<LocationSelect | null>;
findById(id: string): Promise<LocationSelect | null>;
```

---

## 10. Rules

1. Repositories, interfaces, providers, and data modules live **only** in `libs/layer-data` — never
   inside a feature module.
2. Repositories `implements I<Entity>Repository` and inject `DRIZZLE_PROVIDER` directly. **No base
   class** — implement used methods, stub the rest of the `BaseRepositoryV2` surface with
   `throw new Error('Method not implemented.')`.
3. Providers bind with **`useExisting`** (the repository class is also a provider in the same
   `*DataModule`); the token is a `Symbol`.
4. Writes accept `tx?: DrizzleTx` as the last parameter and fall back with `const db = tx ?? this.drizzle`;
   **reads are never transactional** (override read methods to drop `tx`). No `*Tx` method names.
5. Repositories communicate **only** with the database — no HTTP calls, queue publishes, or business
   logic. Business rules belong in the handler (or a shared Service).
6. Never inject a repository class directly — always the provider token: `@Inject(EVENT_TASKS_REPOSITORY)`,
   typed with the interface `IEventTaskRepository`.
7. Never post-filter a paginated result on joined data in memory — use the subquery pattern (§8).
8. Prefer a projected `select` (only the columns the caller needs) for list/detail reads that feed a
   response DTO — it saves bandwidth and avoids leaking sensitive columns. A bare `select()` is
   acceptable for simple existence/`findById` lookups.
