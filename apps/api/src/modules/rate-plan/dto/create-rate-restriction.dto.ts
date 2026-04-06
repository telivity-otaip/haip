import {
  IsOptional,
  IsUUID,
  IsInt,
  IsBoolean,
  IsObject,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRateRestrictionDto {
  @ApiProperty()
  @IsUUID()
  propertyId!: string;

  @ApiProperty({ example: '2024-06-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2024-06-30' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ example: 2, description: 'Minimum length of stay' })
  @IsOptional()
  @IsInt()
  @Min(1)
  minLos?: number;

  @ApiPropertyOptional({ example: 14, description: 'Maximum length of stay' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxLos?: number;

  @ApiPropertyOptional({ default: false, description: 'Closed to Arrival' })
  @IsOptional()
  @IsBoolean()
  closedToArrival?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Closed to Departure' })
  @IsOptional()
  @IsBoolean()
  closedToDeparture?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Rate entirely closed' })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @ApiPropertyOptional({
    example: { friday: 20, saturday: 30 },
    description: 'Day-of-week rate overrides (amount adjustment)',
  })
  @IsOptional()
  @IsObject()
  dayOfWeekOverrides?: Record<string, number>;
}
