import { IsUUID, IsDateString, IsOptional } from 'class-validator';

export class PushAriDto {
  @IsUUID()
  propertyId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsUUID()
  channelConnectionId?: string;
}
