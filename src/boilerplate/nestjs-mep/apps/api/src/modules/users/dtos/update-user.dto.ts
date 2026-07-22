import { PartialType } from '@nestjs/swagger';

import { CreateUserDto } from './create-user.dto';

/** Every field optional — update any subset of a user. */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
