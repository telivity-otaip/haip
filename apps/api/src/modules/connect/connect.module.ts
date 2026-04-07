import { Module } from '@nestjs/common';
import { ConnectController } from './connect.controller';
import { ConnectSearchService } from './connect-search.service';
import { ConnectContentService } from './connect-content.service';
import { ConnectBookingService } from './connect-booking.service';
import { ConnectEventsService } from './connect-events.service';
import { ConnectInsightsService } from './connect-insights.service';
import { ReservationModule } from '../reservation/reservation.module';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [ReservationModule, WebhookModule],
  controllers: [ConnectController],
  providers: [
    ConnectSearchService,
    ConnectContentService,
    ConnectBookingService,
    ConnectEventsService,
    ConnectInsightsService,
  ],
  exports: [ConnectSearchService, ConnectBookingService],
})
export class ConnectModule {}
