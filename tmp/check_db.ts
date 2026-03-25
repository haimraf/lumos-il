import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('--- Shop Items ---');
  const { data: shop } = await supabase.from('shop_items').select('id, name, is_available');
  console.log(JSON.stringify(shop, null, 2));

  console.log('--- Activity Events ---');
  const { data: events } = await supabase.from('activity_events').select('*').limit(5);
  console.log(JSON.stringify(events, null, 2));
}

checkData();
