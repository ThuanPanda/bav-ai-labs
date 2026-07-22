import { type IUserRepository, USER_REPOSITORY } from '@app/layer-data';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetUsersQuery } from './get-users.query';

@QueryHandler(GetUsersQuery)
export class GetUsersHandler implements IQueryHandler<GetUsersQuery> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(query: GetUsersQuery) {
    return this.userRepo.findPaginated(query.props);
  }
}
