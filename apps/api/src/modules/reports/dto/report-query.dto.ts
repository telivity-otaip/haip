import { IsUUID, IsDateString, IsOptional } from 'class-validator';

export class ReportQueryDto {
  @IsUUID()
  propertyId!: string;

  @IsDateString()
  date!: string;
}

export class ReportRangeQueryDto {
  @IsUUID()
  propertyId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
