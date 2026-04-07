import { IsUUID, IsDateString } from 'class-validator';

export class RunAuditDto {
  @IsUUID()
  propertyId!: string;

  @IsDateString()
  businessDate!: string;
}
