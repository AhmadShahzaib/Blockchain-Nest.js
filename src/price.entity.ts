// src/price/price.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Price {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal')
  ethereumPrice: number;

  @Column('decimal')
  polygonPrice: number;

  @CreateDateColumn()
  createdAt: Date;
}
