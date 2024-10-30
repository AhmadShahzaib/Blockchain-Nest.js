// src/alert/dto/create-alert.dto.ts

import { IsString, IsEmail, IsNumber } from 'class-validator';

export class CreateAlertDto {
  @IsString()
  chain: string;

  @IsNumber()
  targetPrice: number;

  @IsEmail()
  email: string;
}
