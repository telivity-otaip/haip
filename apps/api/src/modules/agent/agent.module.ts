import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { WebhookModule } from '../webhook/webhook.module';
import { DemandForecastAgent } from './demand/demand.agent';
import { DynamicPricingAgent } from './pricing/pricing.agent';
import { ChannelMixAgent } from './channel-mix/channel-mix.agent';
import { OverbookingAgent } from './overbooking/overbooking.agent';

@Module({
  imports: [WebhookModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    DemandForecastAgent,
    DynamicPricingAgent,
    ChannelMixAgent,
    OverbookingAgent,
  ],
  exports: [AgentService, DemandForecastAgent],
})
export class AgentModule {}
