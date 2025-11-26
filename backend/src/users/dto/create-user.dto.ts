import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'Nama pengguna yang tampil di aplikasi' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Email unik pengguna' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password awal user (minimal 8 karakter)' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'Peran user', enum: ['admin', 'operasional'] })
  @IsString()
  @IsIn(['admin', 'operasional'])
  role: 'admin' | 'operasional';

  @ApiProperty({
    description: 'Monitoring user (wajib untuk operasional)',
    enum: ['ALL', 'GENSET', 'TUG_ASSIST'],
    default: 'ALL',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ALL', 'GENSET', 'TUG_ASSIST'])
  site?: string;
}
