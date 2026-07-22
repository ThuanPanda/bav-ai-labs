import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  readonly name!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatars/jane.png' })
  @IsString()
  @IsOptional()
  @MaxLength(1024)
  readonly avatar?: string;
}
