// /backend/src/stock/dto/create-stock-in.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateStockInDto {
  @ApiProperty({
    description: 'Jumlah liter stok yang masuk',
    example: 100.5,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive() // Pastikan angkanya positif
  amount: number;

  @ApiProperty({
    description: 'Deskripsi/keterangan (Opsional)',
    example: 'Pembelian dari Pertamina Batch #123',
  })
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Monitoring asal stok',
    enum: ['GENSET', 'TUG_ASSIST'],
    example: 'GENSET',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['GENSET', 'TUG_ASSIST'])
  category: string;

  @ApiProperty({
    description: 'Waktu transaksi (ISO string). Jika tidak diisi, akan memakai waktu server.',
    example: '2025-11-26T07:00:00+08:00',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}
