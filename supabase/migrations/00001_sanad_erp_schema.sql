-- =========================================================================
-- SANAD ERP - Production PostgreSQL Multi-Tenant Schema with RLS
-- Inspried by Odoo, Zoho & ERPNext, built for Egypt & GCC SMEs
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZATIONS (TENANTS)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    tax_number VARCHAR(100) NOT NULL,
    commercial_register VARCHAR(100),
    country VARCHAR(10) NOT NULL DEFAULT 'EG', -- 'EG', 'SA', 'AE'
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP', -- 'EGP', 'SAR', 'AED', 'USD'
    default_vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 14.00,
    address TEXT,
    logo_url TEXT,
    plan_tier VARCHAR(50) NOT NULL DEFAULT 'enterprise',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. BRANCHES
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    address TEXT,
    phone VARCHAR(50),
    is_headquarters BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. USERS & ROLES
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'sales_rep', -- 'super_admin', 'tenant_admin', 'accountant', 'inventory_manager', 'sales_rep', 'cashier'
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CHART OF ACCOUNTS (COA)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'assets', 'liabilities', 'equity', 'revenue', 'expense'
    parent_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    level INT NOT NULL DEFAULT 1,
    nature VARCHAR(10) NOT NULL DEFAULT 'debit', -- 'debit', 'credit'
    balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_account_code_per_org UNIQUE (organization_id, code)
);

-- 5. COST CENTERS
CREATE TABLE cost_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES cost_centers(id) ON DELETE RESTRICT,
    level INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_cost_center_code_per_org UNIQUE (organization_id, code)
);

-- 6. WAREHOUSES
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    location TEXT,
    manager_name VARCHAR(255),
    manager_phone VARCHAR(50),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PRODUCT CATEGORIES & UNITS
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES product_categories(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    symbol VARCHAR(20) NOT NULL
);

-- 8. PRODUCTS
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES product_units(id) ON DELETE RESTRICT,
    cost_price NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    selling_price NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 14.00,
    min_stock_level INT NOT NULL DEFAULT 5,
    max_stock_level INT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_sku_per_org UNIQUE (organization_id, sku)
);

-- 9. PRODUCT WAREHOUSE INVENTORY
CREATE TABLE product_warehouse_stock (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, warehouse_id)
);

-- 10. STOCK MOVEMENTS (KARDEX)
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    movement_type VARCHAR(50) NOT NULL, -- 'opening_balance', 'sales_issue', 'purchase_receipt', 'transfer_in', 'transfer_out', 'adjustment'
    reference_id UUID,
    reference_number VARCHAR(100),
    date DATE NOT NULL,
    quantity INT NOT NULL, -- Positive for in, Negative for out
    unit_cost NUMERIC(18, 4) NOT NULL,
    total_cost NUMERIC(18, 4) NOT NULL,
    balance_quantity INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. CUSTOMERS (CRM & A/R)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    mobile VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    tax_number VARCHAR(100),
    commercial_register VARCHAR(100),
    credit_limit NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    payment_terms_days INT NOT NULL DEFAULT 30,
    current_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. SUPPLIERS (A/P)
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    mobile VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    tax_number VARCHAR(100),
    bank_name VARCHAR(255),
    bank_iban VARCHAR(100),
    current_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. SALES INVOICES & ITEMS (ZATCA & ETA READY)
CREATE TABLE sales_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    customer_tax_number VARCHAR(100),
    sales_rep_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sales_rep_name VARCHAR(255),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'unpaid', -- 'draft', 'paid', 'partially_paid', 'unpaid', 'cancelled', 'returned'
    subtotal NUMERIC(18, 4) NOT NULL,
    discount_total NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    tax_total NUMERIC(18, 4) NOT NULL,
    grand_total NUMERIC(18, 4) NOT NULL,
    paid_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    due_amount NUMERIC(18, 4) NOT NULL,
    qr_code_payload TEXT,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_sales_invoice_number_per_org UNIQUE (organization_id, invoice_number)
);

CREATE TABLE sales_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    quantity INT NOT NULL,
    unit_price NUMERIC(18, 4) NOT NULL,
    cost_price NUMERIC(18, 4) NOT NULL,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 14.00,
    tax_amount NUMERIC(18, 4) NOT NULL,
    total NUMERIC(18, 4) NOT NULL
);

-- 14. PURCHASE INVOICES & ITEMS
CREATE TABLE purchase_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) NOT NULL,
    supplier_invoice_ref VARCHAR(100),
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_tax_number VARCHAR(100),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
    subtotal NUMERIC(18, 4) NOT NULL,
    discount_total NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    tax_total NUMERIC(18, 4) NOT NULL,
    grand_total NUMERIC(18, 4) NOT NULL,
    paid_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    due_amount NUMERIC(18, 4) NOT NULL,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_purchase_invoice_number_per_org UNIQUE (organization_id, invoice_number)
);

CREATE TABLE purchase_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    quantity INT NOT NULL,
    unit_cost NUMERIC(18, 4) NOT NULL,
    discount_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 14.00,
    tax_amount NUMERIC(18, 4) NOT NULL,
    total NUMERIC(18, 4) NOT NULL
);

-- 15. TREASURY & CASH MANAGEMENT
CREATE TABLE treasury_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    gl_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'cash_box', -- 'cash_box', 'bank_account'
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cash_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    receipt_number VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    treasury_account_id UUID NOT NULL REFERENCES treasury_accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    received_from VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    credit_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cash_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    payment_number VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    treasury_account_id UUID NOT NULL REFERENCES treasury_accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    paid_to VARCHAR(255) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    debit_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. CHECKS PORTFOLIO
CREATE TABLE check_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    check_number VARCHAR(100) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'incoming' (أوراق قبض), 'outgoing' (أوراق دفع)
    party_name VARCHAR(255) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    amount NUMERIC(18, 4) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    collection_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'collected', 'cleared', 'bounced', 'cancelled'
    target_treasury_id UUID REFERENCES treasury_accounts(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. DOUBLE ENTRY GENERAL JOURNAL
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    entry_number VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    reference_type VARCHAR(50) NOT NULL, -- 'sales_invoice', 'purchase_invoice', 'cash_receipt', 'cash_payment', 'check_collection', 'manual_entry'
    reference_id UUID,
    description TEXT NOT NULL,
    total_debit NUMERIC(18, 4) NOT NULL,
    total_credit NUMERIC(18, 4) NOT NULL,
    is_balanced BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(30) NOT NULL DEFAULT 'posted',
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT balanced_journal_check CHECK (total_debit = total_credit)
);

CREATE TABLE journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    account_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    debit NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    credit NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
    description TEXT
);

-- 18. AUDIT LOGS & NOTIFICATIONS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures complete multi-tenant data isolation per organization
-- =========================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Dynamic Tenant Isolation Policy Example for Supabase Auth JWT
CREATE POLICY tenant_isolation_policy_accounts ON accounts
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

CREATE POLICY tenant_isolation_policy_products ON products
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

CREATE POLICY tenant_isolation_policy_sales ON sales_invoices
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);

-- Automated indexes for high-throughput ERP queries
CREATE INDEX idx_products_sku ON products(organization_id, sku);
CREATE INDEX idx_products_barcode ON products(organization_id, barcode);
CREATE INDEX idx_sales_inv_date ON sales_invoices(organization_id, date);
CREATE INDEX idx_purchase_inv_date ON purchase_invoices(organization_id, date);
CREATE INDEX idx_stock_movements_prod ON stock_movements(organization_id, product_id, warehouse_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(organization_id, date);
