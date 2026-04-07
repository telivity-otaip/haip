import { IsString, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { RatePlanMappingDto, RoomTypeMappingDto } from './create-channel-connection.dto';

export class UpdateChannelConnectionDto {
  @IsOptional()
  @IsString()
  channelName?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'pending_setup'])
  status?: string;

  @IsOptional()
  @IsEnum(['push', 'pull', 'bidirectional'])
  syncDirection?: string;

  @IsOptional()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RatePlanMappingDto)
  ratePlanMapping?: RatePlanMappingDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomTypeMappingDto)
  roomTypeMapping?: RoomTypeMappingDto[];
}
