import type { UserInsert, UserModify, UserSelect } from '@app/database/types';
import type { BaseRepositoryV2, OffsetPagination, OffsetResult } from '@prowerbdigital/common';

import type { DrizzleTx } from '../shared';

/**
 * Repository contract for the User entity. Base CRUD comes from `BaseRepositoryV2`;
 * add only domain-specific methods here. Reads are never transactional.
 */
export interface IUserRepository
  extends BaseRepositoryV2<UserSelect, UserInsert, UserModify, DrizzleTx> {
  findById(id: string, options?: { select?: (keyof UserSelect)[] }): Promise<UserSelect | null>;

  /** Page-paginated users with optional name search. */
  findPaginated(params: OffsetPagination): Promise<OffsetResult<UserSelect>>;
}
