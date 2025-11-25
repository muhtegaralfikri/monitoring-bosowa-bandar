// /backend/src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Impor ConfigModule dan ConfigService
import { TypeOrmModule } from '@nestjs/typeorm'; // Impor TypeOrmModule

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StockModule } from './stock/stock.module';

const runtimeEnv = process.env.NODE_ENV ?? 'development';
const envFiles = [`.env.${runtimeEnv}`, '.env'];

@Module({
  imports: [
    // 1. Load file .env kita secara global
    ConfigModule.forRoot({
      isGlobal: true, // Membuat .env tersedia di semua module
      envFilePath: envFiles, // Urutan file env (mis. .env.development override .env)
    }),

    // 2. Konfigurasi TypeORM (Database)
    TypeOrmModule.forRootAsync({
      // Gunakan ConfigModule untuk inject konfigurasi
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const type = (config.get<string>('DB_TYPE') || 'postgres').toLowerCase();
        const synchronize =
          config.get<string>('DB_SYNCHRONIZE', 'false') === 'true';
        const logging = config.get<string>('DB_LOGGING', 'false') === 'true';

        const baseConfig = {
          entities: [__dirname + '/**/*.entity{.ts,.js}'], // Lokasi file-file @Entity kita nanti
          synchronize, // Kontrol lewat env agar produk aman
          logging,
        };

        if (type === 'mysql') {
          return {
            ...baseConfig,
            type: 'mysql' as const,
            host: config.get<string>('DB_HOST', '127.0.0.1'),
            port: parseInt(config.get<string>('DB_PORT', '3306'), 10),
            username: config.get<string>('DB_USERNAME', 'root'),
            password: config.get<string>('DB_PASSWORD', ''),
            database: config.get<string>('DB_NAME', 'fuel_ledger'),
          };
        }

        const useSsl = config.get<string>('DB_SSL', 'true') === 'true';
        return {
          ...baseConfig,
          type: 'postgres' as const,
          url: config.get<string>('DATABASE_URL'), // Membaca dari .env!
          ...(useSsl
            ? {
                ssl: {
                  rejectUnauthorized: false,
                },
              }
            : {}),
        };
      },
    }),

    AuthModule,

    UsersModule,

    StockModule,
    
   // Nanti kita akan tambahkan module lain di sini
    // (AuthModule, StockModule, etc.)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
