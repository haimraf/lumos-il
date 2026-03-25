const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('--- Checking Site Settings ---');
  const { data: settings, error: settingsError } = await supabase.from('site_settings').select('*');
  if (settingsError) {
    console.log(`site_settings table error: ${settingsError.message}`);
  } else {
    console.log('site_settings content:');
    console.log(JSON.stringify(settings, null, 2));
  }

  console.log('--- Inspecting Shop Items ---');
  const { data: shop } = await supabase.from('shop_items').select('*');
  console.log(JSON.stringify(shop, null, 2).slice(0, 500) + '...');
}

inspect();
