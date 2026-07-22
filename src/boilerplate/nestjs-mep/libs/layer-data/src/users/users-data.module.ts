import { Module } from '@nestjs/common';

import { USER_REPOSITORY, UserRepositoryProvider } from './user.provider';
import { UserRepository } from './user.repository';

/** Data module exposing the User repository token. */
@Module({
  providers: [UserRepository, UserRepositoryProvider],
  exports: [USER_REPOSITORY],
})
export class UsersDataModule {}
