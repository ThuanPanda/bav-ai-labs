import { type IUserRepository, USER_REPOSITORY } from '@app/layer-data';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { CreateUserCommand } from './create-user.command';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(command: CreateUserCommand): Promise<string | null> {
    const user = await this.userRepo.create(command.props);
    return user?.id ?? null;
  }
}
