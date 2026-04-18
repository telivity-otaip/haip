import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsUUID,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgentSearchDto {
  // Location
  @ApiPropertyOptional({ example: 'New York' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 40.7128 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: -74.006 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  radiusKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  // Dates
  @ApiProperty({ example: '2024-06-01' })
  @IsDateString()
  checkIn!: string;

  @ApiProperty({ example: '2024-06-05' })
  @IsDateString()
  checkOut!: string;

  // Room requirements
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  rooms?: number;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  adults?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  children?: number;

  // Filters
  @ApiPropertyOptional({ example: 'bar' })
  @IsOptional()
  @IsString()
  rateType?: string;

  @ApiPropertyOptional({ example: ['wifi', 'minibar'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  accessibleOnly?: boolean;

  // Pagination
  // Bug 7: enforce a hard upper bound so agents cannot request arbitrarily
  // large pages and exhaust the database.
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
