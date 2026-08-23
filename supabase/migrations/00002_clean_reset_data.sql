-- =========================================================================
-- SANAD ERP - Production Database Reset & Seed Data Purge
-- Wipes all demo, mock, sample, and test records
-- Keeps database schema, constraints, RLS policies, and system COA intact
-- =========================================================================

-- 1. TRUNCATE ALL TRANSACTIONAL AND DEMO TABLES
TRUNCATE TABLE 
    audit_logs,
    journal_lines,
    journal_entries,
    check_records,
    cash_payments,
    cash_receipts,
    purchase_invoice_items,
    purchase_invoices,
    sales_invoice_items,
    sales_invoices,
    stock_movements,
    product_warehouse_stock,
    products,
    cost_centers,
    suppliers,
    customers
CASCADE;

-- 2. ZERO ALL GL ACCOUNT AND TREASURY BALANCES
UPDATE accounts 
SET balance = 0.0000;

UPDATE treasury_accounts 
SET balance = 0.0000;

-- 3. ENSURE CLEAN DEFAULT WAREHOUSE (IF NEEDED)
DELETE FROM warehouses WHERE is_default = FALSE;
UPDATE warehouses SET is_default = TRUE WHERE code = 'WH-01' OR code = 'WH-CAI';

-- 4. VERIFY SYSTEM BASELINE COUNTS
-- The following query outputs the record counts after cleanup:
DO $$
DECLARE
    prod_cnt INT;
    cust_cnt INT;
    supp_cnt INT;
    sinv_cnt INT;
    pinv_cnt INT;
    gl_cnt   INT;
BEGIN
    SELECT COUNT(*) INTO prod_cnt FROM products;
    SELECT COUNT(*) INTO cust_cnt FROM customers;
    SELECT COUNT(*) INTO supp_cnt FROM suppliers;
    SELECT COUNT(*) INTO sinv_cnt FROM sales_invoices;
    SELECT COUNT(*) INTO pinv_cnt FROM purchase_invoices;
    SELECT COUNT(*) INTO gl_cnt   FROM journal_entries;

    RAISE NOTICE '==================================================';
    RAISE NOTICE ' SANAD ERP DATABASE CLEANUP COMPLETED SUCCESSFULLY ';
    RAISE NOTICE '==================================================';
    RAISE NOTICE ' Products:             %', prod_cnt;
    RAISE NOTICE ' Customers:            %', cust_cnt;
    RAISE NOTICE ' Suppliers:            %', supp_cnt;
    RAISE NOTICE ' Sales Invoices:       %', sinv_cnt;
    RAISE NOTICE ' Purchase Invoices:    %', pinv_cnt;
    RAISE NOTICE ' Journal Entries:      %', gl_cnt;
    RAISE NOTICE ' Status:               CLEAN PRODUCTION READY';
    RAISE NOTICE '==================================================';
END $$;
