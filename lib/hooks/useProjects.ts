import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProjects(teamId: string | null): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchProjects = async () => {
    if (!teamId) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true)
      setError(null)

      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error('No user found')

      // First get team_projects for the specified team
      const { data: teamProjects, error: projectsError } = await supabase
        .from('team_projects')
        .select(`
          project_id,
          project:projects(
            id,
            name,
            description,
            created_at,
            updated_at
          )
        `)
        .eq('team_id', teamId)

      if (projectsError) throw projectsError

      // Extract and format the projects data
      const formattedProjects = teamProjects
        .map(tp => tp.project)
        .filter((project): project is Project => project !== null)

      setProjects(formattedProjects)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching projects:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [teamId])

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects
  }
}
