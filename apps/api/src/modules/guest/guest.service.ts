import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, ilike, or, and, sql } from 'drizzle-orm';
import { guests } from '@haip/database';
import { DRIZZLE } from '../../database/database.module';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { SearchGuestsDto } from './dto/search-guests.dto';

@Injectable()
export class GuestService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async create(dto: CreateGuestDto) {
    const values: Record<string, unknown> = { ...dto };
    if (dto.gdprConsentMarketing) {
      values['gdprConsentDate'] = new Date();
    }
    const [guest] = await this.db.insert(guests).values(values).returning();
    return guest;
  }

  async findById(id: string) {
    const [guest] = await this.db
      .select()
      .from(guests)
      .where(eq(guests.id, id));
    if (!guest) {
      throw new NotFoundException(`Guest ${id} not found`);
    }
    return guest;
  }

  async update(id: string, dto: UpdateGuestDto) {
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

  async delete(id: string) {
    const [guest] = await this.db
      .delete(guests)
      .where(eq(guests.id, id))
      .returning();
    if (!guest) {
      throw new NotFoundException(`Guest ${id} not found`);
    }
    return { deleted: true };
  }

  async search(dto: SearchGuestsDto) {
    const conditions: any[] = [];

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

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

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
