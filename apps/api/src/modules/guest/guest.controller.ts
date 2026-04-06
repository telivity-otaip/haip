import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GuestService } from './guest.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { SearchGuestsDto } from './dto/search-guests.dto';

@ApiTags('guests')
@Controller('guests')
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Get()
  @ApiOperation({ summary: 'Search and list guests' })
  @ApiResponse({ status: 200, description: 'Paginated list of guests' })
  searchGuests(@Query() dto: SearchGuestsDto) {
    return this.guestService.search(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guest by ID' })
  @ApiResponse({ status: 200, description: 'Guest found' })
  @ApiResponse({ status: 404, description: 'Guest not found' })
  getGuestById(@Param('id', ParseUUIDPipe) id: string) {
    return this.guestService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new guest profile' })
  @ApiResponse({ status: 201, description: 'Guest created' })
  createGuest(@Body() dto: CreateGuestDto) {
    return this.guestService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update guest profile' })
  @ApiResponse({ status: 200, description: 'Guest updated' })
  @ApiResponse({ status: 404, description: 'Guest not found' })
  updateGuest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGuestDto,
  ) {
    return this.guestService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete guest profile (GDPR right to erasure)' })
  @ApiResponse({ status: 200, description: 'Guest deleted' })
  @ApiResponse({ status: 404, description: 'Guest not found' })
  deleteGuest(@Param('id', ParseUUIDPipe) id: string) {
    return this.guestService.delete(id);
  }
}
