import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoomDto {
  @ApiProperty()
  @IsUUID()
  roomId!: string;
}
