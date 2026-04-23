-- Migration: add 'split_component' value to tax_rule_type enum and
-- split_percentage column to tax_rules.
--
-- German hotels need to split a single breakfast charge across two VAT rates
-- (7% on food portion, 19% on beverage portion). The split_component rule
-- type applies its rate to splitPercentage % of the charge instead of 100%.
--
-- drizzle-kit generate cannot run in this repo (CJS/.js extension issue —
-- see packages/database/src/push-schema.ts), so this migration is authored
-- by hand. push-schema.ts also reflects the same DDL idempotently.

-- 1. Add new enum value (idempotent — no-op if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'tax_rule_type'
      AND e.enumlabel = 'split_component'
  ) THEN
    ALTER TYPE tax_rule_type ADD VALUE 'split_component';
  END IF;
END $$;

-- 2. Add split_percentage column (nullable — required by DTO layer only when
--    type = 'split_component')
ALTER TABLE tax_rules ADD COLUMN IF NOT EXISTS split_percentage numeric(5,2);
