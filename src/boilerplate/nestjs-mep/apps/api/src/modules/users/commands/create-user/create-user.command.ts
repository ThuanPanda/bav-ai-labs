import { Command } from '@nestjs/cqrs';

export interface CreateUserCommandProps {
  name: string;
  avatar?: string;
}

/** Command message: create a new user. Resolves to the new user id (or null). */
export class CreateUserCommand extends Command<string | null> {
  constructor(public readonly props: CreateUserCommandProps) {
    super();
  }
}
