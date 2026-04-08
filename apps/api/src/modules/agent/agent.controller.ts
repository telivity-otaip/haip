import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { AgentService } from './agent.service';
import { UpdateAgentConfigDto } from './dto/agent-config.dto';
import { RejectDecisionDto } from './dto/agent-decision.dto';

@ApiTags('AI Agents')
@Controller('agents')
@Roles('admin')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get(':propertyId')
  @ApiOperation({ summary: 'List all agents with status for a property' })
  async listAgents(@Param('propertyId', ParseUUIDPipe) propertyId: string) {
    return this.agentService.listAgentStatuses(propertyId);
  }

  @Get(':propertyId/:agentType/config')
  @ApiOperation({ summary: 'Get agent configuration' })
  async getConfig(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('agentType') agentType: string,
  ) {
    return this.agentService.getOrCreateConfig(propertyId, agentType);
  }

  @Put(':propertyId/:agentType/config')
  @ApiOperation({ summary: 'Update agent configuration' })
  async updateConfig(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('agentType') agentType: string,
    @Body() dto: UpdateAgentConfigDto,
  ) {
    return this.agentService.updateConfig(propertyId, agentType, dto as any);
  }

  @Post(':propertyId/:agentType/run')
  @ApiOperation({ summary: 'Trigger a manual agent run' })
  async runAgent(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('agentType') agentType: string,
  ) {
    return this.agentService.runAgent(propertyId, agentType, { triggeredBy: 'manual' });
  }

  @Get(':propertyId/:agentType/decisions')
  @ApiOperation({ summary: 'Get decision history for an agent' })
  @ApiQuery({ name: 'limit', required: false })
  async getDecisions(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('agentType') agentType: string,
    @Query('limit') limit?: string,
  ) {
    return this.agentService.getDecisions(
      propertyId,
      agentType,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Post(':propertyId/decisions/:id/approve')
  @ApiOperation({ summary: 'Approve a pending recommendation' })
  async approveDecision(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentService.approveDecision(propertyId, id);
  }

  @Post(':propertyId/decisions/:id/reject')
  @ApiOperation({ summary: 'Reject a pending recommendation' })
  async rejectDecision(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDecisionDto,
  ) {
    return this.agentService.rejectDecision(propertyId, id, undefined, dto.reason);
  }

  @Get(':propertyId/:agentType/performance')
  @ApiOperation({ summary: 'Get agent performance metrics' })
  async getPerformance(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('agentType') agentType: string,
  ) {
    return this.agentService.getPerformance(propertyId, agentType);
  }
}
