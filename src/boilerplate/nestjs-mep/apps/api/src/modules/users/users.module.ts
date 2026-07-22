import { UsersDataModule } from '@app/layer-data';
import { Module } from '@nestjs/common';

import { CreateUserHandler, DeleteUserHandler, UpdateUserHandler } from './commands';
import { UsersController } from './controllers';
import { GetUserHandler, GetUsersHandler } from './queries';

const QueryHandlers = [GetUsersHandler, GetUserHandler];
const CommandHandlers = [CreateUserHandler, UpdateUserHandler, DeleteUserHandler];
const DataModules = [UsersDataModule];

/**
 * Users feature module — a reference CQRS module.
 * Imports the per-domain data module (repositories live in `@app/layer-data`) and wires the
 * command/query handlers. It never declares repositories locally.
 */
@Module({
  imports: [...DataModules],
  controllers: [UsersController],
  providers: [...QueryHandlers, ...CommandHandlers],
  exports: [...DataModules],
})
export class UsersModule {}
