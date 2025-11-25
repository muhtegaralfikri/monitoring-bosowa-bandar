// /backend/src/stock/dto/history-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class StockHistoryQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Filter jenis transaksi. 'IN' untuk tambah stok, 'OUT' untuk pemakaian.",
    enum: ['IN', 'OUT'],
  })
  @IsOptional()
  @IsIn(['IN', 'OUT'])
  type?: 'IN' | 'OUT';

  @ApiPropertyOptional({
    description: 'Tanggal awal rentang filter (ISO string)',
    example: '2024-05-01T00:00:00+08:00',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Tanggal akhir rentang filter (ISO string)',
    example: '2024-05-07T23:59:59+08:00',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan ID petugas (hanya admin)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Pencarian teks bebas pada deskripsi atau nama petugas',
  })
  @IsOptional()
  q?: string;
}
