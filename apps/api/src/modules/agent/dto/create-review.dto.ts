import { IsString, IsInt, Min, Max, IsOptional, IsUUID, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ enum: ['google', 'tripadvisor', 'booking_com', 'expedia', 'other'] })
  @IsIn(['google', 'tripadvisor', 'booking_com', 'expedia', 'other'])
  source!: string;

  @ApiProperty()
  @IsString()
  guestName!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty()
  @IsString()
  reviewText!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stayDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reservationId?: string;
}

export class UpdateReviewResponseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responseText?: string;

  @ApiPropertyOptional({ enum: ['pending', 'drafted', 'approved', 'posted'] })
  @IsOptional()
  @IsIn(['pending', 'drafted', 'approved', 'posted'])
  responseStatus?: string;
}
