import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsEmail,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CheckOutDto {
  @ApiPropertyOptional({ description: 'Skip folio review, auto-capture and settle' })
  @IsOptional()
  @IsBoolean()
  expressCheckout?: boolean;

  @ApiPropertyOptional({ description: 'Email receipt to guest (default: true)' })
  @IsOptional()
  @IsBoolean()
  sendReceiptEmail?: boolean;

  @ApiPropertyOptional({ description: 'Override email for receipt' })
  @IsOptional()
  @IsEmail()
  receiptEmail?: string;

  @ApiPropertyOptional({ description: 'Late checkout fee amount (overrides property config)' })
  @IsOptional()
  @IsNumber()
  lateCheckoutFee?: number;

  @ApiPropertyOptional({ description: 'Checkout notes (damage, minibar, etc.)' })
  @IsOptional()
  @IsString()
  notes?: string;
}
