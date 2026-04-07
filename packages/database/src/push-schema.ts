/**
 * Push schema to database using drizzle-orm's migrate API.
 * Workaround for drizzle-kit CJS/.js extension issue.
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from './schema/index.js';

const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://haip:haip@localhost:5432/haip';

async function main() {
  const client = postgres(DATABASE_URL);
  const db = drizzle(client, { schema });

  // Create enums
  const enums = [
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_status') THEN CREATE TYPE room_status AS ENUM ('vacant_clean','vacant_dirty','clean','inspected','guest_ready','occupied','out_of_order','out_of_service'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vip_level') THEN CREATE TYPE vip_level AS ENUM ('none','silver','gold','platinum','diamond'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN CREATE TYPE reservation_status AS ENUM ('pending','confirmed','assigned','checked_in','stayover','due_out','checked_out','no_show','cancelled'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_source') THEN CREATE TYPE booking_source AS ENUM ('direct','ota','gds','phone','walk_in','agent','group','corporate'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rate_plan_type') THEN CREATE TYPE rate_plan_type AS ENUM ('bar','derived','negotiated','package','promotional'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'folio_type') THEN CREATE TYPE folio_type AS ENUM ('guest','master','city_ledger'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'folio_status') THEN CREATE TYPE folio_status AS ENUM ('open','settled','closed'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'charge_type') THEN CREATE TYPE charge_type AS ENUM ('room','tax','food_beverage','minibar','phone','laundry','parking','spa','incidental','fee','adjustment','package'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN CREATE TYPE payment_method AS ENUM ('credit_card','debit_card','cash','bank_transfer','city_ledger','vcc','other'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN CREATE TYPE payment_status AS ENUM ('pending','authorized','captured','settled','refunded','partially_refunded','failed','voided'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'housekeeping_task_status') THEN CREATE TYPE housekeeping_task_status AS ENUM ('pending','assigned','in_progress','completed','inspected','skipped'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'housekeeping_task_type') THEN CREATE TYPE housekeeping_task_type AS ENUM ('checkout','stayover','deep_clean','inspection','turndown','maintenance'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_run_status') THEN CREATE TYPE audit_run_status AS ENUM ('running','completed','failed','rolled_back'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_status') THEN CREATE TYPE channel_status AS ENUM ('active','inactive','error','pending_setup'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_direction') THEN CREATE TYPE sync_direction AS ENUM ('push','pull','bidirectional'); END IF; END $$`,
  ];

  for (const e of enums) {
    await db.execute(sql.raw(e));
  }

  // Create tables
  const tables = [
    // properties
    `CREATE TABLE IF NOT EXISTS properties (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar(255) NOT NULL,
      code varchar(20) NOT NULL UNIQUE,
      description text,
      address_line_1 varchar(255),
      address_line_2 varchar(255),
      city varchar(100),
      state_province varchar(100),
      postal_code varchar(20),
      country_code varchar(2) NOT NULL,
      timezone varchar(50) NOT NULL,
      currency_code varchar(3) NOT NULL,
      default_language varchar(5) NOT NULL DEFAULT 'en',
      star_rating integer,
      total_rooms integer NOT NULL,
      phone varchar(30),
      email varchar(255),
      website varchar(500),
      tax_jurisdiction varchar(100),
      guest_registration_required boolean NOT NULL DEFAULT true,
      guest_registration_config jsonb,
      gds_chain_code varchar(4),
      gds_property_id varchar(20),
      check_in_time varchar(5) NOT NULL DEFAULT '15:00',
      check_out_time varchar(5) NOT NULL DEFAULT '11:00',
      overbooking_percentage integer NOT NULL DEFAULT 0,
      night_audit_time varchar(5) NOT NULL DEFAULT '02:00',
      settings jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    // room_types
    `CREATE TABLE IF NOT EXISTS room_types (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid NOT NULL REFERENCES properties(id),
      name varchar(100) NOT NULL,
      code varchar(20) NOT NULL,
      description text,
      max_occupancy integer NOT NULL,
      default_occupancy integer NOT NULL,
      bed_type varchar(50),
      bed_count integer NOT NULL DEFAULT 1,
      square_meters integer,
      floor varchar(10),
      is_accessible boolean NOT NULL DEFAULT false,
      amenities jsonb,
      sort_order integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    // rooms
    `CREATE TABLE IF NOT EXISTS rooms (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid NOT NULL REFERENCES properties(id),
      room_type_id uuid NOT NULL REFERENCES room_types(id),
      number varchar(20) NOT NULL,
      floor varchar(10),
      building varchar(50),
      status room_status NOT NULL DEFAULT 'vacant_clean',
      is_accessible boolean NOT NULL DEFAULT false,
      is_connecting boolean NOT NULL DEFAULT false,
      connecting_room_id uuid,
      amenities jsonb,
      maintenance_notes text,
      last_inspected_at timestamptz,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    // guests
    `CREATE TABLE IF NOT EXISTS guests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      first_name varchar(100) NOT NULL,
      last_name varchar(100) NOT NULL,
      email varchar(255),
      phone varchar(30),
      id_type varchar(30),
      id_number varchar(50),
      id_country varchar(2),
      id_expiry timestamptz,
      nationality varchar(2),
      date_of_birth timestamp,
      address_line_1 varchar(255),
      address_line_2 varchar(255),
      city varchar(100),
      state_province varchar(100),
      postal_code varchar(20),
      country_code varchar(2),
      vip_level vip_level NOT NULL DEFAULT 'none',
      company_name varchar(255),
      loyalty_number varchar(50),
      preferences jsonb,
      is_dnr boolean NOT NULL DEFAULT false,
      dnr_reason text,
      dnr_date timestamptz,
      gdpr_consent_marketing boolean NOT NULL DEFAULT false,
      gdpr_consent_date timestamptz,
      gdpr_data_retention_override timestamptz,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    // rate_plans
    `CREATE TABLE IF NOT EXISTS rate_plans (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid NOT NULL REFERENCES properties(id),
      room_type_id uuid NOT NULL REFERENCES room_types(id),
      name varchar(100) NOT NULL,
      code varchar(20) NOT NULL,
      description text,
      type rate_plan_type NOT NULL,
      base_amount numeric(12,2) NOT NULL,
      currency_code varchar(3) NOT NULL,
      parent_rate_plan_id uuid,
      derived_adjustment_type varchar(10),
      derived_adjustment_value numeric(8,2),
      is_tax_inclusive boolean NOT NULL DEFAULT false,
      cancellation_policy_id uuid,
      meal_plan varchar(20),
      valid_from date,
      valid_to date,
      is_active boolean NOT NULL DEFAULT true,
      channel_codes jsonb,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    // rate_restrictions
    `CREATE TABLE IF NOT EXISTS rate_restrictions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid NOT NULL REFERENCES properties(id),
      rate_plan_id uuid NOT NULL REFERENCES rate_plans(id),
      start_date date NOT NULL,
      end_date date NOT NULL,
      min_los integer,
      max_los integer,
      closed_to_arrival boolean NOT NULL DEFAULT false,
      closed_to_departure boolean NOT NULL DEFAULT false,
      is_closed boolean NOT NULL DEFAULT false,
      day_of_week_overrides jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    // bookings
    `CREATE TABLE IF NOT EXISTS bookings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid NOT NULL REFERENCES properties(id),
      guest_id uuid NOT NULL REFERENCES guests(id),
      confirmation_number varchar(50) NOT NULL UNIQUE,
      external_confirmation varchar(100),
      source booking_source NOT NULL,
      channel_code varchar(50),
      group_id uuid,
      group_name varchar(255),
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    // reservations
    `CREATE TABLE IF NOT EXISTS reservations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid NOT NULL REFERENCES properties(id),
      booking_id uuid NOT NULL REFERENCES bookings(id),
      guest_id uuid NOT NULL REFERENCES guests(id),
      arrival_date date NOT NULL,
      departure_date date NOT NULL,
      nights integer NOT NULL,
      room_type_id uuid NOT NULL REFERENCES room_types(id),
      room_id uuid REFERENCES rooms(id),
      status reservation_status NOT NULL DEFAULT 'pending',
      rate_plan_id uuid NOT NULL REFERENCES rate_plans(id),
      total_amount numeric(12,2) NOT NULL,
      currency_code varchar(3) NOT NULL,
      adults integer NOT NULL DEFAULT 1,
      children integer NOT NULL DEFAULT 0,
      special_requests text,
      preferences jsonb,
      checked_in_at timestamptz,
      checked_out_at timestamptz,
      checked_in_by uuid,
      checked_out_by uuid,
      cancelled_at timestamptz,
      cancellation_reason text,
      registration_data jsonb,
      registration_submitted_at timestamptz,
      guest_id_document jsonb,
      actual_arrival_time timestamptz,
      actual_departure_time timestamptz,
      is_early_checkin boolean NOT NULL DEFAULT false,
      is_late_checkout boolean NOT NULL DEFAULT false,
      early_checkin_fee numeric(12,2),
      late_checkout_fee numeric(12,2),
      registration_signed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    // folios
    `CREATE TABLE IF NOT EXISTS folios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid NOT NULL REFERENCES properties(id),
      reservation_id uuid REFERENCES reservations(id),
      booking_id uuid REFERENCES bookings(id),
      guest_id uuid NOT NULL REFERENCES guests(id),
      folio_number varchar(50) NOT NULL,
      type folio_type NOT NULL DEFAULT 'guest',
      status folio_status NOT NULL DEFAULT 'open',
      total_charges numeric(12,2) NOT NULL DEFAULT 0,
      total_payments numeric(12,2) NOT NULL DEFAULT 0,
      balance numeric(12,2) NOT NULL DEFAULT 0,
      currency_code varchar(3) NOT NULL,
      company_name varchar(255),
      billing_address text,
      payment_terms_days varchar(10),
      notes text,
      settled_at timestamptz,
      closed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    // charges
    `CREATE TABLE IF NOT EXISTS charges (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid NOT NULL REFERENCES properties(id),
      folio_id uuid NOT NULL REFERENCES folios(id),
      type charge_type NOT NULL,
      description varchar(255) NOT NULL,
      amount numeric(12,2) NOT NULL,
      currency_code varchar(3) NOT NULL,
      tax_amount numeric(12,2) NOT NULL DEFAULT 0,
      tax_rate numeric(5,4),
      tax_code varchar(20),
      service_date timestamptz NOT NULL,
      is_reversal boolean NOT NULL DEFAULT false,
      original_charge_id uuid,
      is_locked boolean NOT NULL DEFAULT false,
      locked_by_audit_date timestamp,
      posted_by uuid,
      posted_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    // payments
    `CREATE TABLE IF NOT EXISTS payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid NOT NULL REFERENCES properties(id),
      folio_id uuid NOT NULL REFERENCES folios(id),
      method payment_method NOT NULL,
      status payment_status NOT NULL DEFAULT 'pending',
      amount numeric(12,2) NOT NULL,
      currency_code varchar(3) NOT NULL,
      gateway_provider varchar(20),
      gateway_transaction_id varchar(255),
      gateway_payment_token varchar(255),
      card_last_four varchar(4),
      card_brand varchar(20),
      is_pre_authorization boolean NOT NULL DEFAULT false,
      pre_auth_expires_at timestamptz,
      original_payment_id uuid,
      notes text,
      processed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    // housekeeping_tasks
    `CREATE TABLE IF NOT EXISTS housekeeping_tasks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid NOT NULL REFERENCES properties(id),
      room_id uuid NOT NULL REFERENCES rooms(id),
      type housekeeping_task_type NOT NULL,
      status housekeeping_task_status NOT NULL DEFAULT 'pending',
      priority integer NOT NULL DEFAULT 0,
      assigned_to uuid,
      assigned_at timestamptz,
      started_at timestamptz,
      completed_at timestamptz,
      inspected_by uuid,
      inspected_at timestamptz,
      checklist jsonb,
      notes text,
      maintenance_required boolean NOT NULL DEFAULT false,
      maintenance_notes text,
      service_date timestamp NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    // audit_runs
    `CREATE TABLE IF NOT EXISTS audit_runs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid NOT NULL REFERENCES properties(id),
      business_date date NOT NULL,
      status audit_run_status NOT NULL DEFAULT 'running',
      room_charges_posted numeric(12,2),
      tax_charges_posted numeric(12,2),
      no_shows_processed numeric(4,0),
      summary jsonb,
      errors jsonb,
      started_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    // audit_logs
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid REFERENCES properties(id),
      action varchar(50) NOT NULL,
      entity_type varchar(50) NOT NULL,
      entity_id uuid,
      user_id uuid,
      user_email varchar(255),
      ip_address varchar(45),
      previous_value jsonb,
      new_value jsonb,
      description text,
      occurred_at timestamptz NOT NULL DEFAULT now()
    )`,
    // channel_connections
    `CREATE TABLE IF NOT EXISTS channel_connections (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid NOT NULL REFERENCES properties(id),
      channel_code varchar(50) NOT NULL,
      channel_name varchar(100) NOT NULL,
      adapter_type varchar(50) NOT NULL,
      status channel_status NOT NULL DEFAULT 'pending_setup',
      sync_direction sync_direction NOT NULL DEFAULT 'bidirectional',
      config jsonb,
      rate_plan_mapping jsonb,
      room_type_mapping jsonb,
      last_sync_at timestamptz,
      last_sync_status varchar(20),
      last_sync_error text,
      last_reservation_pull_at timestamptz,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    // ari_sync_logs
    `CREATE TABLE IF NOT EXISTS ari_sync_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid NOT NULL REFERENCES properties(id),
      channel_connection_id uuid NOT NULL REFERENCES channel_connections(id),
      direction sync_direction NOT NULL,
      action varchar(50) NOT NULL,
      payload jsonb,
      response jsonb,
      status varchar(20) NOT NULL,
      error_message text,
      room_type_id uuid,
      rate_plan_id uuid,
      date_range_start date,
      date_range_end date,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    // agent_webhook_subscriptions
    `CREATE TABLE IF NOT EXISTS agent_webhook_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid NOT NULL REFERENCES properties(id),
      subscriber_id varchar(100) NOT NULL,
      subscriber_name varchar(200),
      callback_url varchar(500) NOT NULL,
      events jsonb NOT NULL,
      secret varchar(200),
      is_active boolean NOT NULL DEFAULT true,
      last_delivery_at timestamptz,
      last_delivery_status varchar(20),
      failure_count integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
  ];

  for (const t of tables) {
    await db.execute(sql.raw(t));
  }

  console.log('Schema pushed successfully — all tables created.');
  await client.end();
}

main().catch((err) => {
  console.error('Push failed:', err);
  process.exit(1);
});
