import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  providers: [EventsGateway, EventsService],
  exports: [EventsGateway],
})
export class EventsModule {}
