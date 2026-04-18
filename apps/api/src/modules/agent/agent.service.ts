import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { agentConfigs, agentDecisions, agentTrainingSnapshots } from '@haip/database';
import { DRIZZLE } from '../../database/database.module';
import { WebhookService } from '../webhook/webhook.service';
import type {
  HaipAgent,
  AgentContext,
  AgentDecisionRecord,
  AgentOutcome,
} from './interfaces/haip-agent.interface';

const VALID_AGENT_TYPES = [
  'pricing', 'demand_forecast', 'channel_mix', 'overbooking',
  'night_audit', 'housekeeping', 'cancellation', 'guest_comms', 'review_response',
];

@Injectable()
export class AgentService {
  private agents: Map<string, HaipAgent> = new Map();

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly webhookService: WebhookService,
  ) {}

  /** Register an agent implementation. Called by sub-agents on init. */
  registerAgent(agent: HaipAgent) {
    this.agents.set(agent.agentType, agent);
  }

  /**
   * Run a full agent cycle: analyze → recommend → store decisions.
   * If autopilot enabled and confidence meets threshold, auto-execute.
   */
  async runAgent(propertyId: string, agentType: string, context?: AgentContext) {
    const agent = this.getAgentImpl(agentType);
    const config = await this.getOrCreateConfig(propertyId, agentType);

    if (!config.isEnabled) {
      return { skipped: true, reason: 'Agent is disabled' };
    }

    // 1. Analyze
    const analysis = await agent.analyze(propertyId, context);

    // 2. Recommend
    const recommendations = await agent.recommend(analysis);

    // 3. Store decisions
    const decisions: any[] = [];
    const threshold = parseFloat(config.autopilotConfidenceThreshold ?? '0.85');

    for (const rec of recommendations) {
      const shouldAutoExecute =
        config.mode === 'autopilot' && rec.confidence >= threshold;

      // Always insert as pending first — update to auto_executed only on success
      const [decision] = await this.db
        .insert(agentDecisions)
        .values({
          propertyId,
          agentType: agentType as any,
          decisionType: rec.decisionType,
          inputSnapshot: rec.inputSnapshot,
          recommendation: rec.recommendation,
          confidence: rec.confidence.toFixed(2),
          status: 'pending',
        })
        .returning();

      // Auto-execute if in autopilot mode
      if (shouldAutoExecute) {
        try {
          await agent.execute({
            ...rec,
            id: decision.id,
            propertyId,
            agentType,
            status: 'auto_executed',
          });
          // Mark as auto_executed only on success
          await this.db
            .update(agentDecisions)
            .set({ status: 'auto_executed', executedAt: new Date() })
            .where(eq(agentDecisions.id, decision.id));
          decision.status = 'auto_executed';
        } catch (error: any) {
          // Mark as failed with error details
          await this.db
            .update(agentDecisions)
            .set({
              status: 'rejected',
              outcome: { error: error.message ?? 'Execution failed', autoExecutionFailed: true },
            })
            .where(eq(agentDecisions.id, decision.id));
          decision.status = 'rejected';
        }
      }

      decisions.push(decision);
    }

    // Update last run timestamp
    await this.db
      .update(agentConfigs)
      .set({ lastRunAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(agentConfigs.propertyId, propertyId),
          eq(agentConfigs.agentType, agentType as any),
        ),
      );

    await this.webhookService.emit(
      'agent.run_completed',
      'agent',
      propertyId,
      { agentType, decisionsCount: decisions.length },
      propertyId,
    );

    return {
      agentType,
      decisionsCount: decisions.length,
      decisions: decisions.map((d: any) => ({
        id: d.id,
        decisionType: d.decisionType,
        confidence: d.confidence,
        status: d.status,
      })),
    };
  }

  /** Approve a pending decision and execute it. */
  async approveDecision(propertyId: string, decisionId: string, userId?: string) {
    const decision = await this.getDecisionById(decisionId, propertyId);

    if (decision.status !== 'pending') {
      throw new BadRequestException(`Decision is ${decision.status}, cannot approve`);
    }

    const agent = this.getAgentImpl(decision.agentType);

    // Execute
    const result = await agent.execute({
      id: decision.id,
      propertyId,
      agentType: decision.agentType,
      decisionType: decision.decisionType,
      recommendation: decision.recommendation,
      confidence: parseFloat(decision.confidence),
      inputSnapshot: decision.inputSnapshot,
      status: 'approved',
    });

    // Update status
    const [updated] = await this.db
      .update(agentDecisions)
      .set({
        status: 'approved',
        approvedBy: userId ?? null,
        executedAt: new Date(),
      })
      .where(eq(agentDecisions.id, decisionId))
      .returning();

    await this.webhookService.emit(
      'agent.decision_executed',
      'agent_decision',
      decisionId,
      { agentType: decision.agentType, decisionType: decision.decisionType },
      propertyId,
    );

    return { decision: updated, execution: result };
  }

  /** Reject a pending decision. */
  async rejectDecision(propertyId: string, decisionId: string, userId?: string, reason?: string) {
    const decision = await this.getDecisionById(decisionId, propertyId);

    if (decision.status !== 'pending') {
      throw new BadRequestException(`Decision is ${decision.status}, cannot reject`);
    }

    const [updated] = await this.db
      .update(agentDecisions)
      .set({
        status: 'rejected',
        approvedBy: userId ?? null,
        outcome: reason ? { rejectionReason: reason } : null,
      })
      .where(eq(agentDecisions.id, decisionId))
      .returning();

    return updated;
  }

  /** Record actual outcome for a past decision (feedback loop). */
  async recordOutcome(propertyId: string, decisionId: string, outcome: AgentOutcome) {
    const decision = await this.getDecisionById(decisionId, propertyId);
    const agent = this.agents.get(decision.agentType);

    await this.db
      .update(agentDecisions)
      .set({
        outcome: outcome.actualResult,
        outcomeRecordedAt: new Date(),
      })
      .where(eq(agentDecisions.id, decisionId));

    if (agent) {
      await agent.recordOutcome(decisionId, outcome);
    }
  }

  /** Get or create agent config for a property. Uses upsert to prevent race conditions. */
  async getOrCreateConfig(propertyId: string, agentType: string) {
    this.validateAgentType(agentType);

    const [existing] = await this.db
      .select()
      .from(agentConfigs)
      .where(
        and(
          eq(agentConfigs.propertyId, propertyId),
          eq(agentConfigs.agentType, agentType as any),
        ),
      );

    if (existing) return existing;

    // Create default config using onConflictDoNothing to handle race conditions
    const agent = this.agents.get(agentType);
    const defaultConfig = agent?.getDefaultConfig() ?? {};

    await this.db
      .insert(agentConfigs)
      .values({
        propertyId,
        agentType: agentType as any,
        isEnabled: false,
        mode: 'suggest',
        config: defaultConfig,
      })
      .onConflictDoNothing();

    // Re-fetch to get the row (whether we created it or someone else did)
    const [config] = await this.db
      .select()
      .from(agentConfigs)
      .where(
        and(
          eq(agentConfigs.propertyId, propertyId),
          eq(agentConfigs.agentType, agentType as any),
        ),
      );

    return config;
  }

  /** Update agent config. */
  async updateConfig(propertyId: string, agentType: string, updates: Record<string, unknown>) {
    const config = await this.getOrCreateConfig(propertyId, agentType);

    const setValues: Record<string, unknown> = { updatedAt: new Date() };
    if (updates['isEnabled'] !== undefined) setValues['isEnabled'] = updates['isEnabled'];
    if (updates['mode'] !== undefined) setValues['mode'] = updates['mode'];
    if (updates['autopilotConfidenceThreshold'] !== undefined)
      setValues['autopilotConfidenceThreshold'] = String(updates['autopilotConfidenceThreshold']);
    if (updates['config'] !== undefined) setValues['config'] = updates['config'];

    const [updated] = await this.db
      .update(agentConfigs)
      .set(setValues)
      .where(eq(agentConfigs.id, config.id))
      .returning();

    return updated;
  }

  /** List all agent statuses for a property. */
  async listAgentStatuses(propertyId: string) {
    const statuses = [];

    for (const agentType of VALID_AGENT_TYPES) {
      const config = await this.getOrCreateConfig(propertyId, agentType);

      // Count recent decisions
      const recentDecisions = await this.db
        .select()
        .from(agentDecisions)
        .where(
          and(
            eq(agentDecisions.propertyId, propertyId),
            eq(agentDecisions.agentType, agentType as any),
          ),
        )
        .orderBy(desc(agentDecisions.createdAt))
        .limit(5);

      const pendingCount = recentDecisions.filter((d: any) => d.status === 'pending').length;

      statuses.push({
        agentType,
        isEnabled: config.isEnabled,
        mode: config.mode,
        lastRunAt: config.lastRunAt,
        lastTrainedAt: config.lastTrainedAt,
        pendingDecisions: pendingCount,
        hasImplementation: this.agents.has(agentType),
      });
    }

    return statuses;
  }

  /** Get decision history for an agent. */
  async getDecisions(propertyId: string, agentType: string, limit = 50) {
    this.validateAgentType(agentType);

    return this.db
      .select()
      .from(agentDecisions)
      .where(
        and(
          eq(agentDecisions.propertyId, propertyId),
          eq(agentDecisions.agentType, agentType as any),
        ),
      )
      .orderBy(desc(agentDecisions.createdAt))
      .limit(limit);
  }

  /** Get agent performance metrics. */
  async getPerformance(propertyId: string, agentType: string) {
    this.validateAgentType(agentType);

    const decisions = await this.db
      .select()
      .from(agentDecisions)
      .where(
        and(
          eq(agentDecisions.propertyId, propertyId),
          eq(agentDecisions.agentType, agentType as any),
        ),
      )
      .orderBy(desc(agentDecisions.createdAt))
      .limit(200);

    const total = decisions.length;
    const withOutcome = decisions.filter((d: any) => d.outcome !== null);
    const approved = decisions.filter((d: any) => d.status === 'approved' || d.status === 'auto_executed');
    const rejected = decisions.filter((d: any) => d.status === 'rejected');

    // Calculate average confidence
    const avgConfidence = total > 0
      ? decisions.reduce((sum: number, d: any) => sum + parseFloat(d.confidence), 0) / total
      : 0;

    return {
      agentType,
      totalDecisions: total,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      autoExecutedCount: decisions.filter((d: any) => d.status === 'auto_executed').length,
      outcomeCount: withOutcome.length,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      approvalRate: total > 0 ? Math.round((approved.length / total) * 100) : 0,
    };
  }

  // --- Private ---

  private getAgentImpl(agentType: string): HaipAgent {
    this.validateAgentType(agentType);
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new BadRequestException(`Agent '${agentType}' is not implemented yet`);
    }
    return agent;
  }

  private async getDecisionById(decisionId: string, propertyId: string) {
    const [decision] = await this.db
      .select()
      .from(agentDecisions)
      .where(
        and(
          eq(agentDecisions.id, decisionId),
          eq(agentDecisions.propertyId, propertyId),
        ),
      );

    if (!decision) {
      throw new NotFoundException(`Decision ${decisionId} not found`);
    }
    return decision;
  }

  private validateAgentType(agentType: string) {
    if (!VALID_AGENT_TYPES.includes(agentType)) {
      throw new BadRequestException(
        `Invalid agent type: '${agentType}'. Valid: ${VALID_AGENT_TYPES.join(', ')}`,
      );
    }
  }
}
