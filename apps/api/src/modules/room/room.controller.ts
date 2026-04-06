import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RoomService } from './room.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@ApiTags('rooms', 'room-types')
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  // --- Room Type routes (before :id to avoid conflicts) ---

  @Get('types')
  @ApiOperation({ summary: 'Get all room types for a property' })
  @ApiQuery({ name: 'propertyId', required: true })
  @ApiResponse({ status: 200, description: 'List of room types' })
  getRoomTypes(@Query('propertyId', ParseUUIDPipe) propertyId: string) {
    return this.roomService.findAllRoomTypes(propertyId);
  }

  @Post('types')
  @ApiOperation({ summary: 'Create new room type' })
  @ApiResponse({ status: 201, description: 'Room type created' })
  createRoomType(@Body() dto: CreateRoomTypeDto) {
    return this.roomService.createRoomType(dto);
  }

  @Get('types/:id')
  @ApiOperation({ summary: 'Get room type by ID' })
  @ApiResponse({ status: 200, description: 'Room type found' })
  @ApiResponse({ status: 404, description: 'Room type not found' })
  getRoomTypeById(@Param('id', ParseUUIDPipe) id: string) {
    return this.roomService.findRoomTypeById(id);
  }

  // --- Room routes ---

  @Get()
  @ApiOperation({ summary: 'Get all rooms for a property' })
  @ApiQuery({ name: 'propertyId', required: true })
  @ApiQuery({ name: 'roomTypeId', required: false })
  @ApiResponse({ status: 200, description: 'List of rooms' })
  getAllRooms(
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
    @Query('roomTypeId') roomTypeId?: string,
  ) {
    return this.roomService.findAllRooms(propertyId, roomTypeId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new room' })
  @ApiResponse({ status: 201, description: 'Room created' })
  createRoom(@Body() dto: CreateRoomDto) {
    return this.roomService.createRoom(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room by ID' })
  @ApiResponse({ status: 200, description: 'Room found' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  getRoomById(@Param('id', ParseUUIDPipe) id: string) {
    return this.roomService.findRoomById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update room' })
  @ApiResponse({ status: 200, description: 'Room updated' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  updateRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomService.updateRoom(id, dto);
  }
}
