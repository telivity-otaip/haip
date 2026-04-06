import {
  IsArray,
  IsUUID,
  IsOptional,
  IsBoolean,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GroupCheckInItem {
  @ApiProperty({ description: 'Reservation ID' })
  @IsUUID()
  reservationId!: string;

  @ApiPropertyOptional({ description: 'Override room assignment' })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Skip deposit authorization' })
  @IsOptional()
  @IsBoolean()
  skipDepositAuth?: boolean;
}

export class GroupCheckInDto {
  @ApiProperty({ description: 'List of reservations to check in', type: [GroupCheckInItem] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GroupCheckInItem)
  reservations!: GroupCheckInItem[];
}
