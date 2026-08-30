const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("=== INSPECTING DB FOR ACCOUNTING & INVOICES ===");
  const { data: accs, error: aErr } = await supabase.from('accounts').select('id, code, name_ar, type').order('code');
  console.log("Accounts count:", accs ? accs.length : aErr);
  if (accs) {
    console.log("Sample accounts:", accs.slice(0, 10));
  }

  const { data: jes, error: jErr } = await supabase.from('journal_entries').select('id, entry_number, date, reference_type, reference_id, total_debit, total_credit, is_balanced');
  console.log("Journal Entries count:", jes ? jes.length : jErr);
  if (jes) {
    console.log("Sample JEs:", jes.slice(0, 10));
  }

  const { data: jls, error: jlErr } = await supabase.from('journal_lines').select('id, journal_entry_id, account_id, account_code, debit, credit');
  console.log("Journal Lines count:", jls ? jls.length : jlErr);
  if (jls) {
    console.log("Sample JLs:", jls.slice(0, 10));
  }

  const { data: sales, error: sErr } = await supabase.from('sales_invoices').select('id, invoice_number, subtotal, discount_total, tax_total, grand_total, notes');
  console.log("Sales Invoices count:", sales ? sales.length : sErr);
  if (sales) {
    console.log("Sample Sales Invoices:", sales.slice(0, 5));
  }

  const { data: sitems, error: siErr } = await supabase.from('sales_invoice_items').select('*');
  console.log("Sales Items count:", sitems ? sitems.length : siErr);
  if (sitems) {
    console.log("Sample Sales Items:", sitems.slice(0, 5));
  }
}

run();
