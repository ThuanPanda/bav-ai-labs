import * as schema from '@app/database/schemas';
import type { UserInsert, UserSelect } from '@app/database/types';
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_PROVIDER, type OffsetPagination, type OffsetResult } from '@prowerbdigital/common';
import { type SQL, and, asc, eq, ilike, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type { DrizzleTx } from '../shared';
import type { IUserRepository } from './user.interface';

/** Drizzle implementation of {@link IUserRepository}. Talks to the DB only. */
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly drizzle: NodePgDatabase<typeof schema>,
  ) {}

  async findById(
    id: string,
    _options?: { select?: (keyof UserSelect)[] },
  ): Promise<UserSelect | null> {
    const [row] = await this.drizzle
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return row ?? null;
  }

  async findPaginated(params: OffsetPagination): Promise<OffsetResult<UserSelect>> {
    const { page = 1, limit = 10, search } = params;
    const conditions: SQL[] = [];
    if (search) conditions.push(ilike(schema.users.name, `%${search}%`));
    const where = conditions.length ? and(...conditions) : undefined;
    const offset = (page - 1) * limit;

    const [data, [countRow]] = await Promise.all([
      this.drizzle
        .select()
        .from(schema.users)
        .where(where)
        .orderBy(asc(schema.users.name))
        .limit(limit)
        .offset(offset),
      this.drizzle.select({ count: sql<number>`count(*)::int` }).from(schema.users).where(where),
    ]);

    const total = countRow?.count ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async create(data: UserInsert, tx?: DrizzleTx): Promise<UserSelect | null> {
    const db = tx ?? this.drizzle;
    const [row] = await db.insert(schema.users).values(data).returning();
    return row ?? null;
  }

  async updateById(
    id: string,
    data: Partial<UserInsert>,
    tx?: DrizzleTx,
  ): Promise<UserSelect | null> {
    const db = tx ?? this.drizzle;
    const [row] = await db
      .update(schema.users)
      .set(data)
      .where(eq(schema.users.id, id))
      .returning();
    return row ?? null;
  }

  async deleteById(id: string, tx?: DrizzleTx): Promise<boolean> {
    const db = tx ?? this.drizzle;
    const result = await db
      .delete(schema.users)
      .where(eq(schema.users.id, id))
      .returning({ id: schema.users.id });
    return result.length > 0;
  }

  // ── BaseRepositoryV2 surface not used by this module ────────────────────────
  createMany(): Promise<UserSelect[] | null> {
    throw new Error('Method not implemented.');
  }
  findOne(): Promise<UserSelect | null> {
    throw new Error('Method not implemented.');
  }
  findMany(): Promise<UserSelect[] | null> {
    throw new Error('Method not implemented.');
  }
  update(): Promise<UserSelect | null> {
    throw new Error('Method not implemented.');
  }
  delete(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
}
