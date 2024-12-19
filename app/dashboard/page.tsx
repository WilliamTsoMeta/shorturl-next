'use client';

import { useState, useEffect } from 'react';
import { useTeams } from '@/lib/hooks/useTeams';
import { useProjects } from '@/lib/hooks/useProjects';
import { Header } from '@/components/Header';
import Dashboard from '@/components/Dashboard';
import { createClient } from '@/lib/supabase';
import { subDays } from 'date-fns';
import { toast } from 'react-hot-toast';
import Selectors from '@/components/Selectors';

const timeRanges = [
  { label: 'Last 24 hours', value: 'last_24_hours' },
  { label: 'Last 7 days', value: 'last_7_days' },
  { label: 'Last 30 days', value: 'last_30_days' },
  { label: 'Custom', value: 'custom' },
];

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
  const [selectedRange, setSelectedRange] = useState(timeRanges[1]); // Default to last 7 days
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<EventData | null>(null);

  const { teams, loading: teamsLoading } = useTeams();
  const { projects, loading: projectsLoading } = useProjects(selectedTeam);

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

      // Set date range based on selection
      let startDate: Date;
      let endDate = new Date();

      if (selectedRange.value === 'custom' && customDateRange[0] && customDateRange[1]) {
        startDate = customDateRange[0];
        endDate = customDateRange[1];
      } else {
        switch (selectedRange.value) {
          case 'last_24_hours':
            startDate = subDays(endDate, 1);
            break;
          case 'last_30_days':
            startDate = subDays(endDate, 30);
            break;
          case 'last_7_days':
          default:
            startDate = subDays(endDate, 7);
            break;
        }
      }

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

  // Fetch data when team, project, or date range changes
  useEffect(() => {
    fetchDashboardData();
  }, [selectedTeam, selectedProject, selectedRange, customDateRange]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4">
          <Selectors
            selectedTeam={selectedTeam}
            selectedProject={selectedProject}
            onTeamChange={setSelectedTeam}
            onProjectChange={setSelectedProject}
            onTimeRangeChange={setSelectedRange}
            selectedTimeRange={selectedRange}
            onDateRangeChange={(start, end) => setCustomDateRange([start, end])}
            showDateRange={true}
          />

          {/* Dashboard Component */}
          {dashboardData && dashboardData.statistics && (
            <Dashboard
              teamId={selectedTeam}
              projectId={selectedProject}
              data={dashboardData}
              isLoading={loading}
              selectedRange={selectedRange}
              customDateRange={customDateRange}
            />
          )}
        </div>
      </main>
    </div>
  );
}