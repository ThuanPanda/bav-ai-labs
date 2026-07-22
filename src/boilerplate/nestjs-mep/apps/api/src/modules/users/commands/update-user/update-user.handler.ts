import { type IUserRepository, USER_REPOSITORY } from '@app/layer-data';
import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { USERS_ERRORS } from '../../constants';
import { UpdateUserCommand } from './update-user.command';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(command: UpdateUserCommand): Promise<string | null> {
    const { id, ...data } = command.props;

    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException(USERS_ERRORS.USER_NOT_FOUND);

    const updated = await this.userRepo.updateById(id, data);
    return updated?.id ?? null;
  }
}
