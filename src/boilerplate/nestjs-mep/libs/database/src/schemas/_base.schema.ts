import { randomUUID } from 'node:crypto';
import { timestamp, varchar } from 'drizzle-orm/pg-core';

/**
 * Shared columns every table gets: uuid `id`, audit timestamps, a nullable `deletedAt`
 * for soft deletes, and `createdBy` (id of the acting user).
 */
export const baseSchema = {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
  deletedAt: timestamp('deleted_at'),
  createdBy: varchar('created_by', { length: 36 }),
};
