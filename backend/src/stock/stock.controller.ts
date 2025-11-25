// /backend/src/stock/stock.controller.ts

// Tambahkan 'Request'
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  SetMetadata,
  Request,
  Query, // <-- TAMBAHKAN INI
} from '@nestjs/common';
import { StockService } from './stock.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { CreateStockInDto } from './dto/create-stock-in.dto';
import { CreateStockOutDto } from './dto/create-stock-out.dto';
import { StockHistoryQueryDto } from './dto/history-query.dto';
import { StockTrendQueryDto } from './dto/trend-query.dto';
import { DailyInOutTrendDto } from './dto/inout-trend.dto';

@ApiTags('stock')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('summary')
  getSummary() {
    // Tidak berubah
    return this.stockService.getSummary();
  }

  @Post('in')
  @ApiBearerAuth()
  @SetMetadata('roles', ['admin'])
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  // Tambahkan '@Request() req'
  addStock(@Body() createStockInDto: CreateStockInDto, @Request() req) { 
    // Kirim 'req.user' ke service
    return this.stockService.addStockIn(createStockInDto, req.user); 
  }

  @Post('out')
  @ApiBearerAuth()
  @SetMetadata('roles', ['operasional'])
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  // Tambahkan '@Request() req'
  useStock(@Body() createStockOutDto: CreateStockOutDto, @Request() req) {
    // Kirim 'req.user' ke service
    return this.stockService.useStockOut(createStockOutDto, req.user);
  }

  @Get('history')
  @ApiBearerAuth() // Butuh token
  @SetMetadata('roles', ['admin', 'operasional']) // Admin & Operasional
  @UseGuards(AuthGuard('jwt'), RolesGuard) // Terapkan penjaga
  getHistory(
    @Query() historyQueryDto: StockHistoryQueryDto, // <-- Ambil query params
    @Request() req,
  ) {
    return this.stockService.getHistory(historyQueryDto, req.user);
  }

  @Get('trend')
  getTrend(@Query() trendQueryDto: StockTrendQueryDto) {
    return this.stockService.getDailyStockTrend(trendQueryDto);
  }

  @Get('trend/in-out')
  getInOutTrend(@Query() trendQueryDto: StockTrendQueryDto) {
    return this.stockService.getDailyInOutTrend(trendQueryDto);
  }
}
