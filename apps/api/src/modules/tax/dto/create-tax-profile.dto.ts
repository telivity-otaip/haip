import { IsString, IsUUID, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class CreateTaxProfileDto {
  @IsUUID()
  propertyId!: string;

  @IsString()
  name!: string;

  @IsString()
  jurisdictionCode!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  effectiveFrom!: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}
