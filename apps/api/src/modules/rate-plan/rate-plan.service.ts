import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { ratePlans, rateRestrictions } from '@haip/database';
import { DRIZZLE } from '../../database/database.module';
import { CreateRatePlanDto } from './dto/create-rate-plan.dto';
import { UpdateRatePlanDto } from './dto/update-rate-plan.dto';
import { CreateRateRestrictionDto } from './dto/create-rate-restriction.dto';
import { UpdateRateRestrictionDto } from './dto/update-rate-restriction.dto';

@Injectable()
export class RatePlanService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // --- Rate Plans ---

  async create(dto: CreateRatePlanDto) {
    if (dto.type === 'derived') {
      if (!dto.parentRatePlanId || !dto.derivedAdjustmentType || !dto.derivedAdjustmentValue) {
        throw new BadRequestException(
          'Derived rate plans require parentRatePlanId, derivedAdjustmentType, and derivedAdjustmentValue',
        );
      }
      // Verify parent exists
      const [parent] = await this.db
        .select()
        .from(ratePlans)
        .where(eq(ratePlans.id, dto.parentRatePlanId));
      if (!parent) {
        throw new NotFoundException(`Parent rate plan ${dto.parentRatePlanId} not found`);
      }
      // Prevent circular reference
      if (parent.parentRatePlanId === dto.parentRatePlanId) {
        throw new BadRequestException('Circular derived rate chain detected');
      }
    }

    const [ratePlan] = await this.db
      .insert(ratePlans)
      .values(dto)
      .returning();
    return ratePlan;
  }

  async findAll(propertyId: string) {
    return this.db
      .select()
      .from(ratePlans)
      .where(
        and(eq(ratePlans.propertyId, propertyId), eq(ratePlans.isActive, true)),
      );
  }

  async findById(id: string) {
    const [ratePlan] = await this.db
      .select()
      .from(ratePlans)
      .where(eq(ratePlans.id, id));
    if (!ratePlan) {
      throw new NotFoundException(`Rate plan ${id} not found`);
    }
    return ratePlan;
  }

  async update(id: string, dto: UpdateRatePlanDto) {
    const [ratePlan] = await this.db
      .update(ratePlans)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(ratePlans.id, id))
      .returning();
    if (!ratePlan) {
      throw new NotFoundException(`Rate plan ${id} not found`);
    }
    return ratePlan;
  }

  /**
   * Calculate the effective rate for a derived rate plan.
   * Follows the parent chain to get the base amount, then applies the adjustment.
   */
  async calculateDerivedRate(id: string): Promise<{ effectiveRate: number; currency: string }> {
    const ratePlan = await this.findById(id);

    if (ratePlan.type !== 'derived' || !ratePlan.parentRatePlanId) {
      return {
        effectiveRate: Number(ratePlan.baseAmount),
        currency: ratePlan.currencyCode,
      };
    }

    const parent = await this.findById(ratePlan.parentRatePlanId);
    const parentAmount = Number(parent.baseAmount);
    const adjustmentValue = Number(ratePlan.derivedAdjustmentValue);

    let effectiveRate: number;
    if (ratePlan.derivedAdjustmentType === 'percentage') {
      effectiveRate = parentAmount * (1 + adjustmentValue / 100);
    } else {
      // fixed adjustment
      effectiveRate = parentAmount + adjustmentValue;
    }

    return {
      effectiveRate: Math.max(0, Number(effectiveRate.toFixed(2))),
      currency: ratePlan.currencyCode,
    };
  }

  // --- Rate Restrictions ---

  async createRestriction(ratePlanId: string, dto: CreateRateRestrictionDto) {
    await this.findById(ratePlanId); // Verify rate plan exists
    const [restriction] = await this.db
      .insert(rateRestrictions)
      .values({ ...dto, ratePlanId })
      .returning();
    return restriction;
  }

  async findRestrictions(ratePlanId: string) {
    return this.db
      .select()
      .from(rateRestrictions)
      .where(eq(rateRestrictions.ratePlanId, ratePlanId));
  }

  async updateRestriction(id: string, dto: UpdateRateRestrictionDto) {
    const [restriction] = await this.db
      .update(rateRestrictions)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(rateRestrictions.id, id))
      .returning();
    if (!restriction) {
      throw new NotFoundException(`Rate restriction ${id} not found`);
    }
    return restriction;
  }

  async deleteRestriction(id: string) {
    const [restriction] = await this.db
      .delete(rateRestrictions)
      .where(eq(rateRestrictions.id, id))
      .returning();
    if (!restriction) {
      throw new NotFoundException(`Rate restriction ${id} not found`);
    }
    return { deleted: true };
  }
}
