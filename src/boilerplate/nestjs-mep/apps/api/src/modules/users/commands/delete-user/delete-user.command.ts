import { Command } from '@nestjs/cqrs';

export interface DeleteUserCommandProps {
  id: string;
}

/** Command message: delete a user by id. */
export class DeleteUserCommand extends Command<null> {
  constructor(public readonly props: DeleteUserCommandProps) {
    super();
  }
}
