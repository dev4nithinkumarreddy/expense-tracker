import { supabase } from './src/lib/supabase.ts';

async function test() {
  const { data, error } = await supabase.from('expenses').insert({
    user_id: '00000000-0000-0000-0000-000000000000',
    amount: 1,
    description: 'test',
    category: 'test',
    date: new Date().toISOString(),
    recurrence: 'none',
    next_occurrence: null
  });
  console.log("Error:", error);
}

test();
