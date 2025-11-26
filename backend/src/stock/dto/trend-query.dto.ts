// /backend/src/stock/dto/trend-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class StockTrendQueryDto {
  @ApiPropertyOptional({
    description: 'Jumlah hari ke belakang untuk dihitung (maksimal 30)',
    default: 7,
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number = 7;

  @ApiPropertyOptional({
    description: 'Filter monitoring/kategori stok',
    enum: ['GENSET', 'TUG_ASSIST'],
  })
  @IsOptional()
  @IsIn(['GENSET', 'TUG_ASSIST'])
  site?: string;
}
