import { type IUserRepository, USER_REPOSITORY } from '@app/layer-data';
import { Inject, NotFoundException } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { USERS_ERRORS } from '../../constants';
import { GetUserQuery } from './get-user.query';

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(query: GetUserQuery) {
    const user = await this.userRepo.findById(query.id);
    if (!user) throw new NotFoundException(USERS_ERRORS.USER_NOT_FOUND);
    return user;
  }
}
