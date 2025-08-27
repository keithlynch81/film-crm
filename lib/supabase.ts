import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service role client for admin operations (bypasses RLS)
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      workspace_members: {
        Row: {
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
        }
        Insert: {
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
        }
        Update: {
          workspace_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
        }
      }
      workspace_invites: {
        Row: {
          id: string
          workspace_id: string
          email: string
          role: 'owner' | 'admin' | 'member'
          status: 'pending' | 'accepted' | 'revoked'
          invited_by: string
          created_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          email: string
          role: 'owner' | 'admin' | 'member'
          status?: 'pending' | 'accepted' | 'revoked'
          invited_by: string
          created_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          email?: string
          role?: 'owner' | 'admin' | 'member'
          status?: 'pending' | 'accepted' | 'revoked'
          invited_by?: string
          created_at?: string
          accepted_at?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          workspace_id: string
          title: string
          logline: string | null
          status: string | null
          stage: string | null
          notes: string | null
          tags: string[] | null
          roles: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          title: string
          logline?: string | null
          status?: string | null
          stage?: string | null
          notes?: string | null
          tags?: string[] | null
          roles?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          title?: string
          logline?: string | null
          status?: string | null
          stage?: string | null
          notes?: string | null
          tags?: string[] | null
          roles?: string[] | null
          created_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          workspace_id: string
          first_name: string
          last_name: string | null
          email: string | null
          role: string | null
          company_id: string | null
          remit_notes: string | null
          taste_notes: string | null
          additional_notes: string | null
          tags: string[] | null
        }
        Insert: {
          id?: string
          workspace_id: string
          first_name: string
          last_name?: string | null
          email?: string | null
          role?: string | null
          company_id?: string | null
          remit_notes?: string | null
          taste_notes?: string | null
          additional_notes?: string | null
          tags?: string[] | null
        }
        Update: {
          id?: string
          workspace_id?: string
          first_name?: string
          last_name?: string | null
          email?: string | null
          role?: string | null
          company_id?: string | null
          remit_notes?: string | null
          taste_notes?: string | null
          additional_notes?: string | null
          tags?: string[] | null
        }
      }
      companies: {
        Row: {
          id: string
          workspace_id: string
          name: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
        }
      }
      submissions: {
        Row: {
          id: string
          workspace_id: string
          project_id: string
          contact_id: string
          status: string | null
          submitted_at: string
          notes: string | null
          feedback: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id: string
          contact_id: string
          status?: string | null
          submitted_at?: string
          notes?: string | null
          feedback?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string
          contact_id?: string
          status?: string | null
          submitted_at?: string
          notes?: string | null
          feedback?: string | null
        }
      }
      meetings: {
        Row: {
          id: string
          workspace_id: string
          contact_id: string
          company_id: string | null
          meeting_type: string | null
          scheduled_at: string | null
          follow_up_due: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          contact_id: string
          company_id?: string | null
          meeting_type?: string | null
          scheduled_at?: string | null
          follow_up_due?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          contact_id?: string
          company_id?: string | null
          meeting_type?: string | null
          scheduled_at?: string | null
          follow_up_due?: string | null
          notes?: string | null
        }
      }
      mediums: {
        Row: {
          id: number
          name: string
        }
      }
      genres: {
        Row: {
          id: number
          name: string
        }
      }
      budget_ranges: {
        Row: {
          id: number
          label: string
          unit: string
          min_value: number | null
          max_value: number | null
        }
      }
    }
    Functions: {
      accept_workspace_invite: {
        Args: { invite_id: string }
        Returns: { success: boolean; error?: string; workspace_id?: string }
      }
    }
  }
}