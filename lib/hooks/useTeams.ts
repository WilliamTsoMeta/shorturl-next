import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export interface Team {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface TeamMembership {
  team_id: string;
  user_id: string;
  role: string;
  team: Team;
}

interface UseTeamsReturn {
  teams: Team[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTeams(): UseTeamsReturn {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchTeams = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error('No user found')

      const { data: memberships, error: teamsError } = await supabase
        .from('team_membership')
        .select(`
          team_id,
          user_id,
          role,
          team:teams(*)
        `)
        .eq('user_id', user.id)

      if (teamsError) throw teamsError

      // Extract teams from memberships
      const userTeams = memberships.map(membership => membership.team)
      setTeams(userTeams)
      setError(null)
    } catch (err) {
      console.error('Error fetching teams:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch teams')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  return {
    teams,
    loading,
    error,
    refetch: fetchTeams
  }
}
