import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { reservations, bookings, guests, rooms, roomTypes, ratePlans } from '@haip/database';
import { DRIZZLE } from '../../database/database.module';
import { assertTransition, type ReservationStatus } from './reservation-state-machine';
import { AvailabilityService } from './availability.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ModifyReservationDto } from './dto/modify-reservation.dto';
import { AssignRoomDto } from './dto/assign-room.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { ListReservationsDto } from './dto/list-reservations.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class ReservationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async create(dto: CreateReservationDto) {
    // Check guest is not DNR
    const [guest] = await this.db
      .select()
      .from(guests)
      .where(eq(guests.id, dto.guestId));
    if (!guest) {
      throw new NotFoundException(`Guest ${dto.guestId} not found`);
    }
    if (guest.isDnr) {
      throw new BadRequestException(
        `Guest ${dto.guestId} is on the Do Not Rent list: ${guest.dnrReason ?? 'No reason given'}`,
      );
    }

    // Calculate nights
    const arrival = new Date(dto.arrivalDate);
    const departure = new Date(dto.departureDate);
    const nights = Math.ceil(
      (departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (nights <= 0) {
      throw new BadRequestException('Departure date must be after arrival date');
    }

    // Generate confirmation number
    const confirmationNumber = `HAIP-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;

    // Create booking + reservation in a transaction-like flow
    // (Drizzle postgres-js doesn't have built-in transactions in the same way,
    //  but the operations are sequential and atomic per statement)
    const [booking] = await this.db
      .insert(bookings)
      .values({
        propertyId: dto.propertyId,
        guestId: dto.guestId,
        confirmationNumber,
        externalConfirmation: dto.externalConfirmation,
        source: dto.source,
        channelCode: dto.channelCode,
      })
      .returning();

    const [reservation] = await this.db
      .insert(reservations)
      .values({
        propertyId: dto.propertyId,
        bookingId: booking.id,
        guestId: dto.guestId,
        arrivalDate: dto.arrivalDate,
        departureDate: dto.departureDate,
        nights,
        roomTypeId: dto.roomTypeId,
        ratePlanId: dto.ratePlanId,
        totalAmount: dto.totalAmount,
        currencyCode: dto.currencyCode,
        adults: dto.adults ?? 1,
        children: dto.children ?? 0,
        specialRequests: dto.specialRequests,
        status: 'pending',
      })
      .returning();

    return { ...reservation, booking };
  }

  async confirm(id: string) {
    const reservation = await this.findByIdRaw(id);
    assertTransition(reservation.status as ReservationStatus, 'confirmed');

    const [updated] = await this.db
      .update(reservations)
      .set({ status: 'confirmed', updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();
    return updated;
  }

  async assignRoom(id: string, dto: AssignRoomDto) {
    const reservation = await this.findByIdRaw(id);
    assertTransition(reservation.status as ReservationStatus, 'assigned');

    // Verify room exists and matches room type
    const [room] = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.id, dto.roomId));
    if (!room) {
      throw new NotFoundException(`Room ${dto.roomId} not found`);
    }
    if (room.roomTypeId !== reservation.roomTypeId) {
      throw new BadRequestException(
        `Room ${dto.roomId} is type ${room.roomTypeId}, but reservation requires type ${reservation.roomTypeId}`,
      );
    }

    const [updated] = await this.db
      .update(reservations)
      .set({ roomId: dto.roomId, status: 'assigned', updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();
    return updated;
  }

  async cancel(id: string, dto: CancelReservationDto) {
    const reservation = await this.findByIdRaw(id);
    assertTransition(reservation.status as ReservationStatus, 'cancelled');

    const [updated] = await this.db
      .update(reservations)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: dto.cancellationReason,
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, id))
      .returning();
    return updated;
  }

  async markNoShow(id: string) {
    const reservation = await this.findByIdRaw(id);
    assertTransition(reservation.status as ReservationStatus, 'no_show');

    const [updated] = await this.db
      .update(reservations)
      .set({ status: 'no_show', updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();
    return updated;
  }

  async checkIn(id: string) {
    const reservation = await this.findByIdRaw(id);
    assertTransition(reservation.status as ReservationStatus, 'checked_in');

    // Check guest is not DNR at check-in time
    const [guest] = await this.db
      .select()
      .from(guests)
      .where(eq(guests.id, reservation.guestId));
    if (guest?.isDnr) {
      throw new BadRequestException(
        `Cannot check in: guest is on the Do Not Rent list`,
      );
    }

    const [updated] = await this.db
      .update(reservations)
      .set({
        status: 'checked_in',
        checkedInAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, id))
      .returning();
    return updated;
  }

  async checkOut(id: string) {
    const reservation = await this.findByIdRaw(id);
    // Allow check-out from checked_in, stayover, or due_out
    assertTransition(reservation.status as ReservationStatus, 'checked_out');

    const [updated] = await this.db
      .update(reservations)
      .set({
        status: 'checked_out',
        checkedOutAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, id))
      .returning();
    return updated;
  }

  async modify(id: string, dto: ModifyReservationDto) {
    const reservation = await this.findByIdRaw(id);

    // Can only modify before check-out
    const nonModifiable: ReservationStatus[] = ['checked_out', 'no_show', 'cancelled'];
    if (nonModifiable.includes(reservation.status as ReservationStatus)) {
      throw new BadRequestException(
        `Cannot modify reservation in '${reservation.status}' status`,
      );
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (dto.arrivalDate || dto.departureDate) {
      const arrival = dto.arrivalDate ?? reservation.arrivalDate;
      const departure = dto.departureDate ?? reservation.departureDate;
      const nights = Math.ceil(
        (new Date(departure).getTime() - new Date(arrival).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (nights <= 0) {
        throw new BadRequestException('Departure date must be after arrival date');
      }
      if (dto.arrivalDate) updates['arrivalDate'] = dto.arrivalDate;
      if (dto.departureDate) updates['departureDate'] = dto.departureDate;
      updates['nights'] = nights;
    }

    if (dto.roomTypeId) updates['roomTypeId'] = dto.roomTypeId;
    if (dto.ratePlanId) updates['ratePlanId'] = dto.ratePlanId;
    if (dto.totalAmount) updates['totalAmount'] = dto.totalAmount;
    if (dto.adults !== undefined) updates['adults'] = dto.adults;
    if (dto.children !== undefined) updates['children'] = dto.children;
    if (dto.specialRequests !== undefined)
      updates['specialRequests'] = dto.specialRequests;

    const [updated] = await this.db
      .update(reservations)
      .set(updates)
      .where(eq(reservations.id, id))
      .returning();
    return updated;
  }

  async findById(id: string) {
    // Join with guest, room type, rate plan, and room (if assigned)
    const results = await this.db
      .select({
        reservation: reservations,
        guest: guests,
        roomType: roomTypes,
        ratePlan: ratePlans,
        room: rooms,
      })
      .from(reservations)
      .leftJoin(guests, eq(reservations.guestId, guests.id))
      .leftJoin(roomTypes, eq(reservations.roomTypeId, roomTypes.id))
      .leftJoin(ratePlans, eq(reservations.ratePlanId, ratePlans.id))
      .leftJoin(rooms, eq(reservations.roomId, rooms.id))
      .where(eq(reservations.id, id));

    if (!results.length) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }

    return results[0];
  }

  async list(dto: ListReservationsDto) {
    const conditions: any[] = [];

    if (dto.propertyId) {
      conditions.push(eq(reservations.propertyId, dto.propertyId));
    }
    if (dto.status) {
      conditions.push(eq(reservations.status, dto.status as any));
    }
    if (dto.guestId) {
      conditions.push(eq(reservations.guestId, dto.guestId));
    }
    if (dto.arrivalDateFrom) {
      conditions.push(gte(reservations.arrivalDate, dto.arrivalDateFrom));
    }
    if (dto.arrivalDateTo) {
      conditions.push(lte(reservations.arrivalDate, dto.arrivalDateTo));
    }
    if (dto.departureDateFrom) {
      conditions.push(gte(reservations.departureDate, dto.departureDateFrom));
    }
    if (dto.departureDateTo) {
      conditions.push(lte(reservations.departureDate, dto.departureDateTo));
    }

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const offset = (page - 1) * limit;

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(reservations)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(reservations.arrivalDate),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(reservations)
        .where(whereClause),
    ]);

    return {
      data,
      total: Number(countResult[0]?.count ?? 0),
      page,
      limit,
    };
  }

  private async findByIdRaw(id: string) {
    const [reservation] = await this.db
      .select()
      .from(reservations)
      .where(eq(reservations.id, id));
    if (!reservation) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }
    return reservation;
  }
}
