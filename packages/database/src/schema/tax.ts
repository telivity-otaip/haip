import { pgTable, uuid, varchar, text, boolean, timestamp, numeric, integer, date, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { properties } from './property.js';

/**
 * Tax profiles — jurisdiction-specific tax configuration per property.
 * Each property has one active tax profile defining all applicable taxes.
 */
export const taxProfiles = pgTable('tax_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id),

  name: varchar('name', { length: 100 }).notNull(), // "Miami Beach Tax Profile"
  jurisdictionCode: varchar('jurisdiction_code', { length: 50 }).notNull(), // "US-FL-MIAMI-BEACH"

  isActive: boolean('is_active').notNull().default(true),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'), // Nullable — open-ended

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Tax rule calculation types.
 */
export const taxRuleTypeEnum = pgEnum('tax_rule_type', [
  'percentage',       // e.g., 6% of charge amount
  'flat_per_night',   // e.g., $2.50 per night
  'flat_per_stay',    // e.g., $10 one-time per stay
  'split_component',  // rate applied to splitPercentage % of the charge (e.g., DE breakfast: 7% VAT on 70% food portion)
]);

/**
 * Tax rules — individual tax lines within a profile.
 * Sort order matters for compounding (tax-on-tax).
 *
 * Exemptions JSONB structure:
 * {
 *   guestTypes?: string[],  // ['government', 'military']
 *   minStayNights?: number, // Exempt if stay >= N nights
 *   maxNights?: number,     // Only charge for first N nights (e.g., Barcelona tourist tax)
 * }
 */
export const taxRules = pgTable('tax_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  taxProfileId: uuid('tax_profile_id').notNull().references(() => taxProfiles.id),

  name: varchar('name', { length: 100 }).notNull(), // "Florida State Sales Tax"
  code: varchar('code', { length: 30 }).notNull(), // "FL_SALES"
  type: taxRuleTypeEnum('type').notNull(),

  rate: numeric('rate', { precision: 8, scale: 4 }).notNull(), // 6.0000 for 6%, or 2.50 for flat

  // Only used when type = 'split_component'. Percentage of the charge to which
  // `rate` is applied (e.g., 70.00 = rate applies to 70% of charge).
  // Nullable — required at the DTO layer only when type=split_component.
  splitPercentage: numeric('split_percentage', { precision: 5, scale: 2 }),

  appliesToChargeTypes: text('applies_to_charge_types').array(), // ['room', 'room_upgrade'] or null for all
  exemptions: jsonb('exemptions').$type<{
    guestTypes?: string[];
    minStayNights?: number;
    maxNights?: number;
  }>(),

  isCompounding: boolean('is_compounding').notNull().default(false), // Tax-on-tax
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),

  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
