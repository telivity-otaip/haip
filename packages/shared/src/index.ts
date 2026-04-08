/**
 * HAIP Shared — Types, constants, and utilities shared across packages.
 */

/** Webhook event types following entity.action pattern */
export const WEBHOOK_EVENTS = {
  // Reservation events
  'reservation.created': 'reservation.created',
  'reservation.confirmed': 'reservation.confirmed',
  'reservation.modified': 'reservation.modified',
  'reservation.cancelled': 'reservation.cancelled',
  'reservation.checked_in': 'reservation.checked_in',
  'reservation.checked_out': 'reservation.checked_out',
  'reservation.no_show': 'reservation.no_show',

  // Folio events
  'folio.created': 'folio.created',
  'folio.charge_posted': 'folio.charge_posted',
  'folio.settled': 'folio.settled',

  // Payment events
  'payment.received': 'payment.received',
  'payment.refunded': 'payment.refunded',
  'payment.failed': 'payment.failed',

  // Room events
  'room.status_changed': 'room.status_changed',

  // Housekeeping events
  'housekeeping.task_assigned': 'housekeeping.task_assigned',
  'housekeeping.task_completed': 'housekeeping.task_completed',

  // Night audit events
  'audit.started': 'audit.started',
  'audit.completed': 'audit.completed',

  // Channel manager events
  'channel.connected': 'channel.connected',
  'channel.disconnected': 'channel.disconnected',
  'channel.sync_completed': 'channel.sync_completed',
  'channel.sync_failed': 'channel.sync_failed',
  'channel.reservation_received': 'channel.reservation_received',

  // Connect/Agent events
  'connect.booking_created': 'connect.booking_created',
  'connect.booking_modified': 'connect.booking_modified',
  'connect.booking_cancelled': 'connect.booking_cancelled',
  'connect.subscription_created': 'connect.subscription_created',

  // AI Agent events
  'agent.run_completed': 'agent.run_completed',
  'agent.decision_created': 'agent.decision_created',
  'agent.decision_executed': 'agent.decision_executed',
  'agent.training_completed': 'agent.training_completed',
  'rate.ai_adjusted': 'rate.ai_adjusted',
} as const;

export type WebhookEvent = keyof typeof WEBHOOK_EVENTS;
