import { IsString, IsUUID, IsOptional, IsInt } from 'class-validator';

export class CalculateTaxDto {
  @IsUUID()
  propertyId!: string;

  @IsString()
  chargeType!: string;

  @IsString()
  amount!: string;

  @IsString()
  serviceDate!: string;

  @IsUUID()
  @IsOptional()
  guestId?: string;

  @IsInt()
  @IsOptional()
  numberOfNights?: number;

  @IsInt()
  @IsOptional()
  nightNumber?: number;
}

export interface TaxLineItem {
  name: string;
  code: string;
  type: 'percentage' | 'flat_per_night' | 'flat_per_stay';
  rate: string;
  amount: string;
  isCompounding: boolean;
}
