import { Module, forwardRef } from '@nestjs/common';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { AvailabilityService } from './availability.service';
import { FolioModule } from '../folio/folio.module';
import { RoomModule } from '../room/room.module';
import { PaymentModule } from '../payment/payment.module';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [
    forwardRef(() => FolioModule),
    RoomModule,
    PaymentModule,
    WebhookModule,
  ],
  controllers: [ReservationController],
  providers: [ReservationService, AvailabilityService],
  exports: [ReservationService, AvailabilityService],
})
export class ReservationModule {}
