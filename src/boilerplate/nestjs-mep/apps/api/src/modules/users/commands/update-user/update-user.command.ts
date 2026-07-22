import { Command } from '@nestjs/cqrs';

export interface UpdateUserCommandProps {
  id: string;
  name?: string;
  avatar?: string;
}

/** Command message: update an existing user. Resolves to the updated user id (or null). */
export class UpdateUserCommand extends Command<string | null> {
  constructor(public readonly props: UpdateUserCommandProps) {
    super();
  }
}
