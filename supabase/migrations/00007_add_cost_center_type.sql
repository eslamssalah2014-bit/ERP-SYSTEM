-- Migration 00007: Add cost_center_type column to cost_centers table
-- Fixes Report 7-B Cost Center Creation Error

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cost_centers' AND column_name = 'cost_center_type'
  ) THEN
    ALTER TABLE cost_centers ADD COLUMN cost_center_type TEXT DEFAULT 'expense';
  END IF;
END $$;
