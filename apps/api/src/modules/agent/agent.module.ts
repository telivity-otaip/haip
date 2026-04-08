import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { WebhookModule } from '../webhook/webhook.module';
import { DemandForecastAgent } from './demand/demand.agent';
import { DynamicPricingAgent } from './pricing/pricing.agent';
import { ChannelMixAgent } from './channel-mix/channel-mix.agent';
import { OverbookingAgent } from './overbooking/overbooking.agent';
import { NightAuditAnomalyAgent } from './night-audit/night-audit-anomaly.agent';
import { HousekeepingOptimizerAgent } from './housekeeping/housekeeping-optimizer.agent';
import { CancellationPredictorAgent } from './cancellation/cancellation-predictor.agent';

@Module({
  imports: [WebhookModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    DemandForecastAgent,
    DynamicPricingAgent,
    ChannelMixAgent,
    OverbookingAgent,
    NightAuditAnomalyAgent,
    HousekeepingOptimizerAgent,
    CancellationPredictorAgent,
  ],
  exports: [AgentService, DemandForecastAgent],
})
export class AgentModule {}
