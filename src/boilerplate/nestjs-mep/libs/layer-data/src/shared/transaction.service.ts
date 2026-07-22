import * as schema from '@app/database/schemas';
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_PROVIDER } from '@prowerbdigital/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

/** The Drizzle transaction handle passed to a `transaction()` callback. */
export type DrizzleTx = Parameters<Parameters<NodePgDatabase<typeof schema>['transaction']>[0]>[0];

/** Centralized helper for running work inside a Drizzle transaction. */
@Injectable()
export class DrizzleTransactionService {
  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly drizzle: NodePgDatabase<typeof schema>,
  ) {}

  /** Runs the given function inside a database transaction. */
  run<T>(fn: (tx: DrizzleTx) => Promise<T>): Promise<T> {
    return this.drizzle.transaction(fn);
  }
}
