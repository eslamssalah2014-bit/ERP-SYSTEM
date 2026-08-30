const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function clean() {
  await supabase.from('journal_lines').delete().eq('journal_entry_id', '657a6e01-f2e7-4491-80bf-c00540a4975c');
  await supabase.from('journal_entries').delete().eq('id', '657a6e01-f2e7-4491-80bf-c00540a4975c');
  console.log('Cleaned test JE successfully');
}
clean();
