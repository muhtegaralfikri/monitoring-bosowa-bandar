// /backend/src/stock/dto/trend-response.dto.ts
export interface StockTrendPointDto {
  date: string;
  label: string;
  openingStock: number;
  closingStock: number;
  delta: number;
}

export interface StockTrendResponseDto {
  timezone: string;
  startDate: string;
  endDate: string;
  days: number;
  points: StockTrendPointDto[];
}
