const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8').split('\n').forEach(l => {
  const trimmed = l.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [k, ...v] = trimmed.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: receipts, error: rErr } = await supabase.from('cash_receipts').select('*').ilike('receipt_number', '%056598%');
  console.log('RECEIPTS:', JSON.stringify(receipts, null, 2));

  const { data: allReceipts } = await supabase.from('cash_receipts').select('id, receipt_number, amount, treasury_account_id, date');
  console.log('ALL RECEIPTS COUNT:', allReceipts ? allReceipts.length : 0);
  if (allReceipts) {
    allReceipts.forEach(r => console.log(`RCP: ${r.receipt_number} | Amount: ${r.amount} | TreasuryId: ${r.treasury_account_id} | Date: ${r.date}`));
  }

  const { data: treasuries } = await supabase.from('treasury_accounts').select('*');
  console.log('TREASURIES:', JSON.stringify(treasuries, null, 2));

  const { data: jes } = await supabase.from('journal_entries').select('*, journal_lines(*)').ilike('entry_number', '%056598%');
  console.log('MATCHING JES BY ENTRY NUMBER:', JSON.stringify(jes, null, 2));

  const { data: allJes } = await supabase.from('journal_entries').select('id, entry_number, date, total_debit, reference_type, reference_id, journal_lines(id, account_id, account_code, account_name, debit, credit)');
  console.log('ALL JES COUNT:', allJes ? allJes.length : 0);
  if (allJes) {
    allJes.filter(j => j.reference_type === 'cash_receipt' || j.entry_number.includes('RCP')).forEach(j => {
      console.log(`JE: ${j.entry_number} | RefId: ${j.reference_id} | Debit: ${j.total_debit}`);
      j.journal_lines.forEach(l => {
        console.log(`   Line: ${l.account_code} - ${l.account_name} | Dr: ${l.debit} | Cr: ${l.credit}`);
      });
    });
  }
}

main().catch(console.error);
