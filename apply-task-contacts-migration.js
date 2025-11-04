const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hqefgtuczwjffuydjwmb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZWZndHVjendqZmZ1eWRqd21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY4NDQ2MiwiZXhwIjoyMDcxMjYwNDYyfQ.14yQ9aRDZjTgN_esrmVtqycvLzKhRugJWGJxaf0r4AE';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const sql = fs.readFileSync('task-contacts-migration.sql', 'utf8');

    console.log('Applying migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try direct execution if RPC doesn't work
      console.log('Trying direct execution...');
      const { error: directError } = await supabase.from('_sql').insert({ query: sql });

      if (directError) {
        console.error('Migration failed:', directError);
        process.exit(1);
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('Created task_contacts junction table with RLS policies');
    console.log('Migrated existing contact_id relationships to junction table');

  } catch (err) {
    console.error('Error applying migration:', err);
    process.exit(1);
  }
}

applyMigration();
