
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspect() {
  const { data: countData, error: countError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });
  
  if (countError) {
    console.error('Error counting profiles:', countError);
    return;
  }
  
  console.log('Total profiles:', countData);

  const { data: houses, error: houseError } = await supabase
    .from('profiles')
    .select('house, points_contributed')
    .limit(10);

  if (houseError) {
    console.error('Error fetching profiles:', houseError);
    return;
  }
  
  console.log('Sample profiles:', houses);
}

inspect();
