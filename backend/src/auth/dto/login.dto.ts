// /backend/src/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger'; // Untuk dokumentasi Swagger
import { IsNotEmpty, IsString, IsEmail } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' }) // Ganti example
  @IsNotEmpty()
  @IsEmail() // Ganti dari IsString
  email: string; // Ganti dari 'username'

  @ApiProperty({ example: 'password123' }) // Swagger akan pakai ini
  @IsNotEmpty()
  @IsString()
  password: string;
}