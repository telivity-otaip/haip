import { Module } from '@nestjs/common';
import { ChannelController } from './channel.controller';
import { ChannelService } from './channel.service';
import { AriService } from './ari.service';
import { InboundReservationService } from './inbound-reservation.service';
import { RateParityService } from './rate-parity.service';
import { ChannelAdapterFactory } from './channel-adapter.factory';
import { MockChannelAdapter } from './adapters/mock.adapter';
import { BookingComAdapter } from './adapters/booking-com';
import { BookingComInboundController } from './adapters/booking-com/booking-com-inbound.controller';
import { SiteMinderAdapter } from './adapters/siteminder';
import { ReservationModule } from '../reservation/reservation.module';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [ReservationModule, WebhookModule],
  controllers: [ChannelController, BookingComInboundController],
  providers: [
    ChannelService,
    AriService,
    InboundReservationService,
    RateParityService,
    ChannelAdapterFactory,
    MockChannelAdapter,
    BookingComAdapter,
    SiteMinderAdapter,
  ],
  exports: [ChannelService, AriService, InboundReservationService],
})
export class ChannelModule {}
