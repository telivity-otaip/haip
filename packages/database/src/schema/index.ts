/**
 * HAIP Database Schema — All core entities.
 *
 * Domain knowledge source: kb/HAIP_KNOWLEDGE_BASE.md
 * DO NOT INVENT HOTEL DOMAIN LOGIC.
 */

// Property
export { properties } from './property.js';

// Rooms & Room Types
export { roomStatusEnum, roomTypes, rooms } from './room.js';

// Guests
export { vipLevelEnum, guests } from './guest.js';

// Reservations & Bookings
export {
  reservationStatusEnum,
  bookingSourceEnum,
  bookings,
  reservations,
} from './reservation.js';

// Rate Plans & Restrictions
export {
  ratePlanTypeEnum,
  ratePlans,
  rateRestrictions,
} from './rate-plan.js';

// Folios, Charges & Payments
export {
  folioTypeEnum,
  folioStatusEnum,
  folios,
  chargeTypeEnum,
  charges,
  paymentMethodEnum,
  paymentStatusEnum,
  payments,
} from './folio.js';

// Housekeeping
export {
  housekeepingTaskStatusEnum,
  housekeepingTaskTypeEnum,
  housekeepingTasks,
} from './housekeeping.js';

// Audit
export {
  auditRunStatusEnum,
  auditRuns,
  auditLogs,
} from './audit.js';

// Channel Manager
export {
  channelStatusEnum,
  syncDirectionEnum,
  channelConnections,
  ariSyncLogs,
} from './channel.js';

// Connect / Agent Subscriptions
export { agentWebhookSubscriptions } from './connect.js';

// Tax
export {
  taxProfiles,
  taxRuleTypeEnum,
  taxRules,
} from './tax.js';

// AI Agents
export {
  agentTypeEnum,
  agentModeEnum,
  agentDecisionStatusEnum,
  agentConfigs,
  agentDecisions,
  agentTrainingSnapshots,
} from './agent.js';
