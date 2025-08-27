'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Workspace = {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member'
}

type WorkspaceContextType = {
  status: 'loading' | 'authenticated' | 'unauthenticated'
  user: User | null
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  setActiveWorkspaceId: (id: string) => void
  refreshWorkspaces: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  status: 'loading',
  user: null,
  workspaces: [],
  activeWorkspaceId: null,
  setActiveWorkspaceId: () => {},
  refreshWorkspaces: async () => {},
})

export function useWorkspace() {
  return useContext(WorkspaceContext)
}

type WorkspaceProviderProps = {
  children: ReactNode
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null)

  const setActiveWorkspaceId = (id: string) => {
    setActiveWorkspaceIdState(id)
    if (typeof window !== 'undefined') {
      localStorage.setItem('fc.activeWorkspaceId', id)
    }
  }

  const refreshWorkspaces = async () => {
    if (!user) return

    const { data: workspaceMembers, error } = await supabase
      .from('workspace_members')
      .select(`
        workspace_id,
        role,
        workspaces:workspace_id (
          id,
          name
        )
      `)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching workspaces:', error)
      return
    }

    const workspaceList: Workspace[] = workspaceMembers
      .filter(member => member.workspaces)
      .map(member => ({
        id: member.workspace_id,
        name: (member.workspaces as any).name,
        role: member.role
      }))

    setWorkspaces(workspaceList)

    // Set active workspace if none set or current is invalid
    if (workspaceList.length > 0) {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('fc.activeWorkspaceId') : null
      const validStored = stored && workspaceList.some(w => w.id === stored)
      
      if (!activeWorkspaceId || !validStored) {
        const newActiveId = validStored ? stored : workspaceList[0].id
        setActiveWorkspaceIdState(newActiveId)
        if (typeof window !== 'undefined') {
          localStorage.setItem('fc.activeWorkspaceId', newActiveId)
        }
      }
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setStatus(session ? 'authenticated' : 'unauthenticated')
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setStatus(session ? 'authenticated' : 'unauthenticated')
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      refreshWorkspaces()
    } else {
      setWorkspaces([])
      setActiveWorkspaceIdState(null)
    }
  }, [user])

  return (
    <WorkspaceContext.Provider
      value={{
        status,
        user,
        workspaces,
        activeWorkspaceId,
        setActiveWorkspaceId,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}