import {
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AgentModifyDto {
  // Free modifications
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guestFirstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guestLastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  adults?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  children?: number;

  // Date changes (triggers rate re-calculation)
  @ApiPropertyOptional({ example: '2024-06-01' })
  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @ApiPropertyOptional({ example: '2024-06-05' })
  @IsOptional()
  @IsDateString()
  checkOut?: string;

  // Room type / rate plan change
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roomTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ratePlanId?: string;
}

export class AgentCancelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
