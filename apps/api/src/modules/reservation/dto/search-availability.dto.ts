import { IsUUID, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchAvailabilityDto {
  @ApiProperty()
  @IsUUID()
  propertyId!: string;

  @ApiProperty({ example: '2024-06-01' })
  @IsDateString()
  checkIn!: string;

  @ApiProperty({ example: '2024-06-05' })
  @IsDateString()
  checkOut!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roomTypeId?: string;
}
