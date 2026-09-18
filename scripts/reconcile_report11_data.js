const fs = require('fs');
const path = require('path');
const wsRoot = path.resolve(__dirname, '..');
const { createClient } = require(path.join(wsRoot, 'node_modules/@supabase/supabase-js'));

const envPath = path.join(wsRoot, '.env.local');
let supabaseUrl = "";
let supabaseKey = "";

const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = trimmed.split('=')[1].trim();
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = trimmed.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const HONEY_ID = '67a973ad-1905-470c-86f8-5a8662fb9e19';
const TAHINI_ID = 'a3222573-95c6-48cd-a248-f48356736253';
const SESAME_ID = '8bbd8fc3-375f-4f78-b47e-83490a30bb6b';

const MAIN_WH_ID = '00000000-0000-0000-0000-000000000004';
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function runReconciliation() {
  console.log('====================================================');
  console.log('STARTING REPORT 11 DATA RECONCILIATION');
  console.log('Timestamp:', new Date().toISOString());
  console.log('====================================================\n');

  // ----------------------------------------------------
  // 1. Correct the 4 Mismatched Historical Stock Movements
  // ----------------------------------------------------
  console.log('1. Correcting mismatched historical stock movements...');

  // M1: 8a55ba70 was Honey, ref_num INV-2026-0001, ref_id 1d161efc (Invoice #3) -> Should be Invoice #3 (INV-2026-0003)
  const { error: errM1 } = await supabase
    .from('stock_movements')
    .update({
      reference_id: '1d161efc-5d23-4c23-ad5c-d9fbc225d732',
      reference_number: 'INV-2026-0003',
      product_id: HONEY_ID,
      quantity: -2,
      unit_cost: 100,
      total_cost: -200,
      notes: '[PARTNER:customer:235a9075-816b-4e0d-b8e7-9d7a26f09230:سوبر ماركت المدينه] صرف مبيعات فاتورة INV-2026-0003'
    })
    .eq('id', '8a55ba70-7652-4eb4-b599-0cc06e9587eb');
  if (errM1) console.error('Error updating movement M1:', errM1);
  else console.log('✅ Movement M1 reconciled to INV-2026-0003 (Honey 400g, qty -2)');

  // M2: 731e0cbe was Tahini, ref_num INV-2026-0002, ref_id e26998f1 (Invoice #1) -> Should be Invoice #1 (INV-2026-0001)
  const { error: errM2 } = await supabase
    .from('stock_movements')
    .update({
      reference_id: 'e26998f1-3b33-480b-a296-a6fa432be9d9',
      reference_number: 'INV-2026-0001',
      product_id: TAHINI_ID,
      quantity: -5,
      unit_cost: 50,
      total_cost: -250,
      notes: '[PARTNER:customer:4f009ef0-0382-4f05-89ae-ba60d1964f43:سوبر ماركت سفير] صرف مبيعات فاتورة INV-2026-0001'
    })
    .eq('id', '731e0cbe-0f11-4fbb-8d50-10342c7b6b84');
  if (errM2) console.error('Error updating movement M2:', errM2);
  else console.log('✅ Movement M2 reconciled to INV-2026-0001 (Tahini 450g, qty -5)');

  // M3: 0fbb85f5 was Honey, ref_num INV-2026-0003, ref_id b7929cdf (Invoice #2) -> Should be Invoice #2 (INV-2026-0002)
  const { error: errM3 } = await supabase
    .from('stock_movements')
    .update({
      reference_id: 'b7929cdf-2bef-4189-8eed-48f866088d80',
      reference_number: 'INV-2026-0002',
      product_id: HONEY_ID,
      quantity: -2,
      unit_cost: 100,
      total_cost: -200,
      notes: '[PARTNER:customer:235a9075-816b-4e0d-b8e7-9d7a26f09230:سوبر ماركت المدينه] صرف مبيعات فاتورة INV-2026-0002'
    })
    .eq('id', '0fbb85f5-067c-4eee-ba5e-7d3cbb22f477');
  if (errM3) console.error('Error updating movement M3:', errM3);
  else console.log('✅ Movement M3 reconciled to INV-2026-0002 (Honey 400g, qty -2)');

  // M4: e039aaf3 was Tahini, ref_num INV-2026-0005 (Invoice INV-184481), qty was -5 instead of -4
  const { error: errM4 } = await supabase
    .from('stock_movements')
    .update({
      reference_number: 'INV-184481',
      product_id: TAHINI_ID,
      quantity: -4,
      unit_cost: 50,
      total_cost: -200,
      notes: '[PARTNER:customer:4f009ef0-0382-4f05-89ae-ba60d1964f43:سوبر ماركت سفير] صرف مبيعات فاتورة INV-184481'
    })
    .eq('id', 'e039aaf3-09b2-4d19-904a-a02a5a7f20f7');
  if (errM4) console.error('Error updating movement M4:', errM4);
  else console.log('✅ Movement M4 reconciled to INV-184481 (Tahini 450g, qty -4)');

  // ----------------------------------------------------
  // 2. Insert Missing Stock Movements for Sales Invoices #6 to #13
  // ----------------------------------------------------
  console.log('\n2. Checking and inserting missing stock movements for sales invoices...');

  const missingSalesMovements = [
    {
      id: 'f6000000-0000-4000-8000-000000000006',
      organization_id: DEFAULT_ORG_ID,
      product_id: TAHINI_ID,
      warehouse_id: MAIN_WH_ID,
      movement_type: 'sales_issue',
      reference_id: '8ac3b6e6-0818-49fd-be73-d1b1b2d5a4d4',
      reference_number: 'INV-2026-0006',
      date: '2026-01-07',
      quantity: -2,
      unit_cost: 50,
      total_cost: -100,
      balance_quantity: 0,
      notes: '[PARTNER:customer:4f009ef0-0382-4f05-89ae-ba60d1964f43:سوبر ماركت سفير] صرف مبيعات فاتورة INV-2026-0006'
    },
    {
      id: 'f7000000-0000-4000-8000-000000000007',
      organization_id: DEFAULT_ORG_ID,
      product_id: HONEY_ID,
      warehouse_id: MAIN_WH_ID,
      movement_type: 'sales_issue',
      reference_id: 'e457dd17-47b4-4ca5-a88b-eb3eff2b6849',
      reference_number: 'INV-2026-0007',
      date: '2026-02-11',
      quantity: -3,
      unit_cost: 100,
      total_cost: -300,
      balance_quantity: 0,
      notes: '[PARTNER:customer:235a9075-816b-4e0d-b8e7-9d7a26f09230:سوبر ماركت المدينه] صرف مبيعات فاتورة INV-2026-0007'
    },
    {
      id: 'f8000000-0000-4000-8000-000000000008',
      organization_id: DEFAULT_ORG_ID,
      product_id: HONEY_ID,
      warehouse_id: MAIN_WH_ID,
      movement_type: 'sales_issue',
      reference_id: '8b6baf52-dff3-43ff-813c-3a5044a39f71',
      reference_number: 'INV-2026-0008',
      date: '2026-03-18',
      quantity: -6,
      unit_cost: 100,
      total_cost: -600,
      balance_quantity: 0,
      notes: '[PARTNER:customer:4f009ef0-0382-4f05-89ae-ba60d1964f43:سوبر ماركت سفير] صرف مبيعات فاتورة INV-2026-0008'
    },
    {
      id: 'f9000000-0000-4000-8000-000000000009',
      organization_id: DEFAULT_ORG_ID,
      product_id: TAHINI_ID,
      warehouse_id: MAIN_WH_ID,
      movement_type: 'sales_issue',
      reference_id: '862c6f1d-808c-47bf-996c-61ac8e012fc8',
      reference_number: 'INV-2026-0009',
      date: '2026-04-01',
      quantity: -5,
      unit_cost: 50,
      total_cost: -250,
      balance_quantity: 0,
      notes: '[PARTNER:customer:235a9075-816b-4e0d-b8e7-9d7a26f09230:سوبر ماركت المدينه] صرف مبيعات فاتورة INV-2026-0009'
    },
    {
      id: 'fa000000-0000-4000-8000-000000000010',
      organization_id: DEFAULT_ORG_ID,
      product_id: HONEY_ID,
      warehouse_id: MAIN_WH_ID,
      movement_type: 'sales_issue',
      reference_id: '08503a5a-3e2e-4d5e-bbcb-4a5fe9b9a757',
      reference_number: 'INV-2026-0010',
      date: '2026-05-07',
      quantity: -4,
      unit_cost: 100,
      total_cost: -400,
      balance_quantity: 0,
      notes: '[PARTNER:customer:4f009ef0-0382-4f05-89ae-ba60d1964f43:سوبر ماركت سفير] صرف مبيعات فاتورة INV-2026-0010'
    },
    {
      id: 'fb000000-0000-4000-8000-000000000011',
      organization_id: DEFAULT_ORG_ID,
      product_id: TAHINI_ID,
      warehouse_id: MAIN_WH_ID,
      movement_type: 'sales_issue',
      reference_id: '6c8c036b-805a-4a7c-8090-7d09522f2f81',
      reference_number: 'INV-234993',
      date: '2026-06-12',
      quantity: -3,
      unit_cost: 50,
      total_cost: -150,
      balance_quantity: 0,
      notes: '[PARTNER:customer:235a9075-816b-4e0d-b8e7-9d7a26f09230:سوبر ماركت المدينه] صرف مبيعات فاتورة INV-234993'
    },
    {
      id: 'fc000000-0000-4000-8000-000000000012',
      organization_id: DEFAULT_ORG_ID,
      product_id: HONEY_ID,
      warehouse_id: MAIN_WH_ID,
      movement_type: 'sales_issue',
      reference_id: '86cea7d0-8aae-41dd-b560-0f63d1e7910e',
      reference_number: 'INV-2026-0012',
      date: '2026-07-08',
      quantity: -5,
      unit_cost: 100,
      total_cost: -500,
      balance_quantity: 0,
      notes: '[PARTNER:customer:4f009ef0-0382-4f05-89ae-ba60d1964f43:سوبر ماركت سفير] صرف مبيعات فاتورة INV-2026-0012'
    },
    {
      id: 'fd000000-0000-4000-8000-000000000013',
      organization_id: DEFAULT_ORG_ID,
      product_id: SESAME_ID,
      warehouse_id: MAIN_WH_ID,
      movement_type: 'sales_issue',
      reference_id: 'ce18b075-4b0d-417b-9ea7-ebb48405588b',
      reference_number: 'INV-2026-0013',
      date: '2026-09-03',
      quantity: -25,
      unit_cost: 117,
      total_cost: -2925,
      balance_quantity: 0,
      notes: '[PARTNER:customer:00000000-0000-0000-0000-000000000099:الشيخ عادل بركات] صرف مبيعات فاتورة INV-2026-0013'
    }
  ];

  for (const mov of missingSalesMovements) {
    const { data: existing } = await supabase
      .from('stock_movements')
      .select('id')
      .eq('reference_id', mov.reference_id)
      .maybeSingle();

    if (!existing) {
      const { error: insErr } = await supabase.from('stock_movements').insert([mov]);
      if (insErr) console.error(`Error inserting movement for ${mov.reference_number}:`, insErr);
      else console.log(`✅ Inserted stock movement for ${mov.reference_number}`);
    } else {
      console.log(`ℹ️ Movement for ${mov.reference_number} already exists`);
    }
  }

  // ----------------------------------------------------
  // 3. Recover Missing Purchase Invoice Items (#3, #4, #5, #6) & Their Stock Movements
  // ----------------------------------------------------
  console.log('\n3. Recovering missing purchase invoice items and inbound stock movements...');

  const recoveredPurchaseData = [
    {
      invoice_id: '5a601f6b-d209-4f3b-8f5b-124a3a628e85',
      invoice_number: 'PINV-2026-0003',
      date: '2026-01-01',
      supplier_id: '30b41ea2-b7f7-4a98-9dc8-4a604abbf31e',
      supplier_name: 'حسني اخوان',
      items: [
        {
          id: '8dd6f902-73d7-4878-8bf4-5784d2315403',
          purchase_invoice_id: '5a601f6b-d209-4f3b-8f5b-124a3a628e85',
          product_id: TAHINI_ID,
          product_name: 'طحينه 450 جم',
          warehouse_id: MAIN_WH_ID,
          quantity: 10,
          unit_cost: 50,
          discount_amount: 0,
          tax_rate: 14,
          tax_amount: 70,
          total: 570
        }
      ]
    },
    {
      invoice_id: '876053df-40e4-4920-a5d3-dd95f3b6b0f5',
      invoice_number: 'PINV-2026-0004',
      date: '2026-03-04',
      supplier_id: '62af0c40-da5d-4d84-a058-6bb42250c761',
      supplier_name: 'فورست فودز',
      items: [
        {
          id: '8dd6f902-73d7-4878-8bf4-5784d2315404',
          purchase_invoice_id: '876053df-40e4-4920-a5d3-dd95f3b6b0f5',
          product_id: HONEY_ID,
          product_name: 'عسل نحل 400 جم',
          warehouse_id: MAIN_WH_ID,
          quantity: 10,
          unit_cost: 100,
          discount_amount: 0,
          tax_rate: 14,
          tax_amount: 140,
          total: 1140
        }
      ]
    },
    {
      invoice_id: '2225b38a-b4a4-4cba-bfce-0ab3168dde4f',
      invoice_number: 'PINV-2026-0005',
      date: '2026-06-02',
      supplier_id: '30b41ea2-b7f7-4a98-9dc8-4a604abbf31e',
      supplier_name: 'حسني اخوان',
      items: [
        {
          id: '8dd6f902-73d7-4878-8bf4-5784d2315405',
          purchase_invoice_id: '2225b38a-b4a4-4cba-bfce-0ab3168dde4f',
          product_id: TAHINI_ID,
          product_name: 'طحينه 450 جم',
          warehouse_id: MAIN_WH_ID,
          quantity: 5,
          unit_cost: 50,
          discount_amount: 0,
          tax_rate: 14,
          tax_amount: 35,
          total: 285
        }
      ]
    },
    {
      invoice_id: '2bed9516-7bff-46b9-92b4-ec4dae6b056d',
      invoice_number: 'PINV-2026-0006',
      date: '2026-08-05',
      supplier_id: '62af0c40-da5d-4d84-a058-6bb42250c761',
      supplier_name: 'فورست فودز',
      items: [
        {
          id: '8dd6f902-73d7-4878-8bf4-5784d2315406',
          purchase_invoice_id: '2bed9516-7bff-46b9-92b4-ec4dae6b056d',
          product_id: HONEY_ID,
          product_name: 'عسل نحل 400 جم',
          warehouse_id: MAIN_WH_ID,
          quantity: 7,
          unit_cost: 100,
          discount_amount: 0,
          tax_rate: 14,
          tax_amount: 98,
          total: 798
        }
      ]
    }
  ];

  for (const pinvData of recoveredPurchaseData) {
    // Check if items exist
    const { data: existingItems } = await supabase
      .from('purchase_invoice_items')
      .select('id')
      .eq('purchase_invoice_id', pinvData.invoice_id);

    if (!existingItems || existingItems.length === 0) {
      const { error: insItemErr } = await supabase
        .from('purchase_invoice_items')
        .insert(pinvData.items);

      if (insItemErr) {
        console.error(`Error inserting items for ${pinvData.invoice_number}:`, insItemErr);
      } else {
        console.log(`✅ Recovered and inserted items for ${pinvData.invoice_number}`);
      }
    } else {
      console.log(`ℹ️ Items for ${pinvData.invoice_number} already exist`);
    }

    // Check if stock movement exists
    const { data: existingMov } = await supabase
      .from('stock_movements')
      .select('id')
      .eq('reference_id', pinvData.invoice_id);

    if (!existingMov || existingMov.length === 0) {
      for (const it of pinvData.items) {
        const mov = {
          id: `b0000000-0000-4000-8000-${it.id.slice(-12)}`,
          organization_id: DEFAULT_ORG_ID,
          product_id: it.product_id,
          warehouse_id: it.warehouse_id,
          movement_type: 'purchase_receipt',
          reference_id: pinvData.invoice_id,
          reference_number: pinvData.invoice_number,
          date: pinvData.date,
          quantity: it.quantity,
          unit_cost: it.unit_cost,
          total_cost: it.quantity * it.unit_cost,
          balance_quantity: 0,
          notes: `[PARTNER:supplier:${pinvData.supplier_id}:${pinvData.supplier_name}] توريد مشتريات فاتورة ${pinvData.invoice_number}`
        };

        const { error: insMovErr } = await supabase.from('stock_movements').insert([mov]);
        if (insMovErr) console.error(`Error inserting stock movement for ${pinvData.invoice_number}:`, insMovErr);
        else console.log(`✅ Inserted purchase stock movement for ${pinvData.invoice_number}`);
      }
    } else {
      console.log(`ℹ️ Purchase movement for ${pinvData.invoice_number} already exists`);
    }
  }

  // ----------------------------------------------------
  // 4. Recalculate and Synchronize True Physical Stock
  // ----------------------------------------------------
  console.log('\n4. Recalculating true physical warehouse stock from all movements...');

  const { data: allMovements, error: movErr } = await supabase
    .from('stock_movements')
    .select('product_id, warehouse_id, quantity');

  if (movErr) {
    console.error('Error fetching stock movements:', movErr);
    return;
  }

  const stockAgg = {};
  for (const m of allMovements) {
    const key = `${m.product_id}___${m.warehouse_id}`;
    stockAgg[key] = (stockAgg[key] || 0) + Number(m.quantity);
  }

  console.log('Stock totals per product & warehouse:');
  for (const [key, qty] of Object.entries(stockAgg)) {
    const [prodId, whId] = key.split('___');
    console.log(`   Product: ${prodId} | Warehouse: ${whId} => Quantity: ${qty}`);

    const { error: upsertErr } = await supabase
      .from('product_warehouse_stock')
      .upsert([{
        product_id: prodId,
        warehouse_id: whId,
        quantity: Math.max(0, qty),
        reserved_quantity: 0
      }], { onConflict: 'product_id,warehouse_id' });

    if (upsertErr) console.error(`Error updating warehouse stock for ${key}:`, upsertErr);
    else console.log(`   ✅ Synced product_warehouse_stock for ${key}`);
  }

  console.log('\n🎉 RECONCILIATION COMPLETED SUCCESSFULLY!');
}

runReconciliation();
