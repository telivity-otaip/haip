import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, ilike, or, and, sql, inArray } from 'drizzle-orm';
import { guests, reservations } from '@haip/database';
import { DRIZZLE } from '../../database/database.module';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { SearchGuestsDto } from './dto/search-guests.dto';

/**
 * GuestService
 *
 * Multi-tenancy note: guests are cross-property by design (one person may stay
 * at multiple hotels), but API access MUST verify a reservation link at the
 * requesting property — otherwise staff at hotel A can read/modify guest PII
 * belonging to hotel B's customers. Every read/update/delete is scoped by
 * "has this guest at least one reservation at `propertyId`?".
 *
 * The one exception is `create()`: a brand-new walk-in has no reservation yet,
 * so creation is NOT scoped by an existing link. The caller still passes its
 * own `propertyId` for audit purposes. Callers that need "find existing guest
 * by email before creating" should expose a dedicated lookup rather than
 * searching unscoped.
 */
@Injectable()
export class GuestService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  /**
   * Verify that a guest has at least one reservation at the given property.
   * Throws NotFoundException if they don't — identical response to "no such
   * guest" to avoid leaking cross-property existence.
   */
  private async assertGuestAtProperty(guestId: string, propertyId: string): Promise<void> {
    const hasStayed = await this.db
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.guestId, guestId),
          eq(reservations.propertyId, propertyId),
        ),
      )
      .limit(1);
    if (!hasStayed.length) {
      throw new NotFoundException(`Guest ${guestId} not found`);
    }
  }

  async create(dto: CreateGuestDto) {
    const values: Record<string, unknown> = { ...dto };
    if (dto.gdprConsentMarketing) {
      values['gdprConsentDate'] = new Date();
    }
    const [guest] = await this.db.insert(guests).values(values).returning();
    return guest;
  }

  async findById(id: string, propertyId: string) {
    await this.assertGuestAtProperty(id, propertyId);
    const [guest] = await this.db
      .select()
      .from(guests)
      .where(eq(guests.id, id));
    if (!guest) {
      throw new NotFoundException(`Guest ${id} not found`);
    }
    return guest;
  }

  async update(id: string, propertyId: string, dto: UpdateGuestDto) {
    await this.assertGuestAtProperty(id, propertyId);
    const values: Record<string, unknown> = { ...dto, updatedAt: new Date() };
    if (dto.isDnr === true && !dto.dnrReason) {
      // Keep existing reason if not provided
    }
    if (dto.isDnr === true) {
      values['dnrDate'] = new Date();
    }
    if (dto.isDnr === false) {
      values['dnrReason'] = null;
      values['dnrDate'] = null;
    }
    if (dto.gdprConsentMarketing !== undefined) {
      values['gdprConsentDate'] = dto.gdprConsentMarketing ? new Date() : null;
    }

    const [guest] = await this.db
      .update(guests)
      .set(values)
      .where(eq(guests.id, id))
      .returning();
    if (!guest) {
      throw new NotFoundException(`Guest ${id} not found`);
    }
    return guest;
  }

  async delete(id: string, propertyId: string) {
    await this.assertGuestAtProperty(id, propertyId);
    const [guest] = await this.db
      .delete(guests)
      .where(eq(guests.id, id))
      .returning();
    if (!guest) {
      throw new NotFoundException(`Guest ${id} not found`);
    }
    return { deleted: true };
  }

  async search(propertyId: string, dto: SearchGuestsDto) {
    // Scope to guests with ≥1 reservation at this property.
    // Subquery: distinct guest_id from reservations where property_id = $1.
    const conditions: any[] = [
      inArray(
        guests.id,
        this.db
          .select({ guestId: reservations.guestId })
          .from(reservations)
          .where(eq(reservations.propertyId, propertyId)),
      ),
    ];

    if (dto.search) {
      const pattern = `%${dto.search}%`;
      conditions.push(
        or(
          ilike(guests.firstName, pattern),
          ilike(guests.lastName, pattern),
          ilike(guests.email, pattern),
          ilike(guests.phone, pattern),
        ),
      );
    }

    if (dto.loyaltyNumber) {
      conditions.push(eq(guests.loyaltyNumber, dto.loyaltyNumber));
    }

    if (dto.vipLevel) {
      conditions.push(eq(guests.vipLevel, dto.vipLevel as any));
    }

    if (dto.isDnr !== undefined) {
      conditions.push(eq(guests.isDnr, dto.isDnr));
    }

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const offset = (page - 1) * limit;

    const whereClause = and(...conditions);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(guests)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(guests.lastName, guests.firstName),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(guests)
        .where(whereClause),
    ]);

    return {
      data,
      total: Number(countResult[0]?.count ?? 0),
      page,
      limit,
    };
  }
}
