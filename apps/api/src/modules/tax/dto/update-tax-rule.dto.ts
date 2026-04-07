import { IsString, IsBoolean, IsOptional, IsArray, IsDateString, IsObject, IsEnum, IsInt } from 'class-validator';

export class UpdateTaxRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsEnum(['percentage', 'flat_per_night', 'flat_per_stay'])
  @IsOptional()
  type?: 'percentage' | 'flat_per_night' | 'flat_per_stay';

  @IsString()
  @IsOptional()
  rate?: string;

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
  @IsOptional()
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}
