import {
  IsUUID,
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ChecklistItemDto {
  @ApiPropertyOptional()
  @IsString()
  item!: string;

  @ApiPropertyOptional()
  @IsBoolean()
  checked!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class InspectTaskDto {
  @ApiProperty()
  @IsUUID()
  inspectedBy!: string;

  @ApiProperty()
  @IsBoolean()
  passed!: boolean;

  @ApiPropertyOptional({ type: [ChecklistItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist?: Array<{ item: string; checked: boolean; notes?: string }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
