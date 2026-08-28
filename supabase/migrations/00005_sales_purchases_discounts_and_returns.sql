-- ==============================================================================
-- MIGRATION 00005: SALES, PURCHASES, DISCOUNTS, CUSTOMER CATEGORIES & RETURNS
-- ==============================================================================

-- 1. ADD MISSING COLUMNS TO SALES_INVOICES (IF NOT EXISTS)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_invoices' AND column_name='invoice_type') THEN
        ALTER TABLE sales_invoices ADD COLUMN invoice_type VARCHAR(50) NOT NULL DEFAULT 'tax_invoice';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_invoices' AND column_name='discount_type') THEN
        ALTER TABLE sales_invoices ADD COLUMN discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_invoices' AND column_name='discount_value') THEN
        ALTER TABLE sales_invoices ADD COLUMN discount_value NUMERIC(18, 4) NOT NULL DEFAULT 0.0000;
    END IF;
END $$;

-- 2. ADD MISSING COLUMNS TO PURCHASE_INVOICES (IF NOT EXISTS)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_invoices' AND column_name='invoice_type') THEN
        ALTER TABLE purchase_invoices ADD COLUMN invoice_type VARCHAR(50) NOT NULL DEFAULT 'purchase_invoice';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_invoices' AND column_name='discount_type') THEN
        ALTER TABLE purchase_invoices ADD COLUMN discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_invoices' AND column_name='discount_value') THEN
        ALTER TABLE purchase_invoices ADD COLUMN discount_value NUMERIC(18, 4) NOT NULL DEFAULT 0.0000;
    END IF;
END $$;

-- 3. ADD MISSING COLUMNS TO CUSTOMERS & SUPPLIERS (IF NOT EXISTS)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='opening_balance') THEN
        ALTER TABLE customers ADD COLUMN opening_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='category_id') THEN
        ALTER TABLE customers ADD COLUMN category_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='opening_balance') THEN
        ALTER TABLE suppliers ADD COLUMN opening_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000;
    END IF;
END $$;

-- 4. CREATE CUSTOMER CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS customer_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_cust_cat_code_per_org UNIQUE (organization_id, code)
);

-- 5. CREATE SALES RETURNS & ITEMS TABLES
CREATE TABLE IF NOT EXISTS sales_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    return_number VARCHAR(100) NOT NULL,
    original_invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
    original_invoice_number VARCHAR(100),
    date DATE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'completed',
    subtotal NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    tax_total NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    grand_total NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    refund_method VARCHAR(50) NOT NULL DEFAULT 'customer_balance',
    treasury_account_id UUID REFERENCES treasury_accounts(id) ON DELETE SET NULL,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_sales_return_number_per_org UNIQUE (organization_id, return_number)
);

CREATE TABLE IF NOT EXISTS sales_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    cost_price NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 14.00,
    tax_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    total NUMERIC(18, 4) NOT NULL DEFAULT 0.0000
);

-- 6. CREATE PURCHASE RETURNS & ITEMS TABLES
CREATE TABLE IF NOT EXISTS purchase_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    return_number VARCHAR(100) NOT NULL,
    original_invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE SET NULL,
    original_invoice_number VARCHAR(100),
    date DATE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    supplier_name VARCHAR(255) NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'completed',
    subtotal NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    tax_total NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    grand_total NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    refund_method VARCHAR(50) NOT NULL DEFAULT 'supplier_balance',
    treasury_account_id UUID REFERENCES treasury_accounts(id) ON DELETE SET NULL,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_purchase_return_number_per_org UNIQUE (organization_id, return_number)
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_return_id UUID NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1,
    unit_cost NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 14.00,
    tax_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    total NUMERIC(18, 4) NOT NULL DEFAULT 0.0000
);

-- RLS POLICIES
ALTER TABLE customer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_cust_cat ON customer_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY tenant_isolation_sales_ret ON sales_returns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY tenant_isolation_sales_ret_items ON sales_return_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY tenant_isolation_purch_ret ON purchase_returns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY tenant_isolation_purch_ret_items ON purchase_return_items FOR ALL USING (true) WITH CHECK (true);
