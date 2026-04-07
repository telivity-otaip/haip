import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { eq, and, gte, desc } from 'drizzle-orm';
import { agentWebhookSubscriptions, auditLogs } from '@haip/database';
import { DRIZZLE } from '../../database/database.module';
import type { CreateSubscriptionDto } from './dto/agent-event-subscription.dto';

@Injectable()
export class ConnectEventsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  /**
   * Create an event subscription for an OTAIP agent.
   */
  async createSubscription(dto: CreateSubscriptionDto) {
    const [subscription] = await this.db
      .insert(agentWebhookSubscriptions)
      .values({
        propertyId: dto.propertyId,
        subscriberId: dto.subscriberId,
        subscriberName: dto.subscriberName,
        callbackUrl: dto.callbackUrl,
        events: dto.events,
        secret: dto.secret,
      })
      .returning();

    return subscription;
  }

  /**
   * List subscriptions for a property.
   */
  async listSubscriptions(propertyId: string) {
    return this.db
      .select()
      .from(agentWebhookSubscriptions)
      .where(
        and(
          eq(agentWebhookSubscriptions.propertyId, propertyId),
          eq(agentWebhookSubscriptions.isActive, true),
        ),
      );
  }

  /**
   * Delete (deactivate) a subscription.
   */
  async deleteSubscription(id: string) {
    const [subscription] = await this.db
      .select()
      .from(agentWebhookSubscriptions)
      .where(eq(agentWebhookSubscriptions.id, id));

    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    await this.db
      .update(agentWebhookSubscriptions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(agentWebhookSubscriptions.id, id));

    return { deleted: true, id };
  }

  /**
   * Send a test event to verify a subscription's callback URL.
   */
  async testSubscription(id: string) {
    const [subscription] = await this.db
      .select()
      .from(agentWebhookSubscriptions)
      .where(eq(agentWebhookSubscriptions.id, id));

    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    // Log the test delivery (no actual HTTP call — needs BullMQ for reliable delivery)
    await this.db
      .update(agentWebhookSubscriptions)
      .set({
        lastDeliveryAt: new Date(),
        lastDeliveryStatus: 'test_logged',
        updatedAt: new Date(),
      })
      .where(eq(agentWebhookSubscriptions.id, id));

    return {
      testSent: true,
      subscriptionId: id,
      callbackUrl: subscription.callbackUrl,
      note: 'Test event logged. Actual HTTP delivery requires BullMQ (not yet configured).',
    };
  }

  /**
   * Poll events — fallback for agents that can't receive webhooks.
   * Queries auditLogs table filtered by propertyId, action, and timestamp.
   */
  async pollEvents(propertyId: string, since?: string, types?: string[], limit = 50) {
    const conditions = [eq(auditLogs.propertyId, propertyId)];

    if (since) {
      conditions.push(gte(auditLogs.occurredAt, new Date(since)));
    }

    let events = await this.db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.occurredAt))
      .limit(limit);

    // Filter by event type patterns if specified
    if (types?.length) {
      events = events.filter((e: any) => {
        const eventType = `${e.entityType}.${e.action}`;
        return types.some((pattern) => this.matchesEventPattern(eventType, pattern));
      });
    }

    return events.map((e: any) => ({
      id: e.id,
      type: `${e.entityType}.${e.action}`,
      propertyId: e.propertyId,
      entityType: e.entityType,
      entityId: e.entityId,
      data: e.newValue ?? {},
      occurredAt: e.occurredAt.toISOString(),
    }));
  }

  /**
   * Handle all webhook events — match against subscriptions and log delivery.
   * Listens to all events via wildcard.
   */
  @OnEvent('**')
  async handleEvent(payload: any) {
    if (!payload?.propertyId || !payload?.event) return;

    // Find matching subscriptions
    const subscriptions = await this.db
      .select()
      .from(agentWebhookSubscriptions)
      .where(
        and(
          eq(agentWebhookSubscriptions.propertyId, payload.propertyId),
          eq(agentWebhookSubscriptions.isActive, true),
        ),
      );

    for (const sub of subscriptions) {
      const events = (sub.events ?? []) as string[];
      if (events.some((pattern: string) => this.matchesEventPattern(payload.event, pattern))) {
        // Log the delivery attempt (no actual HTTP call yet)
        await this.db
          .update(agentWebhookSubscriptions)
          .set({
            lastDeliveryAt: new Date(),
            lastDeliveryStatus: 'logged',
            updatedAt: new Date(),
          })
          .where(eq(agentWebhookSubscriptions.id, sub.id));
      }
    }
  }

  /**
   * Match event type against subscription pattern.
   * Supports wildcards: 'reservation.*' matches 'reservation.created'.
   */
  matchesEventPattern(eventType: string, pattern: string): boolean {
    if (pattern === '*' || pattern === '**') return true;

    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return eventType.startsWith(prefix + '.');
    }

    return eventType === pattern;
  }
}
