import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/** Full user detail response. `@Exclude` + `@Expose` whitelist the exposed fields. */
@Exclude()
export class UserResponse {
  @ApiProperty({ example: 'b3f1c2a4-...' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @Expose()
  name!: string;

  @ApiProperty({ nullable: true, example: 'https://cdn.example.com/avatars/jane.png' })
  @Expose()
  avatar!: string | null;

  @ApiProperty()
  @Expose()
  createdAt!: Date;
}
