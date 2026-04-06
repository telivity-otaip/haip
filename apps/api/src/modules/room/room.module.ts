import { Module } from '@nestjs/common';
import { WebhookModule } from '../webhook/webhook.module';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { RoomStatusService } from './room-status.service';

@Module({
  imports: [WebhookModule],
  controllers: [RoomController],
  providers: [RoomService, RoomStatusService],
  exports: [RoomService, RoomStatusService],
})
export class RoomModule {}
