import { IsString, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class UpdateTaxProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  jurisdictionCode?: string;

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
