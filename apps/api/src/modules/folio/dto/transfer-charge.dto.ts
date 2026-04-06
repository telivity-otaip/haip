import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferChargeDto {
  @ApiProperty({ description: 'Charge ID to transfer' })
  @IsUUID()
  chargeId!: string;

  @ApiProperty({ description: 'Target folio ID' })
  @IsUUID()
  targetFolioId!: string;
}
