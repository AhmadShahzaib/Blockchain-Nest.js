import { Injectable ,HttpException, HttpStatus} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { Price } from './price.entity';
import * as nodemailer from 'nodemailer';
import { CreateAlertDto } from './alert/dto/create-alert.dto';
import { Alert } from './alert/alert.entity';
@Injectable()
export class AppService {
  private readonly feePercentage = 0.03;
  constructor(
    private httpService: HttpService,
    private readonly alertRepository: Repository<Alert>,
    @InjectRepository(Price)
    private priceRepository: Repository<Price>,
  ) {}
///
@Cron('0 * * * *') // Runs at the start of every hour
  async checkUserAlerts() {
    // Get the latest price entry
    const latestPrice = await this.priceRepository.findOne({
      order: { createdAt: 'DESC' },
    });

    if (!latestPrice) return;

    // Fetch all alerts from the database
    const alerts = await this.alertRepository.find();

    for (const alert of alerts) {
      let currentPrice;

      // Check for each chain and set the current price
      if (alert.chain.toLowerCase() === 'ethereum') {
        currentPrice = latestPrice.ethereumPrice;
      } else if (alert.chain.toLowerCase() === 'polygon') {
        currentPrice = latestPrice.polygonPrice;
      }

      // If the current price meets or exceeds the target price, send an email
      if (currentPrice && currentPrice >= alert.targetPrice) {
        await this.sendAlertEmail(alert.email, alert.chain, currentPrice);
      }
    }
  }

  private async sendAlertEmail(email: string, chain: string, currentPrice: number) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'your_email@gmail.com',
        pass: 'your_password',
      },
    });

    const mailOptions = {
      from: 'your_email@gmail.com',
      to: email,
      subject: `${chain} Price Alert`,
      text: `The price of ${chain} has reached ${currentPrice} USD.`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Alert email sent to ${email} for ${chain} reaching ${currentPrice} USD.`);
    } catch (error) {
      console.error(`Failed to send alert email for ${chain}:`, error);
    }
  }
// 


async createAlert(createAlertDto: CreateAlertDto): Promise<Alert> {
  const alert = this.alertRepository.create(createAlertDto);
  return this.alertRepository.save(alert);
}

async getAlerts(): Promise<Alert[]> {
  return this.alertRepository.find();
}

@Cron('0 * * * *') // Runs at the start of every hour
  async checkPriceIncrease() {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Get the latest price entry and the one from an hour ago
    const latestPrice = await this.priceRepository.findOne({
      order: { createdAt: 'DESC' },
    });

    const previousPrice = await this.priceRepository.findOne({
      where: { createdAt: LessThan(oneHourAgo) },
      order: { createdAt: 'DESC' },
    });

    // Return if no data found for either
    if (!latestPrice || !previousPrice) return;

    // Check if the price increased by more than 3%
    const ethIncreasePercentage =
      ((latestPrice.ethereumPrice - previousPrice.ethereumPrice) / previousPrice.ethereumPrice) * 100;
    const polygonIncreasePercentage =
      ((latestPrice.polygonPrice - previousPrice.polygonPrice) / previousPrice.polygonPrice) * 100;

    if (ethIncreasePercentage > 3) {
      await this.sendEmail('Ethereum', ethIncreasePercentage);
    }

    if (polygonIncreasePercentage > 3) {
      await this.sendEmail('Polygon', polygonIncreasePercentage);
    }
  }

  private async sendEmail(chainName: string, increasePercentage: number) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'your_email@gmail.com',
        pass: 'your_password',
      },
    });

    const mailOptions = {
      from: 'your_email@gmail.com',
      to: 'hyperhire_assignment@hyperhire.in',
      subject: `${chainName} Price Increase Alert`,
      text: `The price of ${chainName} has increased by ${increasePercentage.toFixed(2)}% in the past hour.`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent for ${chainName} price increase.`);
    } catch (error) {
      console.error(`Failed to send email for ${chainName}:`, error);
    }
  }



///
  async getHourlyPrices(): Promise<Price[]> {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    return this.priceRepository.find({
      where: { createdAt: MoreThan(oneDayAgo) },
      order: { createdAt: 'ASC' },
    });
  }

  async getSwapRate(ethAmount: number): Promise<{ btcAmount: number; feeEth: number; feeUsd: number }> {
    try {
      // Fetch the current prices of ETH and BTC
      const response = await firstValueFrom(
        this.httpService.get('https://api.coingecko.com/api/v3/simple/price', {
          params: {
            ids: 'ethereum,bitcoin',
            vs_currencies: 'usd',
          },
        }),
      );
      const ethPriceInUsd = response.data.ethereum.usd;
      const btcPriceInUsd = response.data.bitcoin.usd;

      // Calculate BTC amount equivalent to the given ETH amount
      const ethValueInUsd = ethAmount * ethPriceInUsd;
      const btcAmount = ethValueInUsd / btcPriceInUsd;

      // Calculate the total fee (3% of the ETH value in USD)
      const feeUsd = ethValueInUsd * this.feePercentage;
      const feeEth = feeUsd / ethPriceInUsd;

      return {
        btcAmount,
        feeEth,
        feeUsd,
      };
    } catch (error) {
      throw new HttpException('Failed to fetch prices from CoinGecko', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  // Cron job to run every 5 minutes
  @Cron('*/5 * * * *')
  async fetchAndSavePrices() {
    try {
      const { data } = await this.httpService
        .get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,polygon&vs_currencies=usd')
        .toPromise();

      const ethereumPrice = data.ethereum.usd;
      const polygonPrice = data.polygon?.usd ? data.polygon.usd : 0;

      // Save to database
      const price = this.priceRepository.create({ ethereumPrice, polygonPrice });
      await this.priceRepository.save(price);

      console.log(`Prices saved: ETH: ${ethereumPrice}, MATIC: ${polygonPrice}`);
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  }
  getHello(): string {
    return 'Hello World!';
  }
}
