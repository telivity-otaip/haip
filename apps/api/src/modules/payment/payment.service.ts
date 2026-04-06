import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
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

  async capturePayment(id: string, propertyId: string) {
    const payment = await this.findById(id, propertyId);
    if (payment.status !== 'authorized') {
      throw new BadRequestException(`Cannot capture payment with status '${payment.status}'`);
    }

    const result = await this.gateway.capture(payment.gatewayTransactionId, parseFloat(payment.amount));
    if (!result.success) {
      throw new BadRequestException(`Capture failed: ${result.errorMessage}`);
    }

    const [updated] = await this.db
      .update(payments)
      .set({
        status: 'captured',
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, id), eq(payments.propertyId, propertyId)))
      .returning();

    await this.folioService.recalculateBalance(payment.folioId, propertyId);

    await this.webhookService.emit(
      'payment.received',
      'payment',
      updated.id,
      { folioId: payment.folioId, status: 'captured', amount: updated.amount },
      propertyId,
    );

    return updated;
  }

  async voidPayment(id: string, propertyId: string) {
    const payment = await this.findById(id, propertyId);
    if (payment.status !== 'authorized') {
      throw new BadRequestException(`Cannot void payment with status '${payment.status}'`);
    }

    const result = await this.gateway.void(payment.gatewayTransactionId);
    if (!result.success) {
      throw new BadRequestException(`Void failed: ${result.errorMessage}`);
    }

    const [updated] = await this.db
      .update(payments)
      .set({
        status: 'voided',
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, id), eq(payments.propertyId, propertyId)))
      .returning();

    await this.webhookService.emit(
      'payment.failed',
      'payment',
      updated.id,
      { folioId: payment.folioId, status: 'voided' },
      propertyId,
    );

    return updated;
  }

  async refundPayment(id: string, propertyId: string, amount?: string) {
    const payment = await this.findById(id, propertyId);
    if (!['captured', 'settled'].includes(payment.status)) {
      throw new BadRequestException(`Cannot refund payment with status '${payment.status}'`);
    }

    const refundAmount = amount ?? payment.amount;
    const result = await this.gateway.refund(payment.gatewayTransactionId, parseFloat(refundAmount));
    if (!result.success) {
      throw new BadRequestException(`Refund failed: ${result.errorMessage}`);
    }

    // Create refund payment record
    const [refund] = await this.db
      .insert(payments)
      .values({
        folioId: payment.folioId,
        propertyId,
        method: payment.method,
        amount: (parseFloat(refundAmount) * -1).toFixed(2),
        currencyCode: payment.currencyCode,
        status: 'captured',
        originalPaymentId: id,
        gatewayProvider: payment.gatewayProvider,
        gatewayTransactionId: result.transactionId,
        processedAt: new Date(),
        notes: `Refund of payment ${id}`,
      })
      .returning();

    // Update original payment status
    const isPartial = parseFloat(refundAmount) < parseFloat(payment.amount);
    await this.db
      .update(payments)
      .set({
        status: isPartial ? 'partially_refunded' : 'refunded',
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, id), eq(payments.propertyId, propertyId)));

    await this.folioService.recalculateBalance(payment.folioId, propertyId);

    await this.webhookService.emit(
      'payment.refunded',
      'payment',
      refund.id,
      { folioId: payment.folioId, originalPaymentId: id, refundAmount },
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
