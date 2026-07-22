import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/** Returned by create/update — only the affected id (commands never return full objects). */
@Exclude()
export class MutateUserResponse {
  @ApiProperty({ example: 'b3f1c2a4-...' })
  @Expose()
  id!: string | null;
}
