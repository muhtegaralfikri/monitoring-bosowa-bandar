// Buka file: /backend/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// Import Swagger
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common'; // <-- Impor
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');

  const corsOrigins = (configService.get<string>('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const enableCors = configService.get<string>('ENABLE_CORS', 'true') === 'true';

  if (enableCors) {
    app.enableCors({
      origin: corsOrigins.length ? corsOrigins : true,
      credentials: true,
    });
  }
  app.useGlobalPipes(new ValidationPipe()); // <-- TAMBAHKAN INI
  // --- Mulai Konfigurasi Swagger ---
  const swaggerEnabledEnv = configService.get<string>('ENABLE_SWAGGER');
  const isSwaggerEnabled =
    swaggerEnabledEnv === 'true' ||
    (!swaggerEnabledEnv && configService.get<string>('NODE_ENV', 'development') !== 'production');

  if (isSwaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Fuel Ledger System API')
      .setDescription('Dokumentasi API untuk Sistem Manajemen Stok Bahan Bakar Bosowa')
      .setVersion('1.0')
      .addTag('stock', 'Operasi manajemen stok')
      .addTag('auth', 'Autentikasi Pengguna')
      // Kita tambahkan ini nanti saat implementasi JWT
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    // 'api/docs' adalah path untuk mengakses UI Swagger-nya
    SwaggerModule.setup('api/docs', app, document);
    // --- Selesai Konfigurasi Swagger ---
  }

  const port = parseInt(configService.get<string>('APP_PORT', '3000'), 10);
  await app.listen(port); // Atau port lain, misal 3001
}
bootstrap();
