import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RoomService } from './room.service';

@ApiTags('rooms', 'room-types')
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  @ApiOperation({ summary: 'Get all rooms' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getAllRooms() {
    return { message: 'Not implemented' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room by ID' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getRoomById(@Param('id') id: string) {
    return { message: 'Not implemented' };
  }

  @Post()
  @ApiOperation({ summary: 'Create new room' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  createRoom(@Body() body: any) {
    return { message: 'Not implemented' };
  }

  @Get('/types')
  @ApiOperation({ summary: 'Get all room types' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getRoomTypes() {
    return { message: 'Not implemented' };
  }

  @Post('/types')
  @ApiOperation({ summary: 'Create new room type' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  createRoomType(@Body() body: any) {
    return { message: 'Not implemented' };
  }
}
