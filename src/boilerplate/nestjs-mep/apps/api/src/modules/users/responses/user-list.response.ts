import { ApiProperty } from '@nestjs/swagger';
import { OffsetPaginationResponseDto } from '@prowerbdigital/common';
import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class UserListItemResponse {
  @ApiProperty({ example: 'b3f1c2a4-...' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @Expose()
  name!: string;

  @ApiProperty({ nullable: true, example: 'https://cdn.example.com/avatars/jane.png' })
  @Expose()
  avatar!: string | null;
}

/**
 * Page-paginated list response. The array is exposed as `items` (never `data`) alongside
 * `pagination` — matching how `ResponseInterceptor` wraps the envelope.
 */
@Exclude()
export class UserOffsetListResponse {
  @ApiProperty({ type: [UserListItemResponse] })
  @Expose()
  @Type(() => UserListItemResponse)
  items!: UserListItemResponse[];

  @ApiProperty({ type: OffsetPaginationResponseDto })
  @Expose()
  @Type(() => OffsetPaginationResponseDto)
  pagination!: OffsetPaginationResponseDto;
}
