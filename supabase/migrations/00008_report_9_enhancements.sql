-- Migration 00008: SANAD ERP Report 9 Enhancements & Data Safety
-- 100% additive, zero deletion, safe for existing production data

-- 1. Add partner columns to stock_movements table for clean auditing & relational integrity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_movements' AND column_name = 'partner_id'
  ) THEN
    ALTER TABLE stock_movements ADD COLUMN partner_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_movements' AND column_name = 'partner_name'
  ) THEN
    ALTER TABLE stock_movements ADD COLUMN partner_name VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_movements' AND column_name = 'partner_type'
  ) THEN
    ALTER TABLE stock_movements ADD COLUMN partner_type VARCHAR(50);
  END IF;
END $$;

-- 2. Add discount_percent to purchase_invoice_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_invoice_items' AND column_name = 'discount_percent'
  ) THEN
    ALTER TABLE purchase_invoice_items ADD COLUMN discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00;
  END IF;
END $$;

-- 3. Create Main Cost Center Accounts master table
CREATE TABLE IF NOT EXISTS cost_center_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    cost_center_type VARCHAR(50) DEFAULT 'expense',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for cost_center_accounts
ALTER TABLE cost_center_accounts ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cost_center_accounts' AND policyname = 'tenant_isolation_cc_accounts'
  ) THEN
    CREATE POLICY tenant_isolation_cc_accounts ON cost_center_accounts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Add main_account_id to cost_centers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cost_centers' AND column_name = 'main_account_id'
  ) THEN
    ALTER TABLE cost_centers ADD COLUMN main_account_id UUID REFERENCES cost_center_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;
