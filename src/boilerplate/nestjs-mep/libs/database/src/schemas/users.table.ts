import { pgTable, varchar } from 'drizzle-orm/pg-core';

import { baseSchema } from './_base.schema';

export const users = pgTable('users', {
  ...baseSchema,
  name: varchar('name', { length: 255 }).notNull(),
  avatar: varchar('avatar', { length: 1024 }),
});
