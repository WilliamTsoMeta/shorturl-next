'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase';

interface TeamProject {
  id: string;
  name: string;
  description: string;
  attributes: {
    type: string;
    status: string;
    created_by: string;
    short_name: string;
  };
  created_at: string;
  updated_at: string;
  deleted_at: null;
  schema_version: null;
  creator_id: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  attributes: {
    type: string;
    created_by: string;
  };
  created_at: string;
  updated_at: string;
  deleted_at: null;
  schema_version: null;
  avatar_url: null;
  team_projects: Array<{
    team_id: string;
    project_id: string;
    assigned_at: string;
    project: TeamProject;
  }>;
}

interface TeamContextType {
  team: Team | null;
  project: TeamProject | null;
  loading: boolean;
  error: Error | null;
  fetchDefaultTeam: () => Promise<void>;
}

const defaultContextValue: TeamContextType = {
  team: null,
  project: null,
  loading: false,
  error: null,
  fetchDefaultTeam: async () => {}
};

const TeamContext = createContext<TeamContextType>(defaultContextValue);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [project, setProject] = useState<TeamProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDefaultTeam = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No access token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/create-default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch default team');
      }
      const data = await response.json();
      setTeam(data.team);
      setProject(data.project);
      console.log('defaut team prj',data )
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching team:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefaultTeam();
  }, []);

  const value = {
    team,
    project,
    loading,
    error,
    fetchDefaultTeam
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
