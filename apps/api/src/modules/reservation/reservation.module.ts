import { Module, forwardRef } from '@nestjs/common';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { AvailabilityService } from './availability.service';
import { FolioModule } from '../folio/folio.module';

@Module({
  imports: [forwardRef(() => FolioModule)],
  controllers: [ReservationController],
  providers: [ReservationService, AvailabilityService],
  exports: [ReservationService, AvailabilityService],
})
export class ReservationModule {}
