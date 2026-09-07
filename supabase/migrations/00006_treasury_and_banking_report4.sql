-- ====================================================================
-- MIGRATION: 00006_treasury_and_banking_report4.sql
-- REPORT #4: TREASURY & BANKING MODULE ENHANCEMENTS
-- ====================================================================

-- 1. COST CENTERS: ADD TYPE (revenue / expense)
ALTER TABLE cost_centers 
ADD COLUMN IF NOT EXISTS cost_center_type VARCHAR(20) DEFAULT 'expense';

-- 2. CHECK RECORDS: EXTEND WITH ACCOUNT, COST CENTER, DRAWEE/COLLECTION BANK & VOUCHER NUMBER
ALTER TABLE check_records
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS drawee_bank VARCHAR(255),
ADD COLUMN IF NOT EXISTS collection_bank VARCHAR(255),
ADD COLUMN IF NOT EXISTS voucher_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS receipt_voucher_id UUID;

-- 3. CHECK VOUCHERS: TABLE FOR MULTI-CHECK VOUCHERS (RECEIVABLE & PAYABLE)
CREATE TABLE IF NOT EXISTS check_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    voucher_number VARCHAR(100) NOT NULL,
    voucher_type VARCHAR(30) NOT NULL, -- 'receivable_check', 'payable_check'
    date DATE NOT NULL,
    total_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    party_name VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
    treasury_account_id UUID REFERENCES treasury_accounts(id) ON DELETE SET NULL,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE check_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read/write check_vouchers" ON check_vouchers FOR ALL USING (true);
