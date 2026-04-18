import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type {
  PaymentGateway,
  PaymentGatewayCallOptions,
  PaymentGatewayResult,
} from './interfaces/payment-gateway.interface';

/**
 * Stripe implementation of PaymentGateway.
 *
 * Uses PaymentIntents with manual capture (modern Stripe flow):
 * - authorize → create PaymentIntent with capture_method: 'manual'
 * - capture   → capture the PaymentIntent
 * - void      → cancel the PaymentIntent
 * - refund    → create a Refund on the PaymentIntent
 *
 * The `token` parameter is a Stripe PaymentMethod ID (pm_xxx) from Stripe.js/Elements.
 * The `transactionId` parameter is a Stripe PaymentIntent ID (pi_xxx).
 *
 * All mutating calls forward an `Idempotency-Key` header when the caller
 * supplies `options.idempotencyKey`. Stripe dedupes retries with the same
 * key for 24h, which is our second line of defense against double-charge
 * if the DB claim commits but the app retries before persisting success.
 */
@Injectable()
export class StripeGateway implements PaymentGateway {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeGateway.name);

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is required when STRIPE_MODE is not "mock". ' +
        'Set STRIPE_MODE=mock for development without Stripe keys.',
      );
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-03-31.basil',
      typescript: true,
    });
  }

  private requestOptions(options?: PaymentGatewayCallOptions): Stripe.RequestOptions | undefined {
    if (options?.idempotencyKey) {
      return { idempotencyKey: options.idempotencyKey };
    }
    return undefined;
  }

  async authorize(
    token: string,
    amount: number,
    currency: string,
    options?: PaymentGatewayCallOptions,
  ): Promise<PaymentGatewayResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: Math.round(amount * 100), // Stripe uses cents
          currency: currency.toLowerCase(),
          payment_method: token,
          capture_method: 'manual',
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never',
          },
        },
        this.requestOptions(options),
      );

      this.logger.log(`PaymentIntent created: ${paymentIntent.id} (${paymentIntent.status})`);

      if (paymentIntent.status === 'requires_capture') {
        return { success: true, transactionId: paymentIntent.id };
      }

      // Handle unexpected statuses
      return {
        success: false,
        transactionId: paymentIntent.id,
        errorMessage: `Unexpected status: ${paymentIntent.status}`,
      };
    } catch (err: any) {
      this.logger.error(`Stripe authorize failed: ${err.message}`, err.stack);
      return {
        success: false,
        transactionId: '',
        errorMessage: err.message ?? 'Authorization failed',
      };
    }
  }

  async capture(
    transactionId: string,
    amount?: number,
    options?: PaymentGatewayCallOptions,
  ): Promise<PaymentGatewayResult> {
    try {
      const params: Stripe.PaymentIntentCaptureParams = {};
      if (amount !== undefined) {
        params.amount_to_capture = Math.round(amount * 100);
      }

      const paymentIntent = await this.stripe.paymentIntents.capture(
        transactionId,
        params,
        this.requestOptions(options),
      );

      this.logger.log(`PaymentIntent captured: ${paymentIntent.id}`);

      return { success: true, transactionId: paymentIntent.id };
    } catch (err: any) {
      this.logger.error(`Stripe capture failed: ${err.message}`, err.stack);
      return {
        success: false,
        transactionId: transactionId,
        errorMessage: err.message ?? 'Capture failed',
      };
    }
  }

  async void(
    transactionId: string,
    options?: PaymentGatewayCallOptions,
  ): Promise<PaymentGatewayResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(
        transactionId,
        undefined,
        this.requestOptions(options),
      );

      this.logger.log(`PaymentIntent canceled: ${paymentIntent.id}`);

      return { success: true, transactionId: paymentIntent.id };
    } catch (err: any) {
      this.logger.error(`Stripe void failed: ${err.message}`, err.stack);
      return {
        success: false,
        transactionId: transactionId,
        errorMessage: err.message ?? 'Void failed',
      };
    }
  }

  async refund(
    transactionId: string,
    amount?: number,
    options?: PaymentGatewayCallOptions,
  ): Promise<PaymentGatewayResult> {
    try {
      const params: Stripe.RefundCreateParams = {
        payment_intent: transactionId,
      };
      if (amount !== undefined) {
        params.amount = Math.round(amount * 100);
      }

      const refund = await this.stripe.refunds.create(params, this.requestOptions(options));

      this.logger.log(`Refund created: ${refund.id} for ${transactionId}`);

      return { success: true, transactionId: refund.id };
    } catch (err: any) {
      this.logger.error(`Stripe refund failed: ${err.message}`, err.stack);
      return {
        success: false,
        transactionId: transactionId,
        errorMessage: err.message ?? 'Refund failed',
      };
    }
  }
}
