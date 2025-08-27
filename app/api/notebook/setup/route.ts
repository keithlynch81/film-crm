import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Setup endpoint to create notebook tables
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Service role key required for setup operations')
    }

    // Test if tables exist by trying to query them
    const { data: existingEntries, error: checkError } = await supabaseAdmin
      .from('notebook_entries')
      .select('id')
      .limit(1)
    
    if (checkError && checkError.code === '42P01') {
      // Table doesn't exist - this is expected on first run
      console.log('Notebook tables need to be created manually in Supabase dashboard')
      return NextResponse.json({
        success: false,
        message: 'Notebook tables need to be created manually',
        instructions: 'Please run the notebook-migration.sql file in the Supabase SQL editor'
      })
    }

    // Create idea_types table
    const { error: ideaTypesError } = await supabaseAdmin.rpc('sql', {
      query: `
        CREATE TABLE IF NOT EXISTS idea_types (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(100) NOT NULL UNIQUE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })

    if (ideaTypesError) {
      console.error('Error creating idea_types table:', ideaTypesError)
    }

    // Insert standard idea types
    const { error: insertError } = await supabaseAdmin.rpc('sql', {
      query: `
        INSERT INTO idea_types (name) VALUES 
          ('Character'),
          ('Scene'), 
          ('Action Sequence'),
          ('Dialogue'),
          ('Location')
        ON CONFLICT (name) DO NOTHING;
      `
    })

    if (insertError) {
      console.error('Error inserting idea types:', insertError)
    }

    // Create junction tables
    const junctionTables = [
      {
        name: 'notebook_mediums',
        sql: `
          CREATE TABLE IF NOT EXISTS notebook_mediums (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            notebook_entry_id UUID REFERENCES notebook_entries(id) ON DELETE CASCADE,
            medium_id UUID REFERENCES mediums(id) ON DELETE CASCADE,
            UNIQUE(notebook_entry_id, medium_id)
          );
        `
      },
      {
        name: 'notebook_genres',
        sql: `
          CREATE TABLE IF NOT EXISTS notebook_genres (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            notebook_entry_id UUID REFERENCES notebook_entries(id) ON DELETE CASCADE,
            genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
            UNIQUE(notebook_entry_id, genre_id)
          );
        `
      },
      {
        name: 'notebook_idea_types',
        sql: `
          CREATE TABLE IF NOT EXISTS notebook_idea_types (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            notebook_entry_id UUID REFERENCES notebook_entries(id) ON DELETE CASCADE,
            idea_type_id UUID REFERENCES idea_types(id) ON DELETE CASCADE,
            UNIQUE(notebook_entry_id, idea_type_id)
          );
        `
      }
    ]

    for (const table of junctionTables) {
      const { error } = await supabaseAdmin.rpc('sql', { query: table.sql })
      if (error) {
        console.error(`Error creating ${table.name} table:`, error)
      }
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_notebook_entries_workspace_id ON notebook_entries(workspace_id);',
      'CREATE INDEX IF NOT EXISTS idx_notebook_entries_user_id ON notebook_entries(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_notebook_entries_tags ON notebook_entries USING gin(tags);',
      'CREATE INDEX IF NOT EXISTS idx_notebook_entries_created_at ON notebook_entries(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_notebook_mediums_entry_id ON notebook_mediums(notebook_entry_id);',
      'CREATE INDEX IF NOT EXISTS idx_notebook_genres_entry_id ON notebook_genres(notebook_entry_id);',
      'CREATE INDEX IF NOT EXISTS idx_notebook_idea_types_entry_id ON notebook_idea_types(notebook_entry_id);'
    ]

    for (const indexSql of indexes) {
      const { error } = await supabaseAdmin.rpc('sql', { query: indexSql })
      if (error) {
        console.error('Error creating index:', error)
      }
    }

    // Enable RLS
    const rlsCommands = [
      'ALTER TABLE notebook_entries ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE notebook_mediums ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE notebook_genres ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE notebook_idea_types ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE idea_types ENABLE ROW LEVEL SECURITY;'
    ]

    for (const rlsCommand of rlsCommands) {
      const { error } = await supabaseAdmin.rpc('sql', { query: rlsCommand })
      if (error) {
        console.error('Error enabling RLS:', error)
      }
    }

    // Create RLS policies
    const policies = [
      `CREATE POLICY "Users can view notebook entries in their workspaces" ON notebook_entries
        FOR SELECT USING (
          workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
          )
        );`,
      `CREATE POLICY "Users can insert notebook entries in their workspaces" ON notebook_entries
        FOR INSERT WITH CHECK (
          workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
          ) AND user_id = auth.uid()
        );`,
      `CREATE POLICY "Users can update their own notebook entries" ON notebook_entries
        FOR UPDATE USING (
          user_id = auth.uid() AND workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
          )
        );`,
      `CREATE POLICY "Users can delete their own notebook entries" ON notebook_entries
        FOR DELETE USING (
          user_id = auth.uid() AND workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
          )
        );`,
      `CREATE POLICY "Users can manage mediums for accessible notebook entries" ON notebook_mediums
        FOR ALL USING (
          notebook_entry_id IN (
            SELECT id FROM notebook_entries WHERE workspace_id IN (
              SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            )
          )
        );`,
      `CREATE POLICY "Users can manage genres for accessible notebook entries" ON notebook_genres
        FOR ALL USING (
          notebook_entry_id IN (
            SELECT id FROM notebook_entries WHERE workspace_id IN (
              SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            )
          )
        );`,
      `CREATE POLICY "Users can manage idea types for accessible notebook entries" ON notebook_idea_types
        FOR ALL USING (
          notebook_entry_id IN (
            SELECT id FROM notebook_entries WHERE workspace_id IN (
              SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            )
          )
        );`,
      `CREATE POLICY "Anyone can view idea types" ON idea_types
        FOR SELECT TO authenticated USING (true);`
    ]

    let policyErrors = []
    for (const policy of policies) {
      const { error } = await supabaseAdmin.rpc('sql', { query: policy })
      if (error && !error.message?.includes('already exists')) {
        console.error('Error creating policy:', error)
        policyErrors.push(error.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Notebook tables created successfully',
      warnings: policyErrors.length > 0 ? policyErrors : null
    })

  } catch (error) {
    console.error('Notebook setup error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to setup notebook tables',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}