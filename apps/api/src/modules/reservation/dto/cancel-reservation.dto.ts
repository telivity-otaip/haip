import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelReservationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
