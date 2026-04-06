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
import { ReservationService } from './reservation.service';
import { AvailabilityService } from './availability.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ModifyReservationDto } from './dto/modify-reservation.dto';
import { AssignRoomDto } from './dto/assign-room.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { SearchAvailabilityDto } from './dto/search-availability.dto';
import { ListReservationsDto } from './dto/list-reservations.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { GroupCheckInDto } from './dto/group-check-in.dto';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationController {
  constructor(
    private readonly reservationService: ReservationService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  // --- Action routes BEFORE :id to avoid conflicts ---

  @Post('search-availability')
  @ApiOperation({ summary: 'Search room availability for a date range' })
  @ApiResponse({ status: 200, description: 'Availability results' })
  searchAvailability(@Body() dto: SearchAvailabilityDto) {
    return this.availabilityService.searchAvailability(
      dto.propertyId,
      dto.checkIn,
      dto.checkOut,
      dto.roomTypeId,
    );
  }

  @Post('group-check-in')
  @ApiOperation({ summary: 'Batch check-in for group reservations' })
  @ApiQuery({ name: 'propertyId', required: true })
  @ApiResponse({ status: 200, description: 'Group check-in results (partial success allowed)' })
  groupCheckIn(
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() dto: GroupCheckInDto,
  ) {
    return this.reservationService.groupCheckIn(propertyId, dto);
  }

  // --- CRUD routes ---

  @Get()
  @ApiOperation({ summary: 'List reservations with filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of reservations' })
  listReservations(@Query() dto: ListReservationsDto) {
    return this.reservationService.list(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create new reservation (status: pending)' })
  @ApiResponse({ status: 201, description: 'Reservation created' })
  createReservation(@Body() dto: CreateReservationDto) {
    return this.reservationService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reservation with guest, room, and rate details' })
  @ApiResponse({ status: 200, description: 'Reservation found' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  getReservationById(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modify reservation (dates, room type, rate, occupancy)' })
  @ApiResponse({ status: 200, description: 'Reservation modified' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  modifyReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModifyReservationDto,
  ) {
    return this.reservationService.modify(id, dto);
  }

  // --- Lifecycle transition routes ---

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm reservation' })
  @ApiResponse({ status: 200, description: 'Reservation confirmed' })
  confirmReservation(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationService.confirm(id);
  }

  @Patch(':id/assign-room')
  @ApiOperation({ summary: 'Assign specific room to reservation' })
  @ApiResponse({ status: 200, description: 'Room assigned' })
  assignRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoomDto,
  ) {
    return this.reservationService.assignRoom(id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel reservation with optional reason' })
  @ApiResponse({ status: 200, description: 'Reservation cancelled' })
  cancelReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelReservationDto,
  ) {
    return this.reservationService.cancel(id, dto);
  }

  @Patch(':id/no-show')
  @ApiOperation({ summary: 'Mark reservation as no-show' })
  @ApiResponse({ status: 200, description: 'Reservation marked as no-show' })
  markNoShow(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationService.markNoShow(id);
  }

  @Patch(':id/check-in')
  @ApiOperation({ summary: 'Check in reservation with optional ID capture, deposit auth, room override' })
  @ApiResponse({ status: 200, description: 'Guest checked in' })
  checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CheckInDto,
  ) {
    return this.reservationService.checkIn(id, dto);
  }

  @Patch(':id/check-out')
  @ApiOperation({ summary: 'Check out reservation with optional express checkout and late fee' })
  @ApiResponse({ status: 200, description: 'Guest checked out' })
  checkOut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CheckOutDto,
  ) {
    return this.reservationService.checkOut(id, dto);
  }

  @Post(':id/express-checkout')
  @ApiOperation({ summary: 'Express checkout — auto-capture deposits and settle' })
  @ApiResponse({ status: 200, description: 'Express checkout completed' })
  expressCheckOut(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationService.expressCheckOut(id);
  }
}
