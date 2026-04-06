import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const ROOM_STATUSES = [
  'vacant_clean',
  'vacant_dirty',
  'clean',
  'inspected',
  'guest_ready',
  'occupied',
  'out_of_order',
  'out_of_service',
] as const;

export class UpdateRoomStatusDto {
  @ApiProperty({ enum: ROOM_STATUSES, description: 'Target room status' })
  @IsIn(ROOM_STATUSES)
  status!: string;

  @ApiPropertyOptional({ description: 'Maintenance or status change notes' })
  @IsOptional()
  @IsString()
  maintenanceNotes?: string;
}
