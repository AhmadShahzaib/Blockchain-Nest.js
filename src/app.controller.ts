import { Controller, Get,Query,Post ,Body} from '@nestjs/common';
import { AppService } from './app.service';
import { CreateAlertDto } from './alert/dto/create-alert.dto';
import { Alert } from './alert/alert.entity';
import { Price } from './price.entity';
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }  
  @Get('hourly')
  async getHourlyPrices(): Promise<Price[]> {
    return this.appService.getHourlyPrices();
  }
  @Post()
  async createAlert(@Body() createAlertDto: CreateAlertDto): Promise<Alert> {
    return this.appService.createAlert(createAlertDto);
  }
  @Get('swap-rate')
  async getSwapRate(
    @Query('ethAmount') ethAmount: string,
  ): Promise<{ btcAmount: number; feeEth: number; feeUsd: number }> {
    const ethAmountNumber = parseFloat(ethAmount);
    if (isNaN(ethAmountNumber) || ethAmountNumber <= 0) {
      throw new Error('Invalid Ethereum amount');
    }
    return this.appService.getSwapRate(ethAmountNumber);
  }
}
