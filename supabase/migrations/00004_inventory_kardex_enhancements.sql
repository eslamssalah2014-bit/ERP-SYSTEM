-- =========================================================================
-- SANAD ERP - Migration 00004: Inventory, Kardex & Valuation Enhancements
-- Adds product images, partner tracking in Kardex, product change history audit,
-- and period-end inventory closing entries.
-- =========================================================================

-- 1. Add image_url to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Add partner tracking to stock_movements table
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS partner_id UUID,
ADD COLUMN IF NOT EXISTS partner_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS partner_type VARCHAR(50); -- 'customer', 'supplier', 'opening', 'warehouse', 'adjustment'

-- 3. Create product_change_history table for granular product audit trail
CREATE TABLE IF NOT EXISTS product_change_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    change_type VARCHAR(50) NOT NULL, -- 'name', 'price', 'category', 'opening_balance', 'stock_adjustment', 'image', 'unit', 'status', 'created', 'deleted'
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create period_closings table for period-end closing inventory & accounting integration
CREATE TABLE IF NOT EXISTS period_closings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    period_type VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'yearly'
    period_label VARCHAR(100) NOT NULL, -- e.g. '2026-08', 'Q3 2026', 'Year 2026'
    closing_date DATE NOT NULL,
    opening_inventory_value NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    purchases_value NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    closing_inventory_value NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    cogs_value NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Enable RLS on new tables
ALTER TABLE product_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_closings ENABLE ROW LEVEL SECURITY;

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_partner ON stock_movements(organization_id, partner_id);
CREATE INDEX IF NOT EXISTS idx_prod_change_history_prod ON product_change_history(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_prod_change_history_date ON product_change_history(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_period_closings_date ON period_closings(organization_id, closing_date);
