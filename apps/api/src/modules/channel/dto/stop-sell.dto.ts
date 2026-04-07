import { IsUUID, IsDateString, IsOptional } from 'class-validator';

export class StopSellDto {
  @IsUUID()
  propertyId!: string;

  @IsOptional()
  @IsUUID()
  roomTypeId?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
