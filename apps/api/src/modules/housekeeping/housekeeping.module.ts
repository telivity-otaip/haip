import { Module } from '@nestjs/common';
import { HousekeepingController } from './housekeeping.controller';
import { HousekeepingService } from './housekeeping.service';
import { RoomModule } from '../room/room.module';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [RoomModule, WebhookModule],
  controllers: [HousekeepingController],
  providers: [HousekeepingService],
  exports: [HousekeepingService],
})
export class HousekeepingModule {}
