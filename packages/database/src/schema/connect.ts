import { pgTable, uuid, varchar, boolean, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { properties } from './property.js';

/**
 * Agent Webhook Subscriptions — OTAIP agents subscribe to PMS events.
 * Subscription system for real-time event delivery to external agents.
 */
export const agentWebhookSubscriptions = pgTable('agent_webhook_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id),

  subscriberId: varchar('subscriber_id', { length: 100 }).notNull(),
  subscriberName: varchar('subscriber_name', { length: 200 }),
  callbackUrl: varchar('callback_url', { length: 500 }).notNull(),

  // Which events to receive
  events: jsonb('events').$type<string[]>().notNull(),

  // Authentication
  secret: varchar('secret', { length: 200 }),

  // State
  isActive: boolean('is_active').notNull().default(true),
  lastDeliveryAt: timestamp('last_delivery_at', { withTimezone: true }),
  lastDeliveryStatus: varchar('last_delivery_status', { length: 20 }),
  failureCount: integer('failure_count').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
