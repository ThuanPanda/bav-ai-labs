import type { Provider } from '@nestjs/common';

import { UserRepository } from './user.repository';

/** Injection token for the user repository. */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

/** Binds the token to the UserRepository implementation (also a provider in the module). */
export const UserRepositoryProvider: Provider = {
  provide: USER_REPOSITORY,
  useExisting: UserRepository,
};
