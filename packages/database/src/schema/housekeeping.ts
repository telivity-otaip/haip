import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, integer, pgEnum } from 'drizzle-orm/pg-core';
import { properties } from './property.js';
import { rooms } from './room.js';

/**
 * Housekeeping task status (KB 5.6):
 * Turnover workflow: checkout → dirty → assigned → in_progress → completed → inspected
 */
export const housekeepingTaskStatusEnum = pgEnum('housekeeping_task_status', [
  'pending',        // Created, not yet assigned
  'assigned',       // Assigned to housekeeper
  'in_progress',    // Housekeeper started
  'completed',      // Cleaning done, awaiting inspection
  'inspected',      // Inspector approved → room becomes guest_ready
  'skipped',        // Guest declined service (stayover)
]);

export const housekeepingTaskTypeEnum = pgEnum('housekeeping_task_type', [
  'checkout',       // Full turnover clean (20-30 min, KB 5.6)
  'stayover',       // Daily maintenance clean
  'deep_clean',     // Periodic deep clean
  'inspection',     // Inspector walk-through
  'turndown',       // Evening turndown service
  'maintenance',    // Repair task
]);

/**
 * Housekeeping Tasks — room cleaning and maintenance assignments (KB 5.6).
 * Auto-assigned based on floor/priority.
 * Checklist per room type, photo verification, inspector sign-off.
 */
export const housekeepingTasks = pgTable('housekeeping_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id),
  roomId: uuid('room_id').notNull().references(() => rooms.id),

  type: housekeepingTaskTypeEnum('type').notNull(),
  status: housekeepingTaskStatusEnum('status').notNull().default('pending'),
  priority: integer('priority').notNull().default(0), // Higher = more urgent

  // Assignment
  assignedTo: uuid('assigned_to'), // Staff user ID
  assignedAt: timestamp('assigned_at', { withTimezone: true }),

  // Tracking (KB 5.6: turn-time analytics)
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  inspectedBy: uuid('inspected_by'), // Inspector user ID
  inspectedAt: timestamp('inspected_at', { withTimezone: true }),

  // Checklist (KB 5.6: digital inspection checklists per room type)
  checklist: jsonb('checklist').$type<Array<{ item: string; checked: boolean; notes?: string }>>(),

  // Notes & issues
  notes: text('notes'),
  maintenanceRequired: boolean('maintenance_required').notNull().default(false),
  maintenanceNotes: text('maintenance_notes'),

  // Service date (which business day this task belongs to)
  serviceDate: timestamp('service_date', { mode: 'date' }).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
