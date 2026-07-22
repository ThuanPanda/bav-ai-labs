import type { UserSelect } from '@app/database/types';
import { Query } from '@nestjs/cqrs';
import type { OffsetPagination, OffsetResult } from '@prowerbdigital/common';

/** Query message: page-paginated list of users. Resolves to an OffsetResult. */
export class GetUsersQuery extends Query<OffsetResult<UserSelect>> {
  constructor(public readonly props: OffsetPagination) {
    super();
  }
}
