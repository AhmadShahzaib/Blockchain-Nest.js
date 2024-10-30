import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
// import { PriceModule } from './price/price.module';
import { ConfigModule } from '@nestjs/config';
import {AppController} from './app.controller'
import { AppService } from './app.service';
import { Price } from './price.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Price]), HttpModule,
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: +process.env.DATABASE_PORT,
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Set to 'false' in production
    }),
    ScheduleModule.forRoot(),
    HttpModule,
   
  ], providers: [AppService],controllers: [AppController],
})
export class AppModule {}
