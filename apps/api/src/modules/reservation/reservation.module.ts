import { Module } from '@nestjs/common';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { AvailabilityService } from './availability.service';

@Module({
  controllers: [ReservationController],
  providers: [ReservationService, AvailabilityService],
  exports: [ReservationService, AvailabilityService],
})
export class ReservationModule {}
