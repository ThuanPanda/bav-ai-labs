# Drizzle Schema Conventions

> The schema lives in **`libs/database/src`** (`@app/database`): tables in `schemas/*.table.ts`,
> `pgEnum`s in `schemas/_enums.ts`, relations in `schemas/_relations.table.ts`, and derived
> TypeScript types in `types/*.types.ts`. Consumers import from `@app/database` /
> `@app/database/schemas` / `@app/database/types`.

## Table of contents

1. [Table naming](#1-table-naming)
2. [Column aliases](#2-column-aliases)
3. [Type choices](#3-type-choices)
4. [Foreign keys](#4-foreign-keys)
5. [Relations](#5-relations)
6. [JSONB columns](#6-jsonb-columns)
7. [Enums](#7-enums)

---

## 1. Table naming

Format: `{prefix}_{plural_snake_case}`

- Regular tables use the **service prefix**: `etr_events`, `etr_quotes`, `etr_contacts`, `etr_locations`, `etr_files`, `etr_tickets`, `etr_rentals`, `etr_quote_items`, `etr_quote_addresses`, `etr_event_types`
- Junction/relation tables (many-to-many) use `rel_` prefix: `rel_event_contacts`
- Index and constraint names must also use the table name as prefix: `etr_events_title_idx`, `etr_contacts_user_id_email_key`

---

## 2. Column aliases

DB column aliases (the string argument to `varchar()`, `timestamp()`, etc.) must be **snake_case**, even though the TypeScript property name stays camelCase.

```ts
// correct
userId: varchar('user_id', { length: 36 }).notNull(),
adminContactEmail: varchar('admin_contact_email', { length: 255 }),

// wrong
userId: varchar('userId', { length: 36 }).notNull(),
```

---

## 3. Type choices

Prefer `varchar({ length })` over `text()` for bounded strings. Use `text()` only for truly unbounded content: descriptions, notes, comments, overview, metadata.

Length guidelines:

| Data                                         | Type                    |
| -------------------------------------------- | ----------------------- |
| IDs / foreign keys                           | `varchar(36)`           |
| Email                                        | `varchar(255)`          |
| Phone                                        | `varchar(30)`           |
| Country / currency code                      | `varchar(10)`           |
| Names, city, state, role, job title          | `varchar(100)`          |
| Street / address line                        | `varchar(150)`          |
| Full address / title                         | `varchar(255)`          |
| File paths, S3 keys, URLs                    | `varchar(500)`          |
| Short codes (SKU, warehouse, discount, ship) | `varchar(50)`           |
| Postal code                                  | `varchar(20)`           |
| Array items (partnershipTypes, audience…)    | `varchar(100).array()`  |
| Unbounded prose                              | `text()`                |

---

## 4. Foreign keys

### Intra-service FK (both tables in the same service)

Add `.references(() => targetTable.id)` on the column definition. This creates a real DB-level constraint.

```ts
// tables in the same service → use .references()
eventTypeId: varchar('event_type_id', { length: 36 }).references(() => eventTypes.id),
locationId: varchar('location_id', { length: 36 }).references(() => locations.id),
quoteId: varchar('quote_id', { length: 36 }).notNull().references(() => quotes.id),
```

### Cross-service FK (target table lives in another service/database)

Declare as a plain `varchar` — **no `.references()`**. DB-level FK constraints cannot span database boundaries, and enforcing them would break microservice independence and eventual consistency.

```ts
// cross-service → plain varchar, no .references()
userId: varchar('user_id', { length: 36 }).notNull(),
boardId: varchar('board_id', { length: 36 }),
```

---

## 5. Relations

Define all relations (both intra- and cross-service) in `_relations.table.ts` using Drizzle's `relations()` helper. This provides type-safe `with:` queries in ORM code and is independent of DB-level constraints.

```ts
// _relations.table.ts
export const eventsRelations = relations(events, ({ one, many }) => ({
  eventType: one(eventTypes, {
    fields: [events.eventTypeId],
    references: [eventTypes.id],
  }),
  quotes: many(quotes),
}));
```

Keep `_relations.table.ts` regardless of whether `.references()` is present on the column.

---

## 6. JSONB columns

Every `jsonb()` column **must** be accompanied by `.$type<T>()` to preserve type-safety. Never leave a `jsonb()` column untyped.

```ts
// correct
adminContact: jsonb('admin_contact').$type<AdminContact>(),
location: jsonb('location').$type<Location>(),
schedule: jsonb('schedule').$type<EventSchedule>(),

// wrong — loses all type information
adminContact: jsonb('admin_contact'),
```

Define the TypeScript types for JSONB shapes in `libs/database/src/types/jsonb.types.ts` and import them into the table file.

```ts
import type { AdminContact, Location } from '../types/jsonb.types';
```

---

## 7. Enums

`_enums.ts` holds **only** the `pgEnum` constants (the runtime values). Never declare
`export type` aliases in `_enums.ts`.

The derived TypeScript union types (`(typeof XxxEnum.enumValues)[number]`) must live in the
dedicated `libs/database/src/types/enum.types.ts` file, which imports the `pgEnum` constants from
`../schemas/_enums` and re-exports the union types through `libs/database/src/types/index.ts`.

```ts
// schemas/_enums.ts — pgEnum constants only
export const EventStatusEnum = pgEnum('EventStatus', ['ACTIVE', 'DRAFT', 'DELETED', 'ALL']);

// types/enum.types.ts — derived union types only
import type { EventStatusEnum } from '../schemas/_enums';

export type EventStatus = (typeof EventStatusEnum.enumValues)[number];
```
