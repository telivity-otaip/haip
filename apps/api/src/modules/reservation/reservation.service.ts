import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { reservations, bookings, guests, rooms, roomTypes, ratePlans, properties, payments } from '@haip/database';
import { DRIZZLE } from '../../database/database.module';
import { assertTransition, type ReservationStatus } from './reservation-state-machine';
import { AvailabilityService } from './availability.service';
import { FolioService } from '../folio/folio.service';
import { RoomStatusService } from '../room/room-status.service';
import { PaymentService } from '../payment/payment.service';
import { WebhookService } from '../webhook/webhook.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ModifyReservationDto } from './dto/modify-reservation.dto';
import { AssignRoomDto } from './dto/assign-room.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { ListReservationsDto } from './dto/list-reservations.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { GroupCheckInDto } from './dto/group-check-in.dto';
import { randomUUID, createCipheriv, randomBytes } from 'crypto';

@Injectable()
export class ReservationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly availabilityService: AvailabilityService,
    @Inject(forwardRef(() => FolioService)) private readonly folioService: FolioService,
    private readonly roomStatusService: RoomStatusService,
    private readonly paymentService: PaymentService,
    private readonly webhookService: WebhookService,
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

    const allowedStatuses = ['guest_ready', 'vacant_clean'];
    if (!allowedStatuses.includes(room.status)) {
      throw new BadRequestException(
        `Room ${dto.roomId} is not available (status: ${room.status}). Must be 'guest_ready' or 'vacant_clean'.`,
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

  async checkIn(id: string, dto: CheckInDto = {}) {
    const reservation = await this.findByIdRaw(id);
    assertTransition(reservation.status as ReservationStatus, 'checked_in');

    // DNR check
    const [guest] = await this.db
      .select()
      .from(guests)
      .where(eq(guests.id, reservation.guestId));
    if (guest?.isDnr) {
      throw new BadRequestException(
        `Cannot check in: guest is on the Do Not Rent list`,
      );
    }

    // Room validation
    const roomId = dto.roomId ?? reservation.roomId;
    if (dto.roomId) {
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
      const allowedStatuses = ['guest_ready', 'vacant_clean'];
      if (!allowedStatuses.includes(room.status)) {
        throw new BadRequestException(
          `Room ${dto.roomId} is not available (status: ${room.status})`,
        );
      }
    }
    if (!roomId) {
      throw new BadRequestException(
        'No room assigned — assign a room first or provide roomId',
      );
    }

    // ID capture (encrypted)
    let guestIdDocument: Record<string, string> | undefined;
    if (dto.idNumber) {
      const encrypted = this.encryptIdNumber(dto.idNumber);
      guestIdDocument = {
        type: dto.idType ?? 'unknown',
        encryptedNumber: encrypted.encrypted,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        country: dto.idCountry ?? '',
        expiry: dto.idExpiry ?? '',
      };
    }

    // Early check-in detection
    const [property] = await this.db
      .select()
      .from(properties)
      .where(eq(properties.id, reservation.propertyId));
    const now = new Date();
    let isEarlyCheckin = false;
    let earlyCheckinFee: string | undefined;

    if (property) {
      const checkInTime = property.checkInTime ?? '15:00';
      const [hours, minutes] = checkInTime.split(':').map(Number);
      const propertyNow = new Date(
        now.toLocaleString('en-US', { timeZone: property.timezone ?? 'UTC' }),
      );
      const standardCheckIn = new Date(propertyNow);
      standardCheckIn.setHours(hours, minutes, 0, 0);

      if (propertyNow < standardCheckIn) {
        isEarlyCheckin = true;
        const settings = property.settings as any;
        if (settings?.earlyCheckInFee && settings.earlyCheckInFee > 0) {
          earlyCheckinFee = String(settings.earlyCheckInFee);
        }
      }
    }

    // Update reservation
    const updateData: Record<string, unknown> = {
      status: 'checked_in',
      checkedInAt: now,
      actualArrivalTime: now,
      roomId,
      isEarlyCheckin,
      updatedAt: now,
    };
    if (guestIdDocument) updateData['guestIdDocument'] = guestIdDocument;
    if (earlyCheckinFee) updateData['earlyCheckinFee'] = earlyCheckinFee;
    if (dto.registrationSigned) updateData['registrationSignedAt'] = now;
    if (dto.specialRequests) {
      updateData['specialRequests'] = reservation.specialRequests
        ? `${reservation.specialRequests}\n${dto.specialRequests}`
        : dto.specialRequests;
    }

    const [updated] = await this.db
      .update(reservations)
      .set(updateData)
      .where(eq(reservations.id, id))
      .returning();

    // Auto-create guest folio on check-in
    const folio = await this.folioService.createAutoFolio(updated);

    // Post early check-in fee to folio
    if (earlyCheckinFee) {
      await this.folioService.postCharge(folio.id, {
        propertyId: reservation.propertyId,
        type: 'fee',
        description: 'Early check-in fee',
        amount: earlyCheckinFee,
        currencyCode: reservation.currencyCode,
        serviceDate: now.toISOString(),
      });
    }

    // Deposit authorization (if token provided and not skipped)
    let depositAuth: unknown = null;
    if (!dto.skipDepositAuth && dto.gatewayPaymentToken) {
      const depositAmount = dto.depositAmount
        ? String(dto.depositAmount)
        : (parseFloat(reservation.totalAmount) * 1.2).toFixed(2);
      try {
        depositAuth = await this.paymentService.authorizePayment({
          folioId: folio.id,
          propertyId: reservation.propertyId,
          amount: depositAmount,
          currencyCode: reservation.currencyCode,
          gatewayProvider: dto.gatewayProvider ?? 'stripe',
          gatewayPaymentToken: dto.gatewayPaymentToken,
          cardLastFour: dto.cardLastFour,
          cardBrand: dto.cardBrand,
        });
      } catch {
        // Deposit auth failure does not block check-in
      }
    }

    // Mark room occupied
    await this.roomStatusService.markOccupied(roomId, reservation.propertyId);

    // Emit webhook
    await this.webhookService.emit(
      'reservation.checked_in',
      'reservation',
      updated.id,
      { roomId, folioId: folio.id, isEarlyCheckin },
      reservation.propertyId,
    );

    return { reservation: updated, folio, depositAuth };
  }

  async checkOut(id: string, dto: CheckOutDto = {}) {
    const reservation = await this.findByIdRaw(id);
    assertTransition(reservation.status as ReservationStatus, 'checked_out');

    const now = new Date();

    // Late checkout detection
    const [property] = await this.db
      .select()
      .from(properties)
      .where(eq(properties.id, reservation.propertyId));

    let isLateCheckout = false;
    let lateCheckoutFeeAmount: string | undefined;

    if (property) {
      const checkOutTime = property.checkOutTime ?? '11:00';
      const [hours, minutes] = checkOutTime.split(':').map(Number);
      const propertyNow = new Date(
        now.toLocaleString('en-US', { timeZone: property.timezone ?? 'UTC' }),
      );
      const standardCheckOut = new Date(propertyNow);
      standardCheckOut.setHours(hours, minutes, 0, 0);

      if (propertyNow > standardCheckOut) {
        isLateCheckout = true;
        const fee = dto.lateCheckoutFee ?? (property.settings as any)?.lateCheckoutFee;
        if (fee && fee > 0) {
          lateCheckoutFeeAmount = String(fee);
        }
      }
    }

    // Get folios for this reservation
    const folioResult = await this.folioService.list({
      propertyId: reservation.propertyId,
      reservationId: reservation.id,
      page: 1,
      limit: 100,
    });
    const folios = folioResult.data;

    // Post late checkout fee to primary open folio
    if (lateCheckoutFeeAmount && folios.length > 0) {
      const openFolio = folios.find((f: any) => f.status === 'open');
      if (openFolio) {
        await this.folioService.postCharge(openFolio.id, {
          propertyId: reservation.propertyId,
          type: 'fee',
          description: 'Late checkout fee',
          amount: lateCheckoutFeeAmount,
          currencyCode: reservation.currencyCode,
          serviceDate: now.toISOString(),
        });
      }
    }

    // Express checkout path
    const folioSummary: Array<{ folioId: string; balance: string; status: string }> = [];

    if (dto.expressCheckout) {
      for (const folio of folios) {
        if (folio.status !== 'open') continue;

        // Capture all authorized payments
        const authorizedPayments = await this.db
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.folioId, folio.id),
              eq(payments.propertyId, reservation.propertyId),
              eq(payments.status, 'authorized' as any),
            ),
          );

        for (const payment of authorizedPayments) {
          try {
            await this.paymentService.capturePayment(payment.id, reservation.propertyId);
          } catch {
            // Continue with other payments
          }
        }

        // Refresh folio to check balance
        const refreshed = await this.folioService.findById(folio.id, reservation.propertyId);
        if (Math.abs(parseFloat(refreshed.balance)) <= 0.01) {
          await this.folioService.settle(folio.id, reservation.propertyId);
          folioSummary.push({ folioId: folio.id, balance: '0.00', status: 'settled' });
        } else {
          throw new BadRequestException(
            `Cannot express checkout: folio ${folio.folioNumber} has outstanding balance of ${refreshed.balance}`,
          );
        }
      }
    } else {
      // Non-express: compile folio summaries
      for (const folio of folios) {
        folioSummary.push({
          folioId: folio.id,
          balance: folio.balance,
          status: folio.status,
        });
      }
    }

    // Void remaining pre-auths (for non-express, or any that weren't captured)
    if (!dto.expressCheckout) {
      for (const folio of folios) {
        const authorizedPayments = await this.db
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.folioId, folio.id),
              eq(payments.propertyId, reservation.propertyId),
              eq(payments.status, 'authorized' as any),
            ),
          );
        for (const payment of authorizedPayments) {
          try {
            await this.paymentService.voidPayment(payment.id, reservation.propertyId);
          } catch {
            // Don't block checkout
          }
        }
      }
    }

    // Mark room vacant_dirty
    if (reservation.roomId) {
      await this.roomStatusService.markVacantDirty(reservation.roomId, reservation.propertyId);
    }

    // Update reservation
    const updateData: Record<string, unknown> = {
      status: 'checked_out',
      checkedOutAt: now,
      actualDepartureTime: now,
      isLateCheckout,
      updatedAt: now,
    };
    if (lateCheckoutFeeAmount) updateData['lateCheckoutFee'] = lateCheckoutFeeAmount;

    const [updated] = await this.db
      .update(reservations)
      .set(updateData)
      .where(eq(reservations.id, id))
      .returning();

    // Emit webhook
    await this.webhookService.emit(
      'reservation.checked_out',
      'reservation',
      updated.id,
      { isLateCheckout, expressCheckout: dto.expressCheckout ?? false },
      reservation.propertyId,
    );

    return { reservation: updated, folioSummary };
  }

  async expressCheckOut(id: string) {
    return this.checkOut(id, { expressCheckout: true });
  }

  async groupCheckIn(propertyId: string, dto: GroupCheckInDto) {
    const results: Array<{
      reservationId: string;
      success: boolean;
      data?: unknown;
      error?: string;
    }> = [];

    // Validate all reservations belong to the same property
    for (const item of dto.reservations) {
      const reservation = await this.findByIdRaw(item.reservationId);
      if (reservation.propertyId !== propertyId) {
        throw new BadRequestException(
          `Reservation ${item.reservationId} does not belong to property ${propertyId}`,
        );
      }
    }

    // Process each check-in individually
    for (const item of dto.reservations) {
      try {
        const result = await this.checkIn(item.reservationId, {
          roomId: item.roomId,
          skipDepositAuth: item.skipDepositAuth,
        });
        results.push({ reservationId: item.reservationId, success: true, data: result });
      } catch (err: any) {
        results.push({
          reservationId: item.reservationId,
          success: false,
          error: err.message ?? 'Unknown error',
        });
      }
    }

    return {
      total: results.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
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

  private encryptIdNumber(plainText: string): { encrypted: string; iv: string; authTag: string } {
    const key = process.env['ID_ENCRYPTION_KEY'];
    if (!key) {
      // If no encryption key configured, store a placeholder
      return { encrypted: '***REDACTED***', iv: '', authTag: '' };
    }
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return { encrypted, iv: iv.toString('hex'), authTag };
  }
}
