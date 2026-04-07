import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty()
  @IsUUID()
  propertyId!: string;

  @ApiProperty({ example: 'otaip-booking-agent-v1' })
  @IsString()
  subscriberId!: string;

  @ApiPropertyOptional({ example: 'OTAIP Hotel Booking Agent' })
  @IsOptional()
  @IsString()
  subscriberName?: string;

  @ApiProperty({ example: 'https://otaip.example.com/webhooks/haip' })
  @IsUrl()
  callbackUrl!: string;

  @ApiProperty({ example: ['reservation.*', 'folio.charge_posted'] })
  @IsArray()
  @IsString({ each: true })
  events!: string[];

  @ApiPropertyOptional({ description: 'HMAC secret for webhook signature verification' })
  @IsOptional()
  @IsString()
  secret?: string;
}
