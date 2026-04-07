import { Module } from '@nestjs/common';
import { FolioModule } from '../folio/folio.module';
import { ReservationModule } from '../reservation/reservation.module';
import { HousekeepingModule } from '../housekeeping/housekeeping.module';
import { RoomModule } from '../room/room.module';
import { WebhookModule } from '../webhook/webhook.module';
import { NightAuditController } from './night-audit.controller';
import { NightAuditService } from './night-audit.service';

@Module({
  imports: [
    FolioModule,
    ReservationModule,
    HousekeepingModule,
    RoomModule,
    WebhookModule,
  ],
  controllers: [NightAuditController],
  providers: [NightAuditService],
  exports: [NightAuditService],
})
export class NightAuditModule {}
