import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookDeliveryService } from './webhook-delivery.service';

@Module({
  providers: [WebhookService, WebhookDeliveryService],
  exports: [WebhookService, WebhookDeliveryService],
})
export class WebhookModule {}
