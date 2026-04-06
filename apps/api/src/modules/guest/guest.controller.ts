import { Controller, Get, Post, Patch, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GuestService } from './guest.service';

@ApiTags('guests')
@Controller('guests')
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Get()
  @ApiOperation({ summary: 'Get all guests' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getAllGuests() {
    return { message: 'Not implemented' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guest by ID' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getGuestById(@Param('id') id: string) {
    return { message: 'Not implemented' };
  }

  @Post()
  @ApiOperation({ summary: 'Create new guest' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  createGuest(@Body() body: any) {
    return { message: 'Not implemented' };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update guest' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  updateGuest(@Param('id') id: string, @Body() body: any) {
    return { message: 'Not implemented' };
  }
}
