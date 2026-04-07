import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, IsDateString, IsObject, IsEnum, IsInt } from 'class-validator';

export class CreateTaxRuleDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsEnum(['percentage', 'flat_per_night', 'flat_per_stay'])
  type!: 'percentage' | 'flat_per_night' | 'flat_per_stay';

  @IsString()
  rate!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  appliesToChargeTypes?: string[];

  @IsObject()
  @IsOptional()
  exemptions?: {
    guestTypes?: string[];
    minStayNights?: number;
    maxNights?: number;
  };

  @IsBoolean()
  @IsOptional()
  isCompounding?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  effectiveFrom!: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}
