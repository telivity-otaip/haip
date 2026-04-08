import { pgTable, uuid, varchar, text, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { properties } from './property.js';
import { reservations } from './reservation.js';

export const reviewSourceEnum = pgEnum('review_source', [
  'google',
  'tripadvisor',
  'booking_com',
  'expedia',
  'other',
]);

export const reviewResponseStatusEnum = pgEnum('review_response_status', [
  'pending',
  'drafted',
  'approved',
  'posted',
]);

/**
 * Guest Reviews — entered manually or imported.
 * Linked to reservations when guest can be matched.
 */
export const guestReviews = pgTable('guest_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => properties.id),
  source: reviewSourceEnum('source').notNull(),
  guestName: varchar('guest_name', { length: 200 }).notNull(),
  rating: integer('rating').notNull(), // 1-5
  reviewText: text('review_text').notNull(),
  stayDate: varchar('stay_date', { length: 10 }), // ISO date, optional
  reservationId: uuid('reservation_id').references(() => reservations.id),

  // Response
  responseStatus: reviewResponseStatusEnum('response_status').notNull().default('pending'),
  responseText: text('response_text'),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  respondedBy: uuid('responded_by'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
