// /backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
@Module({
  imports: [
    // Impor modul lain yang kita butuhkan
    UsersModule, // Agar bisa inject UsersService
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([RefreshTokenEntity]),

    // Konfigurasi JWT Module
    JwtModule.registerAsync({
      imports: [ConfigModule], // Impor ConfigModule
      inject: [ConfigService], // Inject ConfigService
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'), // Baca dari .env
        signOptions: {
          expiresIn: parseInt(
            configService.get<string>('JWT_ACCESS_TTL_SECONDS', '86400'),
            10,
          ),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [PassportModule], // Nanti kita tambahkan 'Strategy' di sini
})
export class AuthModule {}
