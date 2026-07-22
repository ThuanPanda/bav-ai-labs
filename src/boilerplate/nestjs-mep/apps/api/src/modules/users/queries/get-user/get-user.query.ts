import type { UserSelect } from '@app/database/types';
import { Query } from '@nestjs/cqrs';

/** Query message: fetch a single user by id. Resolves to the user. */
export class GetUserQuery extends Query<UserSelect> {
  constructor(public readonly id: string) {
    super();
  }
}
