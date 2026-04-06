import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { folios, reservations, payments } from '@haip/database';
import { DRIZZLE } from '../../database/database.module';
import { FolioService } from './folio.service';
import { TransferCityLedgerDto } from './dto/transfer-city-ledger.dto';
import type { CreateChargeDto } from './dto/create-charge.dto';

@Injectable()
export class FolioRoutingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly folioService: FolioService,
  ) {}

  async routeCharge(
    reservationId: string,
    propertyId: string,
    chargeType: string,
    chargeDto: CreateChargeDto,
  ) {
    // Look up routing rules from reservation preferences
    const [reservation] = await this.db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.id, reservationId),
          eq(reservations.propertyId, propertyId),
        ),
      );
    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }

    const routing = reservation.preferences?.routing as Record<string, string> | undefined;
    let targetFolioId: string | null = null;

    if (routing) {
      targetFolioId = routing[chargeType] ?? routing['default'] ?? null;
    }

    if (!targetFolioId) {
      const defaultFolio = await this.findDefaultFolio(reservationId, propertyId);
      targetFolioId = defaultFolio.id;
    }

    return this.folioService.postCharge(targetFolioId!, chargeDto);
  }

  async findDefaultFolio(reservationId: string, propertyId: string) {
    const [folio] = await this.db
      .select()
      .from(folios)
      .where(
        and(
          eq(folios.reservationId, reservationId),
          eq(folios.propertyId, propertyId),
          eq(folios.type, 'guest'),
        ),
      );
    if (!folio) {
      throw new NotFoundException(
        `No guest folio found for reservation ${reservationId}`,
      );
    }
    return folio;
  }

  async transferToCityLedger(
    folioId: string,
    propertyId: string,
    dto: TransferCityLedgerDto,
  ) {
    const sourceFolio = await this.folioService.findById(folioId, propertyId);
    const remainingBalance = parseFloat(sourceFolio.balance);

    if (remainingBalance <= 0) {
      return { message: 'No outstanding balance to transfer' };
    }

    // Create city ledger folio
    const cityLedgerFolio = await this.folioService.create({
      propertyId,
      guestId: sourceFolio.guestId,
      type: 'city_ledger',
      currencyCode: sourceFolio.currencyCode,
      companyName: dto.companyName,
      billingAddress: dto.billingAddress,
      paymentTermsDays: dto.paymentTermsDays,
    });

    // Record city_ledger payment on the source folio (zeroes out the guest folio)
    await this.db
      .insert(payments)
      .values({
        folioId,
        propertyId,
        method: 'city_ledger',
        amount: remainingBalance.toFixed(2),
        currencyCode: sourceFolio.currencyCode,
        status: 'captured',
        processedAt: new Date(),
        notes: `Transferred to city ledger: ${dto.companyName}`,
      });

    await this.folioService.recalculateBalance(folioId, propertyId);

    // Post matching charge on the city ledger folio
    await this.folioService.postCharge(cityLedgerFolio.id, {
      propertyId,
      type: 'fee',
      description: `Transfer from folio ${sourceFolio.folioNumber}`,
      amount: remainingBalance.toFixed(2),
      currencyCode: sourceFolio.currencyCode,
      serviceDate: new Date().toISOString(),
    });

    return {
      sourceFolioId: folioId,
      cityLedgerFolioId: cityLedgerFolio.id,
      transferredAmount: remainingBalance.toFixed(2),
    };
  }
}
