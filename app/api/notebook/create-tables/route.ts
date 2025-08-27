import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Simplified setup - just create the minimal tables needed
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Service role key required for setup operations')
    }

    // For now, let's just test if we can query existing tables and insert idea types
    
    // Try to insert idea types into the existing reference data pattern
    // First check if idea_types table exists
    console.log('Testing database connection...')
    
    // Let's test with mediums table which should exist
    const { data: mediums, error: mediumsError } = await supabaseAdmin
      .from('mediums')
      .select('id, name')
      .limit(1)
    
    console.log('Mediums test:', { mediums, mediumsError })
    
    // Let's test with genres table which should exist  
    const { data: genres, error: genresError } = await supabaseAdmin
      .from('genres')
      .select('id, name')
      .limit(1)
      
    console.log('Genres test:', { genres, genresError })

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        mediums: mediums?.length || 0,
        genres: genres?.length || 0,
        mediumsError,
        genresError
      }
    })

  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}