import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

import type { users } from '../schemas/users.table';

export type UserSelect = InferSelectModel<typeof users>;
export type UserInsert = InferInsertModel<typeof users>;
export type UserModify = Partial<Omit<UserInsert, 'id'>> & { id: string };
