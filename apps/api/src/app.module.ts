import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { PropertyModule } from './modules/property/property.module';
import { RoomModule } from './modules/room/room.module';
import { GuestModule } from './modules/guest/guest.module';
import { ReservationModule } from './modules/reservation/reservation.module';
import { FolioModule } from './modules/folio/folio.module';
import { RatePlanModule } from './modules/rate-plan/rate-plan.module';
import { PaymentModule } from './modules/payment/payment.module';
import { HousekeepingModule } from './modules/housekeeping/housekeeping.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    HealthModule,
    PropertyModule,
    RoomModule,
    GuestModule,
    ReservationModule,
    FolioModule,
    RatePlanModule,
    PaymentModule,
    HousekeepingModule,
  ],
})
export class AppModule {}
