import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { Decimal } from 'decimal.js';
import { payments } from '@haip/database';
import { DRIZZLE } from '../../database/database.module';
import { WebhookService } from '../webhook/webhook.service';
import { FolioService } from '../folio/folio.service';
import { PAYMENT_GATEWAY } from './interfaces/payment-gateway.interface';
import type { PaymentGateway } from './interfaces/payment-gateway.interface';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AuthorizePaymentDto } from './dto/authorize-payment.dto';
import { ListPaymentsDto } from './dto/list-payments.dto';

const CARD_METHODS = ['credit_card', 'debit_card', 'vcc'];

@Injectable()
export class PaymentService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly folioService: FolioService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly webhookService: WebhookService,
  ) {}

  async recordPayment(dto: CreatePaymentDto) {
    if (CARD_METHODS.includes(dto.method)) {
      throw new BadRequestException(
        `Card payments must use the authorize flow. Use POST /payments/authorize instead.`,
      );
    }

    const folio = await this.folioService.findById(dto.folioId, dto.propertyId);
    if (folio.status !== 'open') {
      throw new BadRequestException('Cannot record payment on a folio that is not open');
    }

    const [payment] = await this.db
      .insert(payments)
      .values({
        ...dto,
        status: 'captured',
        processedAt: new Date(),
      })
      .returning();

    await this.folioService.recalculateBalance(dto.folioId, dto.propertyId);

    await this.webhookService.emit(
      'payment.received',
      'payment',
      payment.id,
      { folioId: dto.folioId, method: payment.method, amount: payment.amount, status: 'captured' },
      dto.propertyId,
    );

    return payment;
  }

  async authorizePayment(dto: AuthorizePaymentDto) {
    const folio = await this.folioService.findById(dto.folioId, dto.propertyId);
    if (folio.status !== 'open') {
      throw new BadRequestException('Cannot authorize payment on a folio that is not open');
    }

    const result = await this.gateway.authorize(
      dto.gatewayPaymentToken,
      parseFloat(dto.amount),
      dto.currencyCode,
    );

    if (!result.success) {
      const [failed] = await this.db
        .insert(payments)
        .values({
          folioId: dto.folioId,
          propertyId: dto.propertyId,
          method: 'credit_card',
          amount: dto.amount,
          currencyCode: dto.currencyCode,
          status: 'failed',
          gatewayProvider: dto.gatewayProvider,
          gatewayPaymentToken: dto.gatewayPaymentToken,
          gatewayTransactionId: result.transactionId,
          cardLastFour: dto.cardLastFour,
          cardBrand: dto.cardBrand,
          notes: result.errorMessage,
        })
        .returning();

      await this.webhookService.emit(
        'payment.failed',
        'payment',
        failed.id,
        { folioId: dto.folioId, error: result.errorMessage },
        dto.propertyId,
      );

      throw new BadRequestException(`Authorization failed: ${result.errorMessage}`);
    }

    const preAuthExpiry = dto.preAuthExpiresAt
      ? new Date(dto.preAuthExpiresAt)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

    const [payment] = await this.db
      .insert(payments)
      .values({
        folioId: dto.folioId,
        propertyId: dto.propertyId,
        method: 'credit_card',
        amount: dto.amount,
        currencyCode: dto.currencyCode,
        status: 'authorized',
        isPreAuthorization: true,
        preAuthExpiresAt: preAuthExpiry,
        gatewayProvider: dto.gatewayProvider,
        gatewayPaymentToken: dto.gatewayPaymentToken,
        gatewayTransactionId: result.transactionId,
        cardLastFour: dto.cardLastFour,
        cardBrand: dto.cardBrand,
        notes: dto.notes,
      })
      .returning();

    // Do NOT recalculate balance — pre-auth is a hold, not a capture
    await this.webhookService.emit(
      'payment.received',
      'payment',
      payment.id,
      { folioId: dto.folioId, status: 'authorized', amount: payment.amount },
      dto.propertyId,
    );

    return payment;
  }

  /**
   * Capture an authorized payment.
   *
   * Concurrency-safe two-phase flow:
   *  1. Atomic conditional UPDATE from `authorized` → `captured` in a short tx.
   *     If the update matches zero rows, another request already claimed it.
   *  2. Call Stripe OUTSIDE the tx with an idempotency key. If Stripe fails,
   *     revert the row back to `authorized` so the client can retry.
   *
   * This prevents the classic read-then-act race where two requests both see
   * `authorized` and both call Stripe. The DB wins the race; Stripe's
   * idempotency key provides a second line of defense if a retry slips past.
   */
  async capturePayment(id: string, propertyId: string) {
    // Phase 1: atomically claim the payment (authorized → captured)
    const [claimed] = await this.db
      .update(payments)
      .set({
        status: 'captured',
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(payments.id, id),
          eq(payments.propertyId, propertyId),
          eq(payments.status, 'authorized'),
        ),
      )
      .returning();

    if (!claimed) {
      // Either the payment doesn't exist, doesn't belong to this property,
      // or isn't in `authorized` state. Distinguish for a useful error.
      const existing = await this.db
        .select()
        .from(payments)
        .where(and(eq(payments.id, id), eq(payments.propertyId, propertyId)));
      if (!existing || existing.length === 0) {
        throw new NotFoundException(`Payment ${id} not found`);
      }
      throw new ConflictException(
        `Cannot capture payment with status '${existing[0].status}' (expected 'authorized')`,
      );
    }

    // Phase 2: call Stripe outside the DB tx with an idempotency key
    const result = await this.gateway.capture(
      claimed.gatewayTransactionId,
      parseFloat(claimed.amount),
      { idempotencyKey: `cap_${id}` },
    );

    if (!result.success) {
      // Revert to authorized so the caller can retry
      await this.db
        .update(payments)
        .set({ status: 'authorized', processedAt: null, updatedAt: new Date() })
        .where(and(eq(payments.id, id), eq(payments.propertyId, propertyId)));
      throw new BadRequestException(`Capture failed: ${result.errorMessage}`);
    }

    await this.folioService.recalculateBalance(claimed.folioId, propertyId);

    await this.webhookService.emit(
      'payment.received',
      'payment',
      claimed.id,
      { folioId: claimed.folioId, status: 'captured', amount: claimed.amount },
      propertyId,
    );

    return claimed;
  }

  /**
   * Void an authorized payment. Same two-phase concurrency-safe pattern as capture.
   */
  async voidPayment(id: string, propertyId: string) {
    // Phase 1: atomically claim the payment (authorized → voided)
    const [claimed] = await this.db
      .update(payments)
      .set({ status: 'voided', updatedAt: new Date() })
      .where(
        and(
          eq(payments.id, id),
          eq(payments.propertyId, propertyId),
          eq(payments.status, 'authorized'),
        ),
      )
      .returning();

    if (!claimed) {
      const existing = await this.db
        .select()
        .from(payments)
        .where(and(eq(payments.id, id), eq(payments.propertyId, propertyId)));
      if (!existing || existing.length === 0) {
        throw new NotFoundException(`Payment ${id} not found`);
      }
      throw new ConflictException(
        `Cannot void payment with status '${existing[0].status}' (expected 'authorized')`,
      );
    }

    const result = await this.gateway.void(claimed.gatewayTransactionId, {
      idempotencyKey: `void_${id}`,
    });

    if (!result.success) {
      await this.db
        .update(payments)
        .set({ status: 'authorized', updatedAt: new Date() })
        .where(and(eq(payments.id, id), eq(payments.propertyId, propertyId)));
      throw new BadRequestException(`Void failed: ${result.errorMessage}`);
    }

    await this.webhookService.emit(
      'payment.failed',
      'payment',
      claimed.id,
      { folioId: claimed.folioId, status: 'voided' },
      propertyId,
    );

    return claimed;
  }

  /**
   * Refund a captured/settled payment.
   *
   * Two-phase concurrency-safe flow:
   *  1. Conditional UPDATE claims the original payment by transitioning its
   *     status to `refunded` or `partially_refunded`. A status guard on
   *     `captured`/`settled` ensures only one concurrent request succeeds.
   *  2. Stripe call happens outside the DB tx with an idempotency key.
   *     On failure, revert the status to what it was.
   */
  async refundPayment(id: string, propertyId: string, amount?: string) {
    // Load the original payment to decide partial vs full and sanity check status
    const [original] = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.propertyId, propertyId)));

    if (!original) {
      throw new NotFoundException(`Payment ${id} not found`);
    }
    if (!['captured', 'settled'].includes(original.status)) {
      throw new BadRequestException(
        `Cannot refund payment with status '${original.status}'`,
      );
    }

    const refundAmount = amount ?? original.amount;
    // Money math via decimal.js — keep as strings everywhere
    const refundAmountDec = new Decimal(refundAmount);
    const originalAmountDec = new Decimal(original.amount);
    if (refundAmountDec.lte(0)) {
      throw new BadRequestException('Refund amount must be positive');
    }
    if (refundAmountDec.gt(originalAmountDec)) {
      throw new BadRequestException('Refund amount cannot exceed original payment amount');
    }
    const isPartial = refundAmountDec.lt(originalAmountDec);
    const newStatus = isPartial ? 'partially_refunded' : 'refunded';
    const prevStatus = original.status;

    // Phase 1: atomically claim the original by transitioning its status.
    // The status guard on the prior status ensures only one concurrent
    // refund succeeds — a second refund will hit `partially_refunded`
    // (or `refunded`) and fall through.
    const [claimed] = await this.db
      .update(payments)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(
        and(
          eq(payments.id, id),
          eq(payments.propertyId, propertyId),
          eq(payments.status, prevStatus),
        ),
      )
      .returning();

    if (!claimed) {
      throw new ConflictException(
        `Payment ${id} is no longer in '${prevStatus}' state — concurrent refund?`,
      );
    }

    // Phase 2: call Stripe with idempotency key derived from the refund amount
    // so that different partial refunds get different keys, but a retry of the
    // same logical refund is deduped by Stripe.
    const result = await this.gateway.refund(
      original.gatewayTransactionId,
      refundAmountDec.toNumber(),
      { idempotencyKey: `ref_${id}_${refundAmountDec.toFixed(2)}` },
    );

    if (!result.success) {
      // Revert status
      await this.db
        .update(payments)
        .set({ status: prevStatus, updatedAt: new Date() })
        .where(and(eq(payments.id, id), eq(payments.propertyId, propertyId)));
      throw new BadRequestException(`Refund failed: ${result.errorMessage}`);
    }

    // Create refund payment record (negative amount via decimal.js)
    const refundRowAmount = refundAmountDec.negated().toFixed(2);
    const [refund] = await this.db
      .insert(payments)
      .values({
        folioId: original.folioId,
        propertyId,
        method: original.method,
        amount: refundRowAmount,
        currencyCode: original.currencyCode,
        status: 'captured',
        originalPaymentId: id,
        gatewayProvider: original.gatewayProvider,
        gatewayTransactionId: result.transactionId,
        processedAt: new Date(),
        notes: `Refund of payment ${id}`,
      })
      .returning();

    await this.folioService.recalculateBalance(original.folioId, propertyId);

    await this.webhookService.emit(
      'payment.refunded',
      'payment',
      refund.id,
      { folioId: original.folioId, originalPaymentId: id, refundAmount },
      propertyId,
    );

    return refund;
  }

  async findById(id: string, propertyId: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.propertyId, propertyId)));
    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }
    return payment;
  }

  async list(dto: ListPaymentsDto) {
    const conditions: any[] = [eq(payments.propertyId, dto.propertyId)];

    if (dto.folioId) conditions.push(eq(payments.folioId, dto.folioId));
    if (dto.status) conditions.push(eq(payments.status, dto.status as any));
    if (dto.method) conditions.push(eq(payments.method, dto.method as any));

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const offset = (page - 1) * limit;
    const whereClause = and(...conditions);

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(payments)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(payments.createdAt),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(payments)
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
