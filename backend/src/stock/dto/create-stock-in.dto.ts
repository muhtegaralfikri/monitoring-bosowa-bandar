// /backend/src/stock/dto/create-stock-in.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

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
    description: 'Site asal stok',
    enum: ['LANTEBUNG', 'JENEPONTO'],
    example: 'LANTEBUNG',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['LANTEBUNG', 'JENEPONTO'])
  category: string;
}
