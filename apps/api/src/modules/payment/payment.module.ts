import { Module } from '@nestjs/common';
import { FolioModule } from '../folio/folio.module';
import { WebhookModule } from '../webhook/webhook.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { MockGateway } from './mock-gateway';
import { PAYMENT_GATEWAY } from './interfaces/payment-gateway.interface';

@Module({
  imports: [FolioModule, WebhookModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    { provide: PAYMENT_GATEWAY, useClass: MockGateway },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
