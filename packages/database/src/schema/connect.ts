import { pgTable, uuid, varchar, boolean, timestamp, jsonb, integer, text, pgEnum } from 'drizzle-orm/pg-core';
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

/**
 * Webhook delivery status.
 */
export const webhookDeliveryStatusEnum = pgEnum('webhook_delivery_status', [
  'pending',
  'delivered',
  'failed',
]);

/**
 * Webhook Deliveries — one row per (event, subscription) pair.
 * Tracks delivery attempts with retry schedule and HMAC-signed POSTs.
 */
export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id),
  subscriptionId: uuid('subscription_id').notNull().references(() => agentWebhookSubscriptions.id),

  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),

  status: webhookDeliveryStatusEnum('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
  lastStatusCode: integer('last_status_code'),
  lastError: text('last_error'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
});
