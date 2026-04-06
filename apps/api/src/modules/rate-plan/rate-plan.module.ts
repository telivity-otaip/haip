import { Module } from '@nestjs/common';
import { RatePlanController } from './rate-plan.controller';
import { RatePlanService } from './rate-plan.service';

@Module({
  controllers: [RatePlanController],
  providers: [RatePlanService],
  exports: [RatePlanService],
})
export class RatePlanModule {}
