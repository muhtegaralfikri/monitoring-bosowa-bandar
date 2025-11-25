import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token aktif' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
