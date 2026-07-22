import { type IUserRepository, USER_REPOSITORY } from '@app/layer-data';
import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { USERS_ERRORS } from '../../constants';
import { DeleteUserCommand } from './delete-user.command';

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(command: DeleteUserCommand): Promise<null> {
    const { id } = command.props;

    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException(USERS_ERRORS.USER_NOT_FOUND);

    await this.userRepo.deleteById(id);
    return null;
  }
}
