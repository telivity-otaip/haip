import { Controller, Get, Post, Patch, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReservationService } from './reservation.service';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all reservations' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getAllReservations() {
    return { message: 'Not implemented' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reservation by ID' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  getReservationById(@Param('id') id: string) {
    return { message: 'Not implemented' };
  }

  @Post()
  @ApiOperation({ summary: 'Create new reservation' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  createReservation(@Body() body: any) {
    return { message: 'Not implemented' };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update reservation' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  updateReservation(@Param('id') id: string, @Body() body: any) {
    return { message: 'Not implemented' };
  }

  @Post(':id/check-in')
  @ApiOperation({ summary: 'Check in reservation' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  checkInReservation(@Param('id') id: string) {
    return { message: 'Not implemented' };
  }

  @Post(':id/check-out')
  @ApiOperation({ summary: 'Check out reservation' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  checkOutReservation(@Param('id') id: string) {
    return { message: 'Not implemented' };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel reservation' })
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  cancelReservation(@Param('id') id: string) {
    return { message: 'Not implemented' };
  }
}
