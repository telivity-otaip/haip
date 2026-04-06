import { IsUUID, IsOptional, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ListReservationsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({
    enum: ['pending', 'confirmed', 'assigned', 'checked_in', 'stayover', 'due_out', 'checked_out', 'no_show', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'assigned', 'checked_in', 'stayover', 'due_out', 'checked_out', 'no_show', 'cancelled'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  arrivalDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  arrivalDateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  departureDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  departureDateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  guestId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
