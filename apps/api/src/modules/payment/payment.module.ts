import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FolioModule } from '../folio/folio.module';
import { WebhookModule } from '../webhook/webhook.module';
import { PaymentController } from './payment.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { PaymentService } from './payment.service';
import { MockGateway } from './mock-gateway';
import { StripeGateway } from './stripe-gateway';
import { PAYMENT_GATEWAY } from './interfaces/payment-gateway.interface';

/**
 * Payment module with configurable gateway.
 *
 * STRIPE_MODE environment variable controls which gateway is used:
 * - 'mock' (default) → MockGateway — no HTTP calls, returns fake success. Use for tests and CI.
 * - 'test' → StripeGateway with test API keys — real Stripe calls in test mode.
 * - 'live' → StripeGateway with live API keys — real charges.
 *
 * When STRIPE_MODE is 'mock', no STRIPE_SECRET_KEY is required.
 */
@Module({
  imports: [ConfigModule, FolioModule, WebhookModule],
  controllers: [PaymentController, StripeWebhookController],
  providers: [
    PaymentService,
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (configService: ConfigService) => {
        const mode = configService.get<string>('STRIPE_MODE', 'mock');

        if (mode === 'mock') {
          return new MockGateway();
        }

        // 'test' or 'live' — use real Stripe
        return new StripeGateway(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
