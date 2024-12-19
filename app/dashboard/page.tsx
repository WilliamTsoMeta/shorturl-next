'use client';

import { useState, useEffect } from 'react';
import { useTeams } from '@/lib/hooks/useTeams';
import { useProjects } from '@/lib/hooks/useProjects';
import { Header } from '@/components/Header';
import Dashboard from '@/components/Dashboard';
import { createClient } from '@/lib/supabase';
import { subDays } from 'date-fns';
import { toast } from 'react-hot-toast';

interface EventData {
  events: Array<{
    resource: {
      attributes: {
        title: string;
        shortUrl: string;
        originalUrl: string;
        click_count: number;
      };
    };
    url: string;
    event: string;
    timestamp: string;
    properties: string;
  }>;
  statistics: {
    total_clicks: number;
    device: Record<string, { clicks: number }>;
    browser: Record<string, { clicks: number }>;
    os: Record<string, { clicks: number }>;
    referrer: Record<string, { clicks: number }>;
    hourly_clicks: Array<{ hour: string; clicks: number }>;
    daily_clicks: Array<{ date: string; clicks: number }>;
    monthly_clicks: Array<{ month: string; clicks: number }>;
  };
}

export default function DashboardPage() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const { teams, loading: teamsLoading } = useTeams();
  const { projects, loading: projectsLoading } = useProjects(selectedTeam);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<EventData | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token found');
      }

      const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/statistics/batch-events`;
      
      // Prepare request body
      const requestBody: any = {};
      if (selectedTeam) {
        requestBody.teamId = selectedTeam;
      }
      if (selectedProject) {
        requestBody.projectId = selectedProject;
      }

      // Default to last 7 days
      const endDate = new Date();
      const startDate = subDays(endDate, 7);
      requestBody.startDate = startDate.toISOString();
      requestBody.endDate = endDate.toISOString();

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when page loads
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch data when team or project changes
  useEffect(() => {
    fetchDashboardData();
  }, [selectedTeam, selectedProject]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Team Selection */}
            <select
              className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
              value={selectedTeam || ''}
              onChange={(e) => {
                setSelectedTeam(e.target.value || null);
                setSelectedProject(null);
              }}
              disabled={teamsLoading}
            >
              <option value="">选择团队</option>
              {teams?.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>

            {/* Project Selection */}
            <select
              className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value || null)}
              disabled={!selectedTeam || projectsLoading}
            >
              <option value="">选择项目</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          {/* Dashboard Component */}
          {dashboardData && dashboardData.statistics && (
            <Dashboard
              teamId={selectedTeam}
              projectId={selectedProject}
              data={dashboardData}
              isLoading={loading}
            />
          )}
        </div>
      </main>
    </div>
  );
}