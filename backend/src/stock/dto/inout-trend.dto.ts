// /backend/src/stock/dto/inout-trend.dto.ts
export interface DailyInOutPointDto {
  date: string;
  label: string;
  totalIn: number;
  totalOut: number;
}

export interface DailyInOutTrendDto {
  timezone: string;
  startDate: string;
  endDate: string;
  days: number;
  points: DailyInOutPointDto[];
}
