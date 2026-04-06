import { PartialType } from '@nestjs/swagger';
import { CreateGuestDto } from './create-guest.dto';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGuestDto extends PartialType(CreateGuestDto) {
  @ApiPropertyOptional({ description: 'Do Not Rent flag' })
  @IsOptional()
  @IsBoolean()
  isDnr?: boolean;

  @ApiPropertyOptional({ description: 'Reason for DNR flag' })
  @IsOptional()
  @IsString()
  dnrReason?: string;
}
