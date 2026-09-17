-- Migration 00009: SANAD ERP Fixed Asset Depreciation Module
-- 100% additive, zero deletion, safe for existing production data

CREATE TABLE IF NOT EXISTS fixed_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL DEFAULT 'purchased', -- 'purchased' | 'opening'
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    accumulated_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    expense_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    purchase_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    beginning_depreciation NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    depreciation_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active' | 'inactive'
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
    notes TEXT,
    created_by VARCHAR(100) DEFAULT 'النظام',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for fixed_assets
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fixed_assets' AND policyname = 'tenant_isolation_fixed_assets'
  ) THEN
    CREATE POLICY tenant_isolation_fixed_assets ON fixed_assets FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
